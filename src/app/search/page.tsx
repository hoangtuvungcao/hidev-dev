import { query } from '@/lib/db';
import { detectLanguageServer } from '@/lib/i18n-server';
import { User } from '@/types';
import SearchClient from './search-client';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const resolvedParams = await searchParams;
  const queryTerm = resolvedParams.q || '';
  const lang = await detectLanguageServer();

  let users: User[] = [];
  if (queryTerm.trim()) {
    try {
      users = await query<User[]>(
        `SELECT id, username, email, role, avatar_url, created_at
         FROM users
         WHERE username LIKE ? OR email LIKE ?
         ORDER BY username ASC
         LIMIT 20`,
        [`%${queryTerm}%`, `%${queryTerm}%`]
      );
    } catch (error) {
      console.error('Error searching users:', error);
    }
  }

  return <SearchClient users={users || []} queryTerm={queryTerm} lang={lang} />;
}
