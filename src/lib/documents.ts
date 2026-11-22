import { query } from './db';
import { DocumentRecord, DocumentImage, DocumentFile, DocumentLink } from '../types';

export interface DocumentFeedOptions {
  userId?: number | null;
  search?: string;
  doc_type?: string;
  resource_type?: string;
  semester?: string;
  academic_year?: string;
  course_code?: string;
  tag?: string;
  major?: string;
  status?: string;
  page?: number;
  limit?: number;
  authorId?: number;
}

/**
 * Fetch documents feed with filters, search, and pagination.
 */
export async function getDocumentsFeed(options: DocumentFeedOptions = {}): Promise<{ documents: DocumentRecord[]; total: number }> {
  const {
    search, doc_type, resource_type, semester, academic_year, course_code, tag, major,
    status = 'approved', page = 1, limit = 20, authorId,
  } = options;

  let sql = `
    SELECT 
      d.id, d.title, d.slug, d.course_code, d.academic_year, d.semester,
      d.doc_type, d.resource_type, d.description, d.sharer_name, d.author_id, d.major,
      d.status, d.view_count, d.download_count, d.created_at, d.updated_at,
      d.version, d.language, d.framework, d.license, d.os_support,
      d.architecture, d.maintainer, d.homepage, d.official_website,
      d.repository_url, d.issues_url, d.documentation_url, d.demo_url,
      d.checksum_sha256, d.checksum_md5, d.total_file_size, d.release_date,
      u.username, u.avatar_url AS author_avatar
    FROM documents d
    JOIN users u ON d.author_id = u.id
  `;

  let countSql = `SELECT COUNT(DISTINCT d.id) AS total FROM documents d JOIN users u ON d.author_id = u.id`;

  const conditions: string[] = [];
  const params: (string | number)[] = [];
  const countParams: (string | number)[] = [];

  // Tag filter requires JOIN
  if (tag) {
    sql += ' INNER JOIN document_tags dt ON dt.document_id = d.id';
    countSql += ' INNER JOIN document_tags dt ON dt.document_id = d.id';
    conditions.push('dt.tag = ?');
    params.push(tag);
    countParams.push(tag);
  }

  // Status filter
  if (status) {
    conditions.push('d.status = ?');
    params.push(status);
    countParams.push(status);
  }

  // Author filter
  if (authorId) {
    conditions.push('d.author_id = ?');
    params.push(authorId);
    countParams.push(authorId);
  }

  // Doc type filter
  if (doc_type) {
    conditions.push('d.doc_type = ?');
    params.push(doc_type);
    countParams.push(doc_type);
  }

  // Resource type filter
  if (resource_type) {
    conditions.push('d.resource_type = ?');
    params.push(resource_type);
    countParams.push(resource_type);
  }

  // Semester filter
  if (semester) {
    conditions.push('d.semester = ?');
    params.push(semester);
    countParams.push(semester);
  }

  // Academic year filter
  if (academic_year) {
    conditions.push('d.academic_year = ?');
    params.push(academic_year);
    countParams.push(academic_year);
  }

  // Course code filter
  if (course_code) {
    conditions.push('d.course_code = ?');
    params.push(course_code);
    countParams.push(course_code);
  }

  // Major filter
  if (major) {
    conditions.push('d.major = ?');
    params.push(major);
    countParams.push(major);
  }

  // Search filter (FULLTEXT or LIKE fallback)
  if (search) {
    conditions.push('(d.title LIKE ? OR d.course_code LIKE ? OR d.description LIKE ? OR d.sharer_name LIKE ? OR d.framework LIKE ? OR d.language LIKE ?)');
    const likeParam = `%${search}%`;
    params.push(likeParam, likeParam, likeParam, likeParam, likeParam, likeParam);
    countParams.push(likeParam, likeParam, likeParam, likeParam, likeParam, likeParam);
  }

  if (conditions.length > 0) {
    const whereClause = ' WHERE ' + conditions.join(' AND ');
    sql += whereClause;
    countSql += whereClause;
  }

  sql += ' ORDER BY d.created_at DESC';

  // Pagination (coerce to safe integers for the text protocol).
  const safeLimit = Math.max(1, Math.floor(Number(limit)) || 20);
  const safePage = Math.max(1, Math.floor(Number(page)) || 1);
  const offset = (safePage - 1) * safeLimit;
  sql += ' LIMIT ? OFFSET ?';
  params.push(safeLimit, offset);

  const [documents, countResult] = await Promise.all([
    query<DocumentRecord[]>(sql, params),
    query<{ total: number }[]>(countSql, countParams),
  ]);

  const total = countResult[0]?.total || 0;

  // Fetch tags, images, and links for all documents
  if (documents.length > 0) {
    const docIds = documents.map(d => d.id);
    const placeholders = docIds.map(() => '?').join(',');

    const [tags, images, links] = await Promise.all([
      query<{ document_id: number; tag: string }[]>(
        `SELECT document_id, tag FROM document_tags WHERE document_id IN (${placeholders})`,
        docIds
      ),
      query<DocumentImage[]>(
        `SELECT id, document_id, image_url, sort_order FROM document_images WHERE document_id IN (${placeholders}) ORDER BY sort_order ASC`,
        docIds
      ),
      query<DocumentLink[]>(
        `SELECT id, document_id, url, provider, link_type, label, is_active FROM document_links WHERE document_id IN (${placeholders}) AND is_active = 1`,
        docIds
      ).catch(() => [] as DocumentLink[]), // table may not exist yet
    ]);

    const tagMap: Record<number, string[]> = {};
    for (const t of tags) {
      if (!tagMap[t.document_id]) tagMap[t.document_id] = [];
      tagMap[t.document_id].push(t.tag);
    }

    const imageMap: Record<number, DocumentImage[]> = {};
    for (const img of images) {
      if (!imageMap[img.document_id]) imageMap[img.document_id] = [];
      imageMap[img.document_id].push(img);
    }

    const linkMap: Record<number, DocumentLink[]> = {};
    for (const link of links) {
      const docId = (link as any).document_id;
      if (!linkMap[docId]) linkMap[docId] = [];
      linkMap[docId].push(link);
    }

    for (const doc of documents) {
      doc.tags = tagMap[doc.id] || [];
      doc.images = imageMap[doc.id] || [];
      doc.links = linkMap[doc.id] || [];
    }
  }

  return { documents, total };
}

