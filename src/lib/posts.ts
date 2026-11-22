import { query } from './db';
import { Post } from '../types';

export interface FeedOptions {
  userId?: number | null;
  categorySlug?: string;
  searchTerm?: string;
  sort?: 'hot' | 'new';
  limit?: number;
  offset?: number;
}

/**
 * Fetch feed posts with optimized query using derived-table JOINs instead of
 * correlated subqueries. This avoids N+1 query performance issues when many
 * posts are returned. Supports optional pagination.
 */
export async function getFeedPosts(options: FeedOptions = {}): Promise<Post[]> {
  const { userId, categorySlug, searchTerm, sort = 'hot', limit, offset } = options;

  // Build base query with derived tables for counts
  let sql = `
    SELECT 
      p.id, p.title, p.slug, p.summary, p.link, p.thumbnail,
      p.author_id, p.category_id, p.status, p.created_at, p.updated_at,
      u.username, u.avatar_url AS author_avatar,
      c.name AS category_name, c.slug AS category_slug,
      COALESCE(uc.upvotes_count, 0) AS upvotes_count,
      COALESCE(cc.comments_count, 0) AS comments_count,
      ${userId ? 'myv.user_id IS NOT NULL AS has_upvoted' : '0 AS has_upvoted'}
    FROM posts p
    JOIN users u ON p.author_id = u.id
    JOIN categories c ON p.category_id = c.id
    LEFT JOIN (
      SELECT post_id, COUNT(*) AS upvotes_count
      FROM upvotes
      GROUP BY post_id
    ) uc ON uc.post_id = p.id
    LEFT JOIN (
      SELECT post_id, COUNT(*) AS comments_count
      FROM comments
      GROUP BY post_id
    ) cc ON cc.post_id = p.id
    ${userId ? 'LEFT JOIN upvotes myv ON myv.post_id = p.id AND myv.user_id = ?' : ''}
    WHERE p.status = 'approved'
  `;

  const params: (string | number)[] = [];
  if (userId) {
    params.push(userId);
  }

  // Add category filter
  if (categorySlug) {
    sql += ' AND c.slug = ?';
    params.push(categorySlug);
  }

  // Add search filter (Smart search by keywords, category name, and author name)
  let orderBy = '';
  const searchSortParams: (string | number)[] = [];
  if (searchTerm) {
    const tokens = searchTerm.trim().split(/\s+/).filter(Boolean);
    if (tokens.length > 0) {
      // 1. Filter condition using OR to match partial words instead of returning empty results immediately
      const tokenConditions = tokens.map(() => {
        return `(p.title LIKE ? OR p.summary LIKE ? OR p.content LIKE ? OR c.name LIKE ? OR u.username LIKE ?)`;
      }).join(' OR ');
      
      sql += ` AND (${tokenConditions})`;
      
      tokens.forEach(token => {
        const likeParam = `%${token}%`;
        params.push(likeParam, likeParam, likeParam, likeParam, likeParam);
      });

      // 2. Relevance scoring for smart sorting
      const scoreExpr = tokens.map(() => {
        return `
          (CASE WHEN p.title LIKE ? THEN 10 ELSE 0 END) +
          (CASE WHEN p.summary LIKE ? THEN 4 ELSE 0 END) +
          (CASE WHEN p.content LIKE ? THEN 2 ELSE 0 END) +
          (CASE WHEN c.name LIKE ? THEN 3 ELSE 0 END) +
          (CASE WHEN u.username LIKE ? THEN 2 ELSE 0 END)
        `;
      }).join(' + ');
      
      orderBy = `(${scoreExpr}) DESC, `;
      
      tokens.forEach(token => {
        const likeParam = `%${token}%`;
        searchSortParams.push(likeParam, likeParam, likeParam, likeParam, likeParam);
      });
    }
  }

  // Apply sorting
  if (sort === 'new') {
    sql += ` ORDER BY ${orderBy}p.created_at DESC, upvotes_count DESC`;
  } else {
    sql += ` ORDER BY ${orderBy}upvotes_count DESC, p.created_at DESC`;
  }

  // Push ORDER BY parameters before LIMIT and OFFSET
  params.push(...searchSortParams);

  // Add pagination limits (coerce to safe non-negative integers so the text
  // protocol always emits `LIMIT 12` and never `LIMIT '12'`).
  if (limit !== undefined && offset !== undefined) {
    const safeLimit = Math.max(0, Math.floor(Number(limit)) || 0);
    const safeOffset = Math.max(0, Math.floor(Number(offset)) || 0);
    sql += ' LIMIT ? OFFSET ?';
    params.push(safeLimit, safeOffset);
  }

  return await query<Post[]>(sql, params);
}

/**
 * Get the total count of approved feed posts matching the filters.
 */
export async function getFeedPostsCount(options: Omit<FeedOptions, 'sort' | 'limit' | 'offset'> = {}): Promise<number> {
  const { categorySlug, searchTerm } = options;

  let sql = `
    SELECT COUNT(*) as total
    FROM posts p
    JOIN users u ON p.author_id = u.id
    JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'approved'
  `;

  const params: (string | number)[] = [];

  // Add category filter
  if (categorySlug) {
    sql += ' AND c.slug = ?';
    params.push(categorySlug);
  }

  // Add search filter (Smart search by keywords, category name, and author name)
  if (searchTerm) {
    const tokens = searchTerm.trim().split(/\s+/).filter(Boolean);
    if (tokens.length > 0) {
      const tokenConditions = tokens.map(() => {
        return `(p.title LIKE ? OR p.summary LIKE ? OR p.content LIKE ? OR c.name LIKE ? OR u.username LIKE ?)`;
      }).join(' OR ');
      
      sql += ` AND (${tokenConditions})`;
      
      tokens.forEach(token => {
        const likeParam = `%${token}%`;
        params.push(likeParam, likeParam, likeParam, likeParam, likeParam);
      });
    }
  }

  const results = await query<{ total: number }[]>(sql, params);
  return results[0]?.total || 0;
}
