'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/types';
import { translations, detectLanguageClient, Language } from '@/lib/i18n';
import { useToast } from '@/components/Toast';
import { AppIcon } from '@/components/ui/icon';

type UserRow = Omit<User, 'password_hash'>;

export default function AdminUsersPage() {
  const { showToast } = useToast();
  const [lang, setLang] = useState<Language>('en');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(detectLanguageClient());
  }, []);

  const t = translations[lang] || translations.en;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', String(page));
      params.set('limit', String(LIMIT));

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch {
      showToast('Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, page, showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, [fetchUsers]);

  const handleAction = async (userId: number, action: string, value?: string | boolean) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, action, value }),
      });
      if (res.ok) {
        showToast(lang === 'vi' ? 'Đã cập nhật thành công!' : 'Updated successfully!', 'success');
        fetchUsers();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed', 'error');
      }
    } catch {
      showToast('Server error', 'error');
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  const roleColors: Record<string, string> = {
    admin: '#ef4444',
    moderator: '#f59e0b',
    editor: '#8b5cf6',
    author: '#06b6d4',
    user: '#6b7280',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <AppIcon name="Users" size={24} className="text-primary" />
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
          {t.adminUsers}
        </h1>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 28px 0' }}>
        {lang === 'vi' ? `Quản lý ${total} tài khoản người dùng.` : `Managing ${total} user accounts.`}
      </p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 14px', borderRadius: '8px',
          border: '1px solid var(--border)', backgroundColor: 'var(--surface)',
          flex: '1 1 200px', maxWidth: '360px',
        }}>
          <AppIcon name="Search" size={16} className="text-muted" />
          <input
            type="text"
            placeholder={lang === 'vi' ? 'Tìm username hoặc email...' : 'Search username or email...'}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{
              border: 'none', background: 'none', outline: 'none',
              fontSize: '13px', color: 'var(--text)', width: '100%',
            }}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="form-select"
          style={{ padding: '8px 12px', fontSize: '13px', borderRadius: '8px', minWidth: '140px' }}
        >
          <option value="">{lang === 'vi' ? 'Tất cả vai trò' : 'All Roles'}</option>
          <option value="admin">{t.roleAdmin}</option>
          <option value="moderator">{t.roleModerator}</option>
          <option value="editor">{t.roleEditor}</option>
          <option value="author">{t.roleAuthor}</option>
          <option value="user">{t.roleUser}</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="form-select"
          style={{ padding: '8px 12px', fontSize: '13px', borderRadius: '8px', minWidth: '140px' }}
        >
          <option value="">{lang === 'vi' ? 'Tất cả trạng thái' : 'All Status'}</option>
          <option value="active">{t.userActive}</option>
          <option value="verified">{t.userVerified}</option>
          <option value="banned">{t.userBanned}</option>
        </select>
      </div>

      {/* Users Table */}
      <div style={{
        border: '1px solid var(--border)',
        borderRadius: '12px',
        backgroundColor: 'var(--surface)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            {lang === 'vi' ? 'Đang tải...' : 'Loading...'}
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            {lang === 'vi' ? 'Không tìm thấy người dùng.' : 'No users found.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['ID', lang === 'vi' ? 'Người dùng' : 'User', 'Email', lang === 'vi' ? 'Vai trò' : 'Role', lang === 'vi' ? 'Trạng thái' : 'Status', lang === 'vi' ? 'Ngày tham gia' : 'Joined', lang === 'vi' ? 'Hành động' : 'Actions'].map((h) => (
                    <th key={h} style={{
                      padding: '12px 16px', textAlign: 'left', fontWeight: 700,
                      color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase',
                      letterSpacing: '0.05em', whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>#{u.id}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`}
                          alt={u.username}
                          width={28} height={28}
                          style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--border)' }}
                        />
                        <div>
                          <span style={{ fontWeight: 700, color: 'var(--text)', display: 'inline-flex', alignItems: 'center' }}>
                            @{u.username}
                            {u.is_verified && (
                              <span style={{ color: '#3b82f6', marginLeft: '4px', display: 'inline-flex', alignItems: 'center' }} title="Verified">
                                <AppIcon name="CheckCircle" size={14} />
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <select
                        value={u.role}
                        onChange={(e) => handleAction(u.id, 'role', e.target.value)}
                        style={{
                          padding: '4px 8px', fontSize: '11px', fontWeight: 700,
                          borderRadius: '6px', border: '1px solid var(--border)',
                          backgroundColor: 'transparent', color: roleColors[u.role] || 'var(--text)',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="user">{t.roleUser}</option>
                        <option value="author">{t.roleAuthor}</option>
                        <option value="editor">{t.roleEditor}</option>
                        <option value="moderator">{t.roleModerator}</option>
                        <option value="admin">{t.roleAdmin}</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {u.is_banned ? (
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                          backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                        }}>
                          {t.userBanned}
                        </span>
                      ) : (
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                          backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--primary)',
                        }}>
                          {t.userActive}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }} suppressHydrationWarning>
                      {new Date(u.created_at || '').toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleAction(u.id, 'verify', !u.is_verified)}
                          title={u.is_verified ? 'Unverify' : 'Verify'}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            padding: '4px 10px', fontSize: '11px', fontWeight: 600,
                            borderRadius: '6px', border: 'none', cursor: 'pointer',
                            backgroundColor: u.is_verified ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.05)',
                            color: u.is_verified ? '#3b82f6' : 'var(--text-muted)',
                            transition: 'var(--transition)',
                          }}
                        >
                          <AppIcon name="Shield" size={12} /> {u.is_verified ? '✓' : 'Verify'}
                        </button>
                        {u.is_banned ? (
                          <button
                            onClick={() => handleAction(u.id, 'unban')}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '4px',
                              padding: '4px 10px', fontSize: '11px', fontWeight: 600,
                              borderRadius: '6px', border: 'none', cursor: 'pointer',
                              backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--primary)',
                              transition: 'var(--transition)',
                            }}
                          >
                            Unban
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              const reason = prompt(lang === 'vi' ? 'Lý do cấm:' : 'Ban reason:');
                              if (reason !== null) handleAction(u.id, 'ban', reason);
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '4px',
                              padding: '4px 10px', fontSize: '11px', fontWeight: 600,
                              borderRadius: '6px', border: 'none', cursor: 'pointer',
                              backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444',
                              transition: 'var(--transition)',
                            }}
                          >
                            <AppIcon name="Ban" size={12} /> Ban
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '24px' }}>
          <button
            className="btn btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            style={{ padding: '6px 14px', fontSize: '13px' }}
          >
            ← {lang === 'vi' ? 'Trước' : 'Prev'}
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {page} / {totalPages}
          </span>
          <button
            className="btn btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            style={{ padding: '6px 14px', fontSize: '13px' }}
          >
            {lang === 'vi' ? 'Sau' : 'Next'} →
          </button>
        </div>
      )}
    </div>
  );
}
