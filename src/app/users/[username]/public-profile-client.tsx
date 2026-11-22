'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { User, Post, Category } from '@/types';
import { Language } from '@/lib/i18n';
import { AppIcon } from '@/components/ui/icon';

interface PublicProfileClientProps {
  user: User;
  posts: Post[];
  votedPosts: Post[];
  categories: Category[];
  lang: Language;
}

export default function PublicProfileClient({ user, posts, votedPosts, lang }: PublicProfileClientProps) {
  const [activeTab, setActiveTab] = useState<'posts' | 'voted'>('posts');

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Profile Header Card */}
      <div className="admin-table-container" style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={user.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'} 
          alt={user.username} 
          width={100}
          height={100}
          style={{ width: '100px', height: '100px', borderRadius: '50%', border: '3px solid var(--primary)', backgroundColor: 'var(--border)' }}
        />
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>@{user.username}</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }} suppressHydrationWarning>
            <AppIcon name="Calendar" size={16} />
            {lang === 'vi' ? `Thành viên từ ${new Date(user.created_at || '').toLocaleDateString('vi-VN')}` : `Member since ${new Date(user.created_at || '').toLocaleDateString('en-US')}`}
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AppIcon name="Heart" size={16} color="var(--primary)" />
            {votedPosts.length} {lang === 'vi' ? 'lượt vote' : 'votes'}
          </p>
        </div>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="profile-tabs-container">
        <div className="profile-tab-header">
          <button 
            className={`profile-tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', verticalAlign: 'middle' }}>
              <AppIcon name="FileText" size={18} />
              {lang === 'vi' ? 'Bài viết đã đăng' : 'Published Posts'} ({posts.length})
            </span>
          </button>
          <button 
            className={`profile-tab-btn ${activeTab === 'voted' ? 'active' : ''}`}
            onClick={() => setActiveTab('voted')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', verticalAlign: 'middle' }}>
              <AppIcon name="Heart" size={18} />
              {lang === 'vi' ? 'Đã vote' : 'Voted'} ({votedPosts.length})
            </span>
          </button>
        </div>

        {/* Tab content 1: User's Posts */}
        {activeTab === 'posts' && (
          <div className="admin-table-container">
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
              {lang === 'vi' ? 'Bài viết đã đăng' : 'Published Posts'}
            </h2>

            {posts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                {lang === 'vi' ? 'Người dùng này chưa đăng bài viết nào.' : "This user hasn't published any posts yet."}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {posts.map(post => (
                  <div 
                    key={post.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '16px', 
                      border: '1px solid var(--border)', 
                      borderRadius: '12px',
                      backgroundColor: 'var(--surface-hover)' 
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
                        <Link href={`/posts/${post.slug}`} style={{ color: 'var(--text)', textDecoration: 'none' }} className="post-title-link">
                          {post.title}
                        </Link>
                      </h3>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span className="post-category" style={{ padding: '2px 8px', fontSize: '10px' }}>
                          {post.category_name}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }} suppressHydrationWarning>
                          <AppIcon name="Calendar" size={12} />
                          {new Date(post.created_at).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab content 2: Voted Posts */}
        {activeTab === 'voted' && (
          <div className="admin-table-container">
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
              {lang === 'vi' ? 'Bài viết đã vote' : 'Voted Posts'}
            </h2>

            {votedPosts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                {lang === 'vi' ? 'Người dùng này chưa vote bài viết nào.' : "This user hasn't voted for any posts yet."}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {votedPosts.map(post => (
                  <div 
                    key={post.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '16px', 
                      border: '1px solid var(--border)', 
                      borderRadius: '12px',
                      backgroundColor: 'var(--surface-hover)' 
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
                        <Link href={`/posts/${post.slug}`} style={{ color: 'var(--text)', textDecoration: 'none' }} className="post-title-link">
                          {post.title}
                        </Link>
                      </h3>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span className="post-category" style={{ padding: '2px 8px', fontSize: '10px' }}>
                          {post.category_name}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <AppIcon name="Heart" size={20} color="var(--primary)" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
