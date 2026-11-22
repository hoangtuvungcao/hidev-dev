'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Post, Comment, User } from '@/types';
import { translations, Language } from '@/lib/i18n';
import { useToast } from '@/components/Toast';
import Image from 'next/image';
import { AppIcon } from '@/components/ui/icon';

function DetailThumbnail({ src, alt, size = 80 }: { src: string | null | undefined; alt: string; size?: number }) {
  const fallback = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=160&q=70';
  const getOptimizedUrl = (url: string | null | undefined) => {
    if (!url) return fallback;
    if (url.includes('unsplash.com') && url.includes('w=800')) {
      return url.replace('w=800', 'w=160').replace('q=80', 'q=70');
    }
    return url;
  };

  // Reset the resolved src whenever `src` changes without a state-syncing
  // effect: remounting via `key` is React's recommended pattern and avoids the
  // extra render pass (smoother, no flicker).
  const [imgSrc, setImgSrc] = useState(() => getOptimizedUrl(src));

  return (
    <Image
      key={src || 'fallback'}
      src={imgSrc}
      alt={alt}
      width={size}
      height={size}
      style={{ width: size, height: size, borderRadius: '14px', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }}
      onError={() => {
        setImgSrc(fallback);
      }}
    />
  );
}

interface PostDetailClientProps {
  post: Post;
  initialComments: Comment[];
  htmlContent: string;
  loggedIn: boolean;
  user: User | null;
  lang: Language;
  relatedPosts?: Post[];
}

