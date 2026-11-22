'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AppIcon } from '@/components/ui/icon';

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

interface CategoriesManagerClientProps {
  initialCategories: Category[];
  lang: 'en' | 'vi';
}

export default function CategoriesManagerClient({ initialCategories, lang }: CategoriesManagerClientProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: '', slug: '', description: '' });

  const t = {
    en: {
      title: 'Category Management',
      add: 'Add Category',
      edit: 'Edit',
      delete: 'Delete',
      save: 'Save',
      cancel: 'Cancel',
      name: 'Name',
      slug: 'Slug',
      description: 'Description',
      actions: 'Actions',
      successAdd: 'Category added successfully',
      successUpdate: 'Category updated successfully',
      successDelete: 'Category deleted successfully',
      error: 'Error occurred',
      confirmDelete: 'Are you sure you want to delete this category?',
    },
    vi: {
      title: 'Quản lý danh mục',
      add: 'Thêm danh mục',
      edit: 'Sửa',
      delete: 'Xóa',
      save: 'Lưu',
      cancel: 'Hủy',
      name: 'Tên',
      slug: 'Slug',
      description: 'Mô tả',
      actions: 'Hành động',
      successAdd: 'Đã thêm danh mục thành công',
      successUpdate: 'Đã cập nhật danh mục thành công',
      successDelete: 'Đã xóa danh mục thành công',
      error: 'Có lỗi xảy ra',
      confirmDelete: 'Bạn có chắc muốn xóa danh mục này?',
    },
  }[lang];

  const handleAdd = () => {
    setIsAdding(true);
    setFormData({ name: '', slug: '', description: '' });
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setFormData({ name: category.name, slug: category.slug, description: category.description || '' });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', slug: '', description: '' });
  };

  const handleSave = async (id?: number) => {
    try {
      const url = id ? `/api/categories/${id}` : '/api/categories';
      const method = id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to save');

      alert(id ? t.successUpdate : t.successAdd);

      // Refresh categories
      const categoriesRes = await fetch('/api/categories');
      const categoriesData = await categoriesRes.json();
      setCategories(categoriesData);

      handleCancel();
    } catch {
      alert(t.error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t.confirmDelete)) return;

    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');

      alert(t.successDelete);
      setCategories(categories.filter((c) => c.id !== id));
    } catch {
      alert(t.error);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData({ ...formData, name, slug: generateSlug(name) });
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/admin" className="btn-icon" style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <AppIcon name="ArrowLeft" size={24} />
          </Link>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              {t.title}
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '14px' }}>
              {lang === 'vi' 
                ? 'Quản lý tất cả danh mục bài viết'
                : 'Manage all post categories'}
            </p>
          </div>
        </div>
        <button onClick={handleAdd} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <AppIcon name="Plus" size={18} /> {t.add}
        </button>
      </div>

      <div className="admin-content">
        <div className="admin-card" style={{ padding: '24px' }}>
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t.name}
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t.slug}
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t.description}
                </th>
                <th style={{ padding: '16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t.actions}
                </th>
              </tr>
            </thead>
            <tbody>
              {isAdding && (
                <tr style={{ backgroundColor: 'var(--surface-hover)' }}>
                  <td style={{ padding: '16px' }}>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder={t.name}
                      className="admin-input"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', fontSize: '14px' }}
                    />
                  </td>
                  <td style={{ padding: '16px' }}>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder={t.slug}
                      className="admin-input"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', fontSize: '14px' }}
                    />
                  </td>
                  <td style={{ padding: '16px' }}>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={t.description}
                      className="admin-input"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', fontSize: '14px' }}
                    />
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button onClick={() => handleSave()} className="btn-icon btn-success" style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#22c55e', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <AppIcon name="Save" size={18} />
                    </button>
                    <button onClick={handleCancel} className="btn-icon btn-danger" style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', marginLeft: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <AppIcon name="X" size={18} />
                    </button>
                  </td>
                </tr>
              )}

              {categories.map((category) => (
                <tr key={category.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  {editingId === category.id ? (
                    <>
                      <td style={{ padding: '16px' }}>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleNameChange(e.target.value)}
                          className="admin-input"
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', fontSize: '14px' }}
                        />
                      </td>
                      <td style={{ padding: '16px' }}>
                        <input
                          type="text"
                          value={formData.slug}
                          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                          className="admin-input"
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', fontSize: '14px' }}
                        />
                      </td>
                      <td style={{ padding: '16px' }}>
                        <input
                          type="text"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="admin-input"
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', fontSize: '14px' }}
                        />
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <button onClick={() => handleSave(category.id)} className="btn-icon btn-success" style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#22c55e', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <AppIcon name="Save" size={18} />
                        </button>
                        <button onClick={handleCancel} className="btn-icon btn-danger" style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', marginLeft: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <AppIcon name="X" size={18} />
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '16px', fontWeight: 500, color: 'var(--text)' }}>
                        {category.name}
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                        {category.slug}
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>
                        {category.description || '-'}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <button onClick={() => handleEdit(category)} className="btn-icon btn-warning" style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#f59e0b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <AppIcon name="Pencil" size={18} />
                        </button>
                        <button onClick={() => handleDelete(category.id)} className="btn-icon btn-danger" style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', marginLeft: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <AppIcon name="Trash2" size={18} />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
