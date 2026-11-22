import { NextRequest, NextResponse } from 'next/server';
import { incrementDownloadCount } from '@/lib/documents';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const docId = parseInt(id);
    if (isNaN(docId)) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
    }

    await incrementDownloadCount(docId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error tracking download:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra' }, { status: 500 });
  }
}
