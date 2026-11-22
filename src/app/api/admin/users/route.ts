import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;
    const search = sp.get('search') || '';
    const role = sp.get('role') || '';
    const status = sp.get('status') || ''; // 'active' | 'banned' | 'verified'
    const page = parseInt(sp.get('page') || '1');
    const limit = Math.min(parseInt(sp.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;

    let sql = `SELECT id, username, email, role, avatar_url, bio, website, github, 
               is_verified, is_banned, ban_reason, last_login_at, created_at 
               FROM users`;
    let countSql = `SELECT COUNT(*) AS total FROM users`;
    
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    const countParams: (string | number)[] = [];

    if (search) {
      conditions.push('(username LIKE ? OR email LIKE ?)');
      const likeParam = `%${search}%`;
      params.push(likeParam, likeParam);
      countParams.push(likeParam, likeParam);
    }

    if (role) {
      conditions.push('role = ?');
      params.push(role);
      countParams.push(role);
    }

    if (status === 'banned') {
      conditions.push('is_banned = 1');
    } else if (status === 'verified') {
      conditions.push('is_verified = 1');
    } else if (status === 'active') {
      conditions.push('is_banned = 0');
    }

    if (conditions.length > 0) {
      const where = ' WHERE ' + conditions.join(' AND ');
      sql += where;
      countSql += where;
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [users, countResult] = await Promise.all([
      query(sql, params),
      query<{ total: number }[]>(countSql, countParams),
    ]);

    const total = (countResult as any[])[0]?.total || 0;

    return NextResponse.json({ users, total });
  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { id, action, value } = body;

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
    }

    // Prevent self-modification
    if (id === user.id && (action === 'ban' || action === 'role')) {
      return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 400 });
    }

    switch (action) {
      case 'role':
        if (!['user', 'admin', 'moderator', 'editor', 'author'].includes(value)) {
          return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }
        await query('UPDATE users SET role = ? WHERE id = ?', [value, id]);
        break;

      case 'ban':
        await query('UPDATE users SET is_banned = 1, ban_reason = ? WHERE id = ?', [value || 'Banned by admin', id]);
        break;

      case 'unban':
        await query('UPDATE users SET is_banned = 0, ban_reason = NULL WHERE id = ?', [id]);
        break;

      case 'verify':
        await query('UPDATE users SET is_verified = ? WHERE id = ?', [value ? 1 : 0, id]);
        break;

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin users PATCH error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
