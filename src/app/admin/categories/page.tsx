import React from 'react';
import { notFound } from 'next/navigation';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { detectLanguageServer } from '@/lib/i18n-server';
import CategoriesManagerClient from './categories-manager-client';

interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

async function getCategories(): Promise<CategoryRow[]> {
  try {
    const categories = await query<CategoryRow[]>('SELECT id, name, slug, description FROM categories ORDER BY name ASC');
    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

export default async function CategoriesPage() {
  const user = await getCurrentUser();
  const lang = await detectLanguageServer();

  if (!user || user.role !== 'admin') {
    notFound();
  }

  const categories = await getCategories();

  return (
    <div className="page-fade-in">
      <CategoriesManagerClient initialCategories={categories} lang={lang} />
    </div>
  );
}
