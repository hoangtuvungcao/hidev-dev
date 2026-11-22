import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getDocumentsFeed } from '@/lib/documents';
import { createDocumentSchema, validateBody } from '@/lib/validations';
import { detectProvider } from '@/lib/provider-utils';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const options = {
      search: sp.get('search') || undefined,
      doc_type: sp.get('doc_type') || undefined,
      resource_type: sp.get('resource_type') || undefined,
      semester: sp.get('semester') || undefined,
      academic_year: sp.get('academic_year') || undefined,
      course_code: sp.get('course_code') || undefined,
      tag: sp.get('tag') || undefined,
      major: sp.get('major') || undefined,
      page: parseInt(sp.get('page') || '1'),
      limit: Math.min(parseInt(sp.get('limit') || '20'), 100),
    };

    const result = await getDocumentsFeed(options);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error fetching documents:', error);
    const err = error as { code?: string };
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return NextResponse.json({ documents: [], total: 0 });
    }
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Bạn cần đăng nhập để đăng tài liệu' }, { status: 401 });
    }

    const body = await req.json();
    const validation = await validateBody(createDocumentSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const data = validation.data;

    // Generate slug
    let slug = data.title
      .toLowerCase().trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s-]+/g, '-');

    const checkSlug = await query('SELECT id FROM documents WHERE slug = ?', [slug]);
    if (Array.isArray(checkSlug) && checkSlug.length > 0) {
      slug = `${slug}-${Date.now().toString().slice(-6)}`;
    }

    // Insert document with expanded fields
    const result = await query(
      `INSERT INTO documents (
        title, slug, course_code, academic_year, semester, doc_type, resource_type,
        description, sharer_name, author_id, major, status,
        version, language, framework, license, os_support, architecture,
        maintainer, homepage, official_website, repository_url, issues_url,
        documentation_url, demo_url, checksum_sha256, checksum_md5,
        total_file_size, release_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.title, slug,
        data.course_code || null,
        data.academic_year || null,
        data.semester || null,
        data.doc_type,
        data.resource_type || 'upload_file',
        data.description || null,
        data.sharer_name || null,
        user.id,
        data.major || 'Công nghệ Thông tin',
        user.role === 'admin' ? 'approved' : 'pending',
        data.version || null,
        data.language || null,
        data.framework || null,
        data.license || null,
        data.os_support || null,
        data.architecture || null,
        data.maintainer || null,
        data.homepage || null,
        data.official_website || null,
        data.repository_url || null,
        data.issues_url || null,
        data.documentation_url || null,
        data.demo_url || null,
        data.checksum_sha256 || null,
        data.checksum_md5 || null,
        data.total_file_size || 0,
        data.release_date || null,
      ]
    ) as { insertId: number };

    const docId = result.insertId;

    // Insert tags
    if (data.tags && data.tags.length > 0) {
      const tagValues = data.tags.map((tag: string) => [docId, tag.trim().toLowerCase()]);
      for (const [dId, tag] of tagValues) {
        if (tag) await query('INSERT INTO document_tags (document_id, tag) VALUES (?, ?)', [dId, tag]);
      }
    }

    // Insert images
    if (data.images && data.images.length > 0) {
      for (let i = 0; i < data.images.length; i++) {
        const img = data.images[i];
        await query(
          'INSERT INTO document_images (document_id, image_url, sort_order) VALUES (?, ?, ?)',
          [docId, img.image_url, img.sort_order ?? i]
        );
      }
    }

    // Insert files
    if (data.files && data.files.length > 0) {
      for (const file of data.files) {
        await query(
          'INSERT INTO document_files (document_id, file_name, file_url, file_size, file_type) VALUES (?, ?, ?, ?, ?)',
          [docId, file.file_name, file.file_url, file.file_size || 0, file.file_type]
        );
      }
    }

    // Insert links with auto-detected provider
    if (data.links && data.links.length > 0) {
      for (const link of data.links) {
        const provider = link.provider || detectProvider(link.url);
        await query(
          'INSERT INTO document_links (document_id, url, provider, link_type, label) VALUES (?, ?, ?, ?, ?)',
          [docId, link.url, provider, link.link_type || 'primary', link.label || null]
        );
      }
    }

    // Insert document categories
    if (data.doc_categories && data.doc_categories.length > 0) {
      for (const cat of data.doc_categories) {
        if (cat.trim()) {
          await query(
            'INSERT INTO document_categories (document_id, category_name) VALUES (?, ?)',
            [docId, cat.trim()]
          ).catch(() => { /* ignore duplicates */ });
        }
      }
    }

    revalidatePath('/documents');
    revalidatePath('/admin');
    revalidatePath('/admin/documents');

    return NextResponse.json({
      success: true,
      message: user.role === 'admin' ? 'Đã đăng tài liệu thành công!' : 'Đã gửi tài liệu. Vui lòng chờ kiểm duyệt!',
      slug,
      id: docId,
    });
  } catch (error: unknown) {
    console.error('Error creating document:', error);
    return NextResponse.json({ error: 'Có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' }, { status: 500 });
  }
}
