import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getDocumentById, incrementViewCount } from '@/lib/documents';
import { updateDocumentSchema, validateBody } from '@/lib/validations';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const docId = parseInt(id);
    if (isNaN(docId)) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
    }

    const doc = await getDocumentById(docId);
    if (!doc) {
      return NextResponse.json({ error: 'Tài liệu không tồn tại' }, { status: 404 });
    }

    // Increment view count
    await incrementViewCount(docId);

    return NextResponse.json(doc);
  } catch (error: unknown) {
    console.error('Error fetching document:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    const { id } = await params;
    const docId = parseInt(id);
    if (isNaN(docId)) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
    }

    // Check ownership
    const doc = await getDocumentById(docId);
    if (!doc) {
      return NextResponse.json({ error: 'Tài liệu không tồn tại' }, { status: 404 });
    }
    if (doc.author_id !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Bạn không có quyền chỉnh sửa tài liệu này' }, { status: 403 });
    }

    const body = await req.json();
    const validation = await validateBody(updateDocumentSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const data = validation.data;

    // Update document with expanded fields
    await query(
      `UPDATE documents SET 
        title=?, course_code=?, academic_year=?, semester=?, doc_type=?, resource_type=?,
        description=?, sharer_name=?, major=?,
        version=?, language=?, framework=?, license=?, os_support=?, architecture=?,
        maintainer=?, homepage=?, repository_url=?, documentation_url=?, demo_url=?,
        checksum_sha256=?, release_date=?, updated_at=NOW() 
      WHERE id=?`,
      [
        data.title,
        data.course_code || null,
        data.academic_year || null,
        data.semester || null,
        data.doc_type,
        data.resource_type || 'upload_file',
        data.description || null,
        data.sharer_name || null,
        data.major || 'Công nghệ Thông tin',
        data.version || null,
        data.language || null,
        data.framework || null,
        data.license || null,
        data.os_support || null,
        data.architecture || null,
        data.maintainer || null,
        data.homepage || null,
        data.repository_url || null,
        data.documentation_url || null,
        data.demo_url || null,
        data.checksum_sha256 || null,
        data.release_date || null,
        docId,
      ]
    );

    // Replace tags
    await query('DELETE FROM document_tags WHERE document_id = ?', [docId]);
    if (data.tags && data.tags.length > 0) {
      for (const tag of data.tags) {
        if (tag.trim()) {
          await query('INSERT INTO document_tags (document_id, tag) VALUES (?, ?)', [docId, tag.trim().toLowerCase()]);
        }
      }
    }

    // Replace images
    await query('DELETE FROM document_images WHERE document_id = ?', [docId]);
    if (data.images && data.images.length > 0) {
      for (let i = 0; i < data.images.length; i++) {
        const img = data.images[i];
        await query(
          'INSERT INTO document_images (document_id, image_url, sort_order) VALUES (?, ?, ?)',
          [docId, img.image_url, img.sort_order ?? i]
        );
      }
    }

    // Replace files
    await query('DELETE FROM document_files WHERE document_id = ?', [docId]);
    if (data.files && data.files.length > 0) {
      for (const file of data.files) {
        await query(
          'INSERT INTO document_files (document_id, file_name, file_url, file_size, file_type) VALUES (?, ?, ?, ?, ?)',
          [docId, file.file_name, file.file_url, file.file_size || 0, file.file_type]
        );
      }
    }

    // Replace links
    await query('DELETE FROM document_links WHERE document_id = ?', [docId]);
    if (data.links && data.links.length > 0) {
      const { detectProvider } = require('@/lib/provider-utils');
      for (const link of data.links) {
        const provider = link.provider || detectProvider(link.url);
        await query(
          'INSERT INTO document_links (document_id, url, provider, link_type, label) VALUES (?, ?, ?, ?, ?)',
          [docId, link.url, provider, link.link_type || 'primary', link.label || null]
        );
      }
    }

    revalidatePath('/documents');
    revalidatePath(`/documents/${doc.slug}`);

    return NextResponse.json({ success: true, message: 'Đã cập nhật tài liệu!' });
  } catch (error: unknown) {
    console.error('Error updating document:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    const { id } = await params;
    const docId = parseInt(id);
    if (isNaN(docId)) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
    }

    const doc = await getDocumentById(docId);
    if (!doc) {
      return NextResponse.json({ error: 'Tài liệu không tồn tại' }, { status: 404 });
    }
    if (doc.author_id !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Bạn không có quyền xóa tài liệu này' }, { status: 403 });
    }

    // CASCADE will handle tags, images, files
    await query('DELETE FROM documents WHERE id = ?', [docId]);

    revalidatePath('/documents');
    revalidatePath('/admin/documents');

    return NextResponse.json({ success: true, message: 'Đã xóa tài liệu!' });
  } catch (error: unknown) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}