export default function PostDetailClient({
  post,
  initialComments,
  htmlContent,
  loggedIn,
  user,
  lang,
  relatedPosts = []
}: PostDetailClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  
  const [hasUpvoted, setHasUpvoted] = useState(post.has_upvoted);
  const [upvotesCount, setUpvotesCount] = useState(post.upvotes_count || 0);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  
  const [loadingVote, setLoadingVote] = useState(false);
  const [loadingComment, setLoadingComment] = useState(false);

  // States for nested comment replies
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loadingReply, setLoadingReply] = useState(false);

  // States for comment editing
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [loadingEdit, setLoadingEdit] = useState(false);

  const handleVote = async () => {
    if (!loggedIn) {
      router.push('/login');
      return;
    }
    if (loadingVote) return;

    try {
      setLoadingVote(true);
      const originalUpvoted = hasUpvoted;
      const originalCount = upvotesCount;
      
      setHasUpvoted(!hasUpvoted);
      setUpvotesCount(prev => prev + (hasUpvoted ? -1 : 1));

      const res = await fetch(`/api/posts/${post.id}/vote`, {
        method: 'POST',
      });

      if (!res.ok) {
        setHasUpvoted(originalUpvoted);
        setUpvotesCount(originalCount);
        showToast(lang === 'vi' ? 'Bình chọn thất bại' : 'Voting failed', 'error');
      } else {
        const data = await res.json();
        setHasUpvoted(data.hasUpvoted);
        setUpvotesCount(data.upvotesCount);
        showToast(lang === 'vi' ? 'Bình chọn thành công!' : 'Vote successful!', 'success');
      }
    } catch (err) {
      showToast(lang === 'vi' ? 'Lỗi kết nối máy chủ' : 'Server connection error', 'error');
      console.error('Voting failed:', err);
    } finally {
      setLoadingVote(false);
    }
  };

  // Submit root comment
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedIn) {
      router.push('/login');
      return;
    }
    if (!newComment.trim() || loadingComment) return;

    try {
      setLoadingComment(true);
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });

      const data = await res.json();

      if (res.ok && data.comment) {
        setComments(prev => [...prev, data.comment]);
        setNewComment('');
        showToast(lang === 'vi' ? 'Đã thêm bình luận!' : 'Comment added!', 'success');
      } else {
        showToast(data.error || 'Đăng bình luận thất bại', 'error');
      }
    } catch (err) {
      showToast(lang === 'vi' ? 'Lỗi kết nối máy chủ' : 'Server connection error', 'error');
      console.error('Comment error:', err);
    } finally {
      setLoadingComment(false);
    }
  };

  // Submit nested reply comment
  const handleReplySubmit = async (parentId: number) => {
    if (!loggedIn) {
      router.push('/login');
      return;
    }
    if (!replyText.trim() || loadingReply) return;

    try {
      setLoadingReply(true);
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyText, parentId }),
      });

      const data = await res.json();

      if (res.ok && data.comment) {
        setComments(prev => [...prev, data.comment]);
        setReplyText('');
        setReplyingToId(null);
        showToast(lang === 'vi' ? 'Đã gửi phản hồi!' : 'Reply sent!', 'success');
      } else {
        showToast(data.error || 'Đăng phản hồi thất bại', 'error');
      }
    } catch (err) {
      showToast(lang === 'vi' ? 'Lỗi kết nối máy chủ' : 'Server connection error', 'error');
      console.error('Reply comment error:', err);
    } finally {
      setLoadingReply(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    const confirmed = confirm(
      lang === 'vi'
        ? 'Bạn có chắc chắn muốn xóa bình luận này?'
        : 'Are you sure you want to delete this comment?'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId }),
      });

      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        showToast(lang === 'vi' ? 'Đã xóa bình luận!' : 'Comment deleted!', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'Xóa bình luận thất bại', 'error');
      }
    } catch (err) {
      showToast(lang === 'vi' ? 'Lỗi kết nối máy chủ' : 'Server connection error', 'error');
      console.error('Delete comment error:', err);
    }
  };

  const handleEditComment = async (commentId: number) => {
    if (!editText.trim() || loadingEdit) return;

    try {
      setLoadingEdit(true);
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, content: editText }),
      });

      const data = await res.json();

      if (res.ok) {
        setComments(prev =>
          prev.map(c =>
            c.id === commentId ? { ...c, content: editText } : c
          )
        );
        setEditingCommentId(null);
        setEditText('');
        showToast(lang === 'vi' ? 'Đã cập nhật bình luận!' : 'Comment updated!', 'success');
      } else {
        showToast(data.error || 'Sửa bình luận thất bại', 'error');
      }
    } catch (err) {
      showToast(lang === 'vi' ? 'Lỗi kết nối máy chủ' : 'Server connection error', 'error');
      console.error('Edit comment error:', err);
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast(
        lang === 'vi' ? 'Đã sao chép liên kết chia sẻ vào clipboard!' : 'Shared link copied to clipboard!',
        'success'
      );
    } else {
      showToast(lang === 'vi' ? 'Không hỗ trợ clipboard' : 'Clipboard not supported', 'error');
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditText(comment.content);
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditText('');
  };

  const t = translations[lang] || translations.en;

  // Filter comments hierarchy (root vs replies)
  const rootComments = comments.filter(c => !c.parent_id);

  return (
    <div className="page-fade-in">
      {/* Back to feed navigation */}
      <Link 
        href="/" 
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '8px', 
          color: 'var(--text-secondary)', 
          marginBottom: '28px', 
          fontSize: '14px',
          fontWeight: 600,
          textDecoration: 'none',
          transition: 'var(--transition)'
        }}
        className="back-link"
      >
        <AppIcon name="ArrowLeft" size={16} stroke={2.5} /> {t.backToExplore}
      </Link>

      <style jsx>{`
        .back-link:hover {
          color: var(--primary) !important;
          transform: translateX(-4px);
        }
      `}</style>

      {/* Header Info */}
      <div className="post-detail-header-info">
        <DetailThumbnail src={post.thumbnail} alt={post.title} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="post-category" style={{ marginBottom: '8px' }}>{post.category_name}</span>
          <h1 className="post-detail-title">{post.title}</h1>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: 0 }}>{post.summary}</p>
        </div>
        
        <div className="post-detail-header-actions">
          <button
            onClick={handleShare}
            className="share-btn animate-hover"
            title={lang === 'vi' ? 'Chia sẻ liên kết' : 'Share Link'}
            style={{ height: '48px', padding: '0 20px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <AppIcon name="Share2" size={16} stroke={2.5} /> 
            <span>{lang === 'vi' ? 'Chia sẻ' : 'Share'}</span>
          </button>
          
          <a 
            href={post.link} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-primary"
            style={{ padding: '14px 28px', fontSize: '14px', gap: '8px', borderRadius: '12px', height: '48px', display: 'inline-flex', alignItems: 'center' }}
          >
            Website <AppIcon name="ExternalLink" size={16} stroke={2.5} />
          </a>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="post-detail-layout">
        {/* Left Column: Markdown content + Comments */}
        <div>
          {/* Mobile Upvote Bar */}
          <div className="mobile-upvote-bar admin-card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', fontWeight: 700 }}>
                {lang === 'vi' ? 'Bình chọn bài viết' : 'Upvote this post'}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {lang === 'vi' ? 'Đăng nhập để bình chọn cho bài viết này.' : 'Sign in to upvote this article.'}
              </span>
            </div>
            <button 
              className={`upvote-pill-button ${hasUpvoted ? 'upvoted' : ''}`}
              onClick={handleVote}
              disabled={loadingVote}
            >
              <AppIcon name="Heart" size={20} className={hasUpvoted ? 'heart-pulsing' : ''} fill={hasUpvoted ? 'currentColor' : 'none'} />
              <span>{upvotesCount}</span>
            </button>
          </div>

          {/* Post Content */}
          <div className="admin-card post-detail-content-card" style={{ marginBottom: '40px', border: '1px solid var(--border)' }}>
            <div 
              className="markdown-body"
              dangerouslySetInnerHTML={{ __html: htmlContent }} 
            />
          </div>

          {/* Comments Section */}
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <AppIcon name="MessageSquare" size={24} className="text-primary" /> {t.discussion} ({comments.length})
            </h3>

            {/* Comment Form */}
            {loggedIn ? (
              <form onSubmit={handleCommentSubmit} style={{ marginBottom: '36px' }}>
                <div className="form-group">
                  <textarea
                    className="form-input"
                    style={{ minHeight: '100px', padding: '16px', borderRadius: '12px' }}
                    placeholder={t.writeComment}
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    required
                    disabled={loadingComment}
                  ></textarea>
                </div>
                <button 
                  type="submit" 
                  className={`btn btn-primary ${loadingComment ? 'btn-loading' : ''}`}
                  disabled={loadingComment}
                  style={{ float: 'right', padding: '10px 20px', fontSize: '13px' }}
                >
                  {loadingComment ? '' : t.submitComment}
                </button>
                <div style={{ clear: 'both' }}></div>
              </form>
            ) : (
              <div style={{
                padding: '28px',
                textAlign: 'center',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                marginBottom: '36px'
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {t.loginToComment} <Link href="/login" style={{ fontWeight: 700, color: 'var(--primary)' }}>{t.login}</Link>
                </p>
              </div>
            )}

            {/* Comments List with Replies Hierarchy */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {rootComments.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '14px' }}>
                  {lang === 'vi' ? 'Chưa có bình luận nào cho bài viết này. Hãy là người đầu tiên thảo luận!' : 'No comments yet. Start the discussion!'}
                </p>
              ) : (
                rootComments.map(comment => {
                  const replies = comments.filter(c => c.parent_id === comment.id);
                  return (
                    <div key={comment.id} style={{ display: 'flex', flexDirection: 'column' }}>
                      
                      {/* Root Comment bubble */}
                      <div className="comment-bubble">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={comment.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'} 
                          alt={comment.username}
                          width={40}
                          height={40}
                          style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--border)' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>
                                @{comment.username}
                              </span>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }} suppressHydrationWarning>
                                {new Date(comment.created_at).toLocaleDateString('vi-VN', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            {(user?.role === 'admin' || user?.id === comment.user_id) && (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  onClick={() => startEdit(comment)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    padding: '2px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    transition: 'var(--transition)'
                                  }}
                                  title={lang === 'vi' ? 'Sửa bình luận' : 'Edit comment'}
                                >
                                  <AppIcon name="Pencil" size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--destructive)',
                                    cursor: 'pointer',
                                    padding: '2px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    transition: 'var(--transition)'
                                  }}
                                  title={lang === 'vi' ? 'Xóa bình luận' : 'Delete comment'}
                                >
                                  <AppIcon name="Trash2" size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                          {editingCommentId === comment.id ? (
                            <div style={{ marginTop: '8px' }}>
                              <textarea
                                className="form-input"
                                style={{ minHeight: '80px', padding: '12px', fontSize: '14px', borderRadius: '8px', marginBottom: '8px' }}
                                value={editText}
                                onChange={e => setEditText(e.target.value)}
                                disabled={loadingEdit}
                              />
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  className={`btn btn-primary ${loadingEdit ? 'btn-loading' : ''}`}
                                  style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '8px' }}
                                  onClick={() => handleEditComment(comment.id)}
                                  disabled={loadingEdit}
                                >
                                  {loadingEdit ? '' : (lang === 'vi' ? 'Lưu' : 'Save')}
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '8px' }}
                                  onClick={cancelEdit}
                                >
                                  {lang === 'vi' ? 'Hủy' : 'Cancel'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p style={{ margin: 0, fontSize: '14.5px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                              {comment.content}
                            </p>
                          )}

                          {/* Action Reply trigger */}
                          {loggedIn && (
                            <button 
                              className="comment-reply-action"
                              onClick={() => {
                                setReplyingToId(replyingToId === comment.id ? null : comment.id);
                                setReplyText('');
                              }}
                            >
                              {lang === 'vi' ? 'Trả lời' : 'Reply'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Reply Form */}
                      {replyingToId === comment.id && (
                        <div style={{ marginLeft: '36px', marginTop: '12px', padding: '16px', border: '1px solid var(--border)', borderRadius: '12px', backgroundColor: 'var(--surface-hover)' }}>
                          <textarea
                            className="form-input"
                            style={{ minHeight: '80px', padding: '12px', fontSize: '13.5px', borderRadius: '8px', marginBottom: '10px' }}
                            placeholder={lang === 'vi' ? 'Viết câu trả lời của bạn...' : 'Write your reply...'}
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            required
                          />
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button 
                              className={`btn btn-primary ${loadingReply ? 'btn-loading' : ''}`}
                              style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '8px' }}
                              onClick={() => handleReplySubmit(comment.id)}
                              disabled={loadingReply}
                            >
                              {loadingReply ? '' : (lang === 'vi' ? 'Gửi' : 'Send')}
                            </button>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '8px' }}
                              onClick={() => setReplyingToId(null)}
                            >
                              {lang === 'vi' ? 'Hủy' : 'Cancel'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Nested Replies Rendering */}
                      {replies.length > 0 && (
                        <div className="reply-container">
                          {replies.map(reply => (
                            <div key={reply.id} className="comment-bubble-reply">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={reply.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'} 
                                alt={reply.username}
                                width={32}
                                height={32}
                                style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--border)' }}
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>
                                      @{reply.username}
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }} suppressHydrationWarning>
                                      {new Date(reply.created_at).toLocaleDateString('vi-VN', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                  {(user?.role === 'admin' || user?.id === reply.user_id) && (
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      <button
                                        onClick={() => startEdit(reply)}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          color: 'var(--text-secondary)',
                                          cursor: 'pointer',
                                          padding: '2px',
                                          display: 'inline-flex',
                                          alignItems: 'center'
                                        }}
                                        title={lang === 'vi' ? 'Sửa phản hồi' : 'Edit reply'}
                                      >
                                        <AppIcon name="Pencil" size={14} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteComment(reply.id)}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          color: 'var(--destructive)',
                                          cursor: 'pointer',
                                          padding: '2px',
                                          display: 'inline-flex',
                                          alignItems: 'center'
                                        }}
                                        title={lang === 'vi' ? 'Xóa phản hồi' : 'Delete reply'}
                                      >
                                        <AppIcon name="Trash2" size={14} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {editingCommentId === reply.id ? (
                                  <div style={{ marginTop: '6px' }}>
                                    <textarea
                                      className="form-input"
                                      style={{ minHeight: '60px', padding: '10px', fontSize: '13px', borderRadius: '8px', marginBottom: '6px' }}
                                      value={editText}
                                      onChange={e => setEditText(e.target.value)}
                                      disabled={loadingEdit}
                                    />
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      <button
                                        className={`btn btn-primary ${loadingEdit ? 'btn-loading' : ''}`}
                                        style={{ padding: '4px 12px', fontSize: '11px', borderRadius: '6px' }}
                                        onClick={() => handleEditComment(reply.id)}
                                        disabled={loadingEdit}
                                      >
                                        {loadingEdit ? '' : (lang === 'vi' ? 'Lưu' : 'Save')}
                                      </button>
                                      <button
                                        className="btn btn-secondary"
                                        style={{ padding: '4px 12px', fontSize: '11px', borderRadius: '6px' }}
                                        onClick={cancelEdit}
                                      >
                                        {lang === 'vi' ? 'Hủy' : 'Cancel'}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                                    {reply.content}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Upvote panel + Metadata summary */}
        <div>
          {/* Large Heart Upvote Card */}
          <div className="admin-card desktop-upvote-card" style={{ textAlign: 'center', padding: '32px', marginBottom: '24px', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '14px', fontWeight: 700 }}>
              {lang === 'vi' ? 'Yêu thích bài viết này?' : 'Do you like this post?'}
            </p>
            <button 
              className={`upvote-button ${hasUpvoted ? 'upvoted' : ''}`}
              style={{
                width: '100%',
                padding: '24px',
                borderRadius: '16px',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '12px'
              }}
              onClick={handleVote}
              disabled={loadingVote}
            >
              <AppIcon name="Heart" size={36} className={hasUpvoted ? 'heart-pulsing' : ''} fill={hasUpvoted ? 'currentColor' : 'none'} />
              <span style={{ fontSize: '26px', fontWeight: 800 }}>{upvotesCount}</span>
            </button>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '16px', marginBottom: 0 }}>
              {lang === 'vi' ? 'Bình chọn để đưa bài viết lên đầu bảng xếp hạng' : 'Upvote to push this post higher on the community feed'}
            </p>
          </div>

          {/* Product Meta Details */}
          <div className="admin-card" style={{ padding: '24px', border: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t.details}
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AppIcon name="User" size={18} className="text-primary" />
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>{t.postedBy}:</span> <strong style={{ color: 'var(--text)' }}>@{post.username}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AppIcon name="Folder" size={18} className="text-primary" />
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>{t.categories}:</span> <strong style={{ color: 'var(--text)' }}>{post.category_name}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AppIcon name="Calendar" size={18} className="text-primary" />
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>{t.datePosted}:</span> <strong style={{ color: 'var(--text)' }} suppressHydrationWarning>
                    {new Date(post.created_at).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Related Posts (desktop sidebar enrichment) */}
          {relatedPosts.length > 0 && (
            <div className="admin-card related-posts-card" style={{ padding: '24px', marginTop: '24px', border: '1px solid var(--border)' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <AppIcon name="Sparkles" size={18} className="text-primary" fill="var(--primary)" /> {t.relatedPosts}
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 0, marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border)' }}>
                {t.relatedPostsDesc}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {relatedPosts.map(rp => (
                  <Link key={rp.id} href={`/posts/${rp.slug}`} className="related-post-item">
                    <DetailThumbnail src={rp.thumbnail} alt={rp.title} size={56} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="related-post-category">{rp.category_name}</span>
                      <h5 className="related-post-title">{rp.title}</h5>
                      <div className="related-post-meta">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <AppIcon name="Heart" size={12} fill="currentColor" /> {rp.upvotes_count || 0}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <AppIcon name="MessageSquare" size={12} /> {rp.comments_count || 0}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Styles for nested layout spacing grid */}
      <style jsx>{`
        .post-detail-layout {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 32px;
        }

        .post-detail-layout > div {
          min-width: 0;
        }

        @media (max-width: 992px) {
          .post-detail-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
