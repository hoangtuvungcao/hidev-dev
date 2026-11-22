import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const rows = await query('SELECT key_name, value FROM settings');
    const settingsObj: Record<string, string> = {};
    if (Array.isArray(rows)) {
      for (const row of rows as any[]) {
        settingsObj[row.key_name] = row.value || '';
      }
    }
    return NextResponse.json(settingsObj);
  } catch (error: any) {
    console.error('Public get settings error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
