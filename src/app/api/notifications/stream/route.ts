import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

// SSE must never be statically optimized or cached.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const lastIdParam = searchParams.get('lastId');
  let lastNotificationId = lastIdParam ? parseInt(lastIdParam, 10) : 0;

  if (isNaN(lastNotificationId)) {
    lastNotificationId = 0;
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const timers: {
        interval?: ReturnType<typeof setInterval>;
        heartbeat?: ReturnType<typeof setInterval>;
      } = {};

      const safeEnqueue = (chunk: string): boolean => {
        if (closed) return false;
        try {
          controller.enqueue(encoder.encode(chunk));
          return true;
        } catch {
          // Controller already closed by the client disconnecting.
          cleanup();
          return false;
        }
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (timers.interval) clearInterval(timers.interval);
        if (timers.heartbeat) clearInterval(timers.heartbeat);
        try {
          controller.close();
        } catch {
          // Already closed — ignore.
        }
      };

      // Tell the browser how long to wait before reconnecting, and open the
      // stream immediately so EventSource fires `onopen` right away.
      safeEnqueue('retry: 5000\n\n');
      safeEnqueue(': connected\n\n');

      // If no lastId was provided, only stream notifications created from now on.
      if (lastNotificationId === 0) {
        try {
          const maxRows = await query('SELECT MAX(id) AS max_id FROM notifications WHERE user_id = ?', [user.id]);
          lastNotificationId = (maxRows as any)[0]?.max_id || 0;
        } catch (err) {
          console.error('Error fetching max notification ID:', err);
        }
      }

      const checkNotifications = async () => {
        if (closed) return;
        try {
          const notifications = await query(
            `SELECT id, type, title, message, link, is_read, created_at
             FROM notifications
             WHERE user_id = ? AND id > ?
             ORDER BY created_at DESC
             LIMIT 10`,
            [user.id, lastNotificationId]
          );

          if (Array.isArray(notifications) && notifications.length > 0) {
            const formatted = notifications.map((n: any) => ({
              ...n,
              is_read: n.is_read === 1 || n.is_read === true || n.is_read === '1',
            }));

            lastNotificationId = Math.max(...formatted.map((n: any) => n.id));
            safeEnqueue(`data: ${JSON.stringify(formatted)}\n\n`);
          }
        } catch (error) {
          console.error('Error checking notifications:', error);
        }
      };

      // Initial check for anything that arrived between page load and connect.
      await checkNotifications();

      // Poll for new notifications every 5s.
      timers.interval = setInterval(checkNotifications, 5000);

      // Heartbeat comment every 20s keeps the connection alive through
      // Cloudflare / nginx idle timeouts (comments are ignored by EventSource).
      timers.heartbeat = setInterval(() => safeEnqueue(': ping\n\n'), 20000);

      // Clean up when the client disconnects.
      req.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      // Disable proxy buffering (nginx / some CDN configs) so events flush immediately.
      'X-Accel-Buffering': 'no',
    },
  });
}
