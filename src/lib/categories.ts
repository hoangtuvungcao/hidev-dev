import { query } from './db';
import { Category } from '../types';

export const CATEGORIES_TAG = 'categories';

async function loadCategories(): Promise<Category[]> {
  try {
    return await query<Category[]>(
      'SELECT id, name, slug, description FROM categories ORDER BY name ASC'
    );
  } catch (error) {
    console.warn('Could not fetch categories:', error);
    return [];
  }
}

// Disable caching để header cập nhật ngay khi thêm/sửa/xóa category
export const getCategories = loadCategories;
