import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/leetcode
// - If no query parameter: returns all solved problem slugs for the current user
// - If slug query parameter: returns solved status, drafts, and submissions for that problem
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ solvedSlugs: [] });
    }

    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    // 1. Fetch solved slugs anyway to keep frontend synced
    const solvedRows = await query<{ problem_slug: string }[]>(
      'SELECT problem_slug FROM leetcode_solved WHERE user_id = ?',
      [currentUser.id]
    );
    const solvedSlugs = solvedRows.map(r => r.problem_slug);

    if (!slug) {
      return NextResponse.json({ solvedSlugs });
    }

    // 2. Fetch drafts for this problem
    const drafts = await query<{ lang: string; code: string }[]>(
      'SELECT lang, code FROM leetcode_code_drafts WHERE user_id = ? AND problem_slug = ?',
      [currentUser.id, slug]
    );

    // 3. Fetch submission history for this problem
    const submissions = await query<any[]>(
      'SELECT id, lang, status, execution_time_ms as executionTimeMs, code, DATE_FORMAT(submitted_at, "%H:%i:%s") as timestamp FROM leetcode_submissions WHERE user_id = ? AND problem_slug = ? ORDER BY submitted_at DESC LIMIT 20',
      [currentUser.id, slug]
    );

    return NextResponse.json({
      solvedSlugs,
      drafts,
      submissions
    });
  } catch (error) {
    console.error('[LEETCODE_API_GET_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/leetcode
// Actions:
// - save_draft: { action: 'save_draft', slug: string, lang: string, code: string }
// - record_submission: { action: 'record_submission', slug: string, lang: string, status: string, executionTimeMs?: number }
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'save_draft') {
      const { slug, lang, code } = body;
      if (!slug || !lang || code === undefined) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
      }

      await query(
        `INSERT INTO leetcode_code_drafts (user_id, problem_slug, lang, code) 
         VALUES (?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE code = VALUES(code)`,
        [currentUser.id, slug, lang, code]
      );

      return NextResponse.json({ success: true });
    }

    if (action === 'record_submission') {
      const { slug, lang, status, executionTimeMs, code } = body;
      if (!slug || !lang || !status) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
      }

      // Record submission
      await query(
        `INSERT INTO leetcode_submissions (user_id, problem_slug, lang, status, execution_time_ms, code) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [currentUser.id, slug, lang, status, executionTimeMs || null, code || null]
      );

      // If Accepted, record in solved table
      if (status === 'Accepted') {
        await query(
          `INSERT IGNORE INTO leetcode_solved (user_id, problem_slug) VALUES (?, ?)`,
          [currentUser.id, slug]
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[LEETCODE_API_POST_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