/**
 * Get a single document by slug with full data (tags, images, files, links)
 */
export async function getDocumentBySlug(slug: string): Promise<DocumentRecord | null> {
  const rows = await query<DocumentRecord[]>(
    `SELECT 
      d.*, u.username, u.avatar_url AS author_avatar
    FROM documents d
    JOIN users u ON d.author_id = u.id
    WHERE d.slug = ?`,
    [slug]
  );

  if (!rows.length) return null;
  const doc = rows[0];

  // Fetch related data in parallel
  const [tags, images, files, links] = await Promise.all([
    query<{ tag: string }[]>('SELECT tag FROM document_tags WHERE document_id = ?', [doc.id]),
    query<DocumentImage[]>('SELECT * FROM document_images WHERE document_id = ? ORDER BY sort_order ASC', [doc.id]),
    query<DocumentFile[]>('SELECT * FROM document_files WHERE document_id = ?', [doc.id]),
    query<DocumentLink[]>('SELECT * FROM document_links WHERE document_id = ? AND is_active = 1', [doc.id])
      .catch(() => [] as DocumentLink[]),
  ]);

  doc.tags = tags.map(t => t.tag);
  doc.images = images;
  doc.files = files;
  doc.links = links;

  return doc;
}

/**
 * Get a single document by ID
 */
export async function getDocumentById(id: number): Promise<DocumentRecord | null> {
  const rows = await query<DocumentRecord[]>(
    `SELECT d.*, u.username, u.avatar_url AS author_avatar
    FROM documents d
    JOIN users u ON d.author_id = u.id
    WHERE d.id = ?`,
    [id]
  );

  if (!rows.length) return null;
  const doc = rows[0];

  const [tags, images, files, links] = await Promise.all([
    query<{ tag: string }[]>('SELECT tag FROM document_tags WHERE document_id = ?', [doc.id]),
    query<DocumentImage[]>('SELECT * FROM document_images WHERE document_id = ? ORDER BY sort_order ASC', [doc.id]),
    query<DocumentFile[]>('SELECT * FROM document_files WHERE document_id = ?', [doc.id]),
    query<DocumentLink[]>('SELECT * FROM document_links WHERE document_id = ? AND is_active = 1', [doc.id])
      .catch(() => [] as DocumentLink[]),
  ]);

  doc.tags = tags.map(t => t.tag);
  doc.images = images;
  doc.files = files;
  doc.links = links;

  return doc;
}

/**
 * Increment view count
 */
export async function incrementViewCount(docId: number): Promise<void> {
  await query('UPDATE documents SET view_count = view_count + 1 WHERE id = ?', [docId]);
}

/**
 * Increment download count
 */
export async function incrementDownloadCount(docId: number): Promise<void> {
  await query('UPDATE documents SET download_count = download_count + 1 WHERE id = ?', [docId]);
}
