'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Post } from '@/types';
import { translations, Language } from '@/lib/i18n';
import { useToast } from '@/components/Toast';
import Image from 'next/image';
import { AppIcon } from '@/components/ui/icon';

function PostThumbnail({ src, alt }: { src: string | null | undefined; alt: string }) {
  const fallback = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=120&q=70';
  const getOptimizedUrl = (url: string | null | undefined) => {
    if (!url) return fallback;
    if (url.includes('unsplash.com') && url.includes('w=800')) {
      return url.replace('w=800', 'w=120').replace('q=80', 'q=70');
    }
    return url;
  };
  const [imgSrc, setImgSrc] = useState(() => getOptimizedUrl(src));

  return (
    <Image
      key={src || 'fallback'}
      src={imgSrc}
      alt={alt}
      className="post-thumbnail"
      width={52}
      height={52}
      onError={() => {
        setImgSrc(fallback);
      }}
    />
  );
}

interface PostGridClientProps {
  initialPosts: Post[];
  loggedIn: boolean;
  lang: Language;
}

export default function PostGridClient({ initialPosts, loggedIn, lang }: PostGridClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [posts, setPosts] = useState<Post[]>(initialPosts);

  // Sync state if initial posts change (e.g. during search/navigation)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPosts(initialPosts);
  }, [initialPosts]);

  const handleVote = async (e: React.MouseEvent, post: Post) => {
    e.stopPropagation(); // prevent card click
    
    if (!loggedIn) {
      router.push('/login');
      return;
    }

    try {
      const originalPosts = [...posts];
      const isUpvoted = !post.has_upvoted;
      const countDiff = isUpvoted ? 1 : -1;
      
      setPosts(prev => prev.map(p => 
        p.id === post.id 
          ? { ...p, has_upvoted: isUpvoted, upvotes_count: (p.upvotes_count || 0) + countDiff }
          : p
      ));

      const res = await fetch(`/api/posts/${post.id}/vote`, {
        method: 'POST',
      });

      if (!res.ok) {
        setPosts(originalPosts);
        const data = await res.json();
        showToast(data.error || 'Bình chọn thất bại', 'error');
      } else {
        const data = await res.json();
        setPosts(prev => prev.map(p => 
          p.id === post.id 
            ? { ...p, has_upvoted: data.hasUpvoted, upvotes_count: data.upvotesCount }
            : p
        ));
        showToast(lang === 'vi' ? 'Bình chọn thành công!' : 'Vote successful!', 'success');
      }
    } catch (error) {
      showToast('Lỗi kết nối máy chủ', 'error');
      console.error('Failed to vote:', error);
    }
  };

  const handleCardClick = (slug: string) => {
    router.push(`/posts/${slug}`);
  };

  const t = translations[lang] || translations.en;

  if (posts.length === 0) {
    return (
      <div style={{
        padding: '80px 20px',
        textAlign: 'center',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        color: 'var(--text-secondary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        boxShadow: 'var(--shadow-md)',
        maxWidth: '600px',
        margin: '40px auto'
      }} className="page-fade-in">
        <AppIcon name="FolderOpen" size={48} className="text-primary" />
        <p style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
          {t.noResults}
        </p>
        <span style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
          {lang === 'vi' ? 'Hãy thử tìm kiếm với từ khóa khác hoặc lọc theo danh mục khác.' : 'Try search with another query or select a different category filter.'}
        </span>
      </div>
    );
  }

  return (
    <div className="posts-grid page-fade-in">
      {posts.map(post => (
        <article 
          key={post.id} 
          className="post-card"
          onClick={() => handleCardClick(post.slug)}
        >
          <div className="post-header">
            <PostThumbnail src={post.thumbnail} alt={post.title} />
            <div className="post-meta-info">
              <h3 className="post-title">{post.title}</h3>
              <span className="post-category">{post.category_name}</span>
            </div>
            
            <a 
              href={post.link} 
              target="_blank" 
              rel="noopener noreferrer" 
              onClick={(e) => e.stopPropagation()} 
              style={{ color: 'var(--text-muted)', display: 'inline-flex' }}
              title={lang === 'vi' ? `Ghé thăm trang web ${post.title}` : `Visit ${post.title} website`}
              aria-label={lang === 'vi' ? `Ghé thăm trang web ${post.title}` : `Visit ${post.title} website`}
            >
              <AppIcon name="ExternalLink" size={20} />
            </a>
          </div>

          <p className="post-summary">{post.summary}</p>

          <div className="post-footer">
            <button 
              className={`upvote-button ${post.has_upvoted ? 'upvoted' : ''}`}
              onClick={(e) => handleVote(e, post)}
            >
              <AppIcon name="Heart" size={16} stroke={2} className={post.has_upvoted ? 'heart-pulsing' : ''} />
              <span>{post.upvotes_count || 0}</span>
            </button>

            <button className="comment-count-btn">
              <AppIcon name="MessageSquare" size={18} />
              <span>{post.comments_count || 0} {t.comments}</span>
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
