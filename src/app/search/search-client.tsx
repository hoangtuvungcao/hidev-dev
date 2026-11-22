'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { Language } from '@/lib/i18n';
import { AppIcon } from '@/components/ui/icon';

interface SearchClientProps {
  users: User[];
  queryTerm: string;
  lang: Language;
}

export default function SearchClient({ users, queryTerm, lang }: SearchClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(queryTerm);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '24px' }}>
        {lang === 'vi' ? 'Tìm kiếm người dùng' : 'Search Users'}
      </h1>

      {/* Search Form */}
      <form onSubmit={handleSearch} style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'vi' ? 'Nhập username hoặc email...' : 'Enter username or email...'}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'var(--background)',
              color: 'var(--text)',
            }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '12px 24px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <AppIcon name="Search" size="md" />
            {lang === 'vi' ? 'Tìm kiếm' : 'Search'}
          </button>
        </div>
      </form>

      {/* Search Results */}
      {queryTerm && (
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
            {lang === 'vi' 
              ? `Kết quả tìm kiếm cho "${queryTerm}" (${users.length})` 
              : `Search results for "${queryTerm}" (${users.length})`}
          </h2>

          {users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              {lang === 'vi' ? 'Không tìm thấy người dùng nào.' : 'No users found.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {users.map((user) => (
                <Link
                  key={user.id}
                  href={`/users/${user.username}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    backgroundColor: 'var(--surface-hover)',
                    textDecoration: 'none',
                    color: 'var(--text)',
                    transition: 'var(--transition)',
                  }}
                  className="hover-card"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                    alt={user.username}
                    style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid var(--border)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>
                      @{user.username}
                    </h3>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <AppIcon name="User" size={14} />
                        {user.role.toUpperCase()}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <AppIcon name="Calendar" size={14} />
                        {new Date(user.created_at || '').toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {!queryTerm && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          {lang === 'vi' ? 'Nhập từ khóa để tìm kiếm người dùng.' : 'Enter a keyword to search for users.'}
        </div>
      )}
    </div>
  );
}
