'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Problem {
  problem_id: string;
  title: string;
  problem_slug: string;
  difficulty: string;
  topics: string[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function LeetcodePage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters state
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  // Solved progress tracking
  const [solvedSlugs, setSolvedSlugs] = useState<Set<string>>(new Set());

  const [jumpPage, setJumpPage] = useState('');
  const [lastVisited, setLastVisited] = useState<{ slug: string; title: string } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('leetcode_last_visited');
      if (saved) {
        setLastVisited(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const leetcodeUrl = (process.env.NEXT_PUBLIC_LEETCODE_URL || '').replace(/\/$/, '');

  useEffect(() => {
    let localSet = new Set<string>();
    try {
      const saved = localStorage.getItem('leetcode_solved_slugs');
      if (saved) {
        localSet = new Set(JSON.parse(saved));
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSolvedSlugs(localSet);
      }
    } catch { }

    const syncProgress = async () => {
      try {
        const res = await fetch('/api/leetcode');
        if (res.ok) {
          const data = await res.json();
          if (data.solvedSlugs && Array.isArray(data.solvedSlugs)) {
            const dbSet = new Set<string>(data.solvedSlugs);
            const merged = new Set([...Array.from(localSet), ...data.solvedSlugs]);
            setSolvedSlugs(merged);

            // Sync any missing local solved progress to DB
            for (const slug of Array.from(localSet)) {
              if (!dbSet.has(slug)) {
                await fetch('/api/leetcode', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'record_submission',
                    slug,
                    lang: 'javascript',
                    status: 'Accepted'
                  })
                });
              }
            }
          }
        }
      } catch { }
    };

    syncProgress();
  }, []);

  const fetchProblems = useCallback(async () => {
    if (!leetcodeUrl) {
      setError('LeetCode API URL is not configured.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        search,
        difficulty,
        topic: selectedTopic
      });

      const response = await fetch(`${leetcodeUrl}/api/problems?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch problems from LeetCode backend.');
      }
      const data = await response.json();
      setProblems(data.items || []);
      setPagination(data.pagination || null);
      if (data.topics) {
        setTopics(data.topics);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading problems.');
    } finally {
      setLoading(false);
    }
  }, [page, search, difficulty, selectedTopic, leetcodeUrl]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProblems();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchProblems]);

  // Client-side status filter
  const displayedProblems = problems.filter(p => {
    if (!statusFilter) return true;
    const isSolved = solvedSlugs.has(p.problem_slug);
    if (statusFilter === 'solved') return isSolved;
    if (statusFilter === 'unsolved') return !isSolved;
    return true;
  });

  if (!leetcodeUrl) {
    return (
      <div className="leetcode-page-container error-state">
        <h2>LeetCode Service Offline</h2>
        <p>Thành phần luyện thuật toán chưa được cấu hình biến môi trường NEXT_PUBLIC_LEETCODE_URL.</p>
      </div>
    );
  }

  return (
    <div className="leetcode-page-container">
      <div className="leetcode-header-section">
        <h1 className="leetcode-main-title">Algorithms & Data Structures</h1>
        <p className="leetcode-subtitle">
          Hệ thống luyện tập lập trình thuật toán chuẩn với trình biên dịch đa ngôn ngữ trực tiếp.
        </p>
      </div>

      {lastVisited && (
        <div className="leetcode-resume-box">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#007acc', flexShrink: 0 }}><path d="M8 5v14l11-7z"></path></svg>
          <span className="resume-label">Tiếp tục luyện tập:</span>
          <Link href={`/leetcode/${lastVisited.slug}`} className="resume-link">
            {lastVisited.title}
          </Link>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="leetcode-filters-card">
        <div className="filter-input-group">
          <input
            type="text"
            className="filter-search-input"
            placeholder="Tìm kiếm theo ID hoặc tên bài..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="filter-select-group">
          <select
            className="filter-select"
            value={difficulty}
            onChange={(e) => {
              setDifficulty(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả độ khó</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          <select
            className="filter-select"
            value={selectedTopic}
            onChange={(e) => {
              setSelectedTopic(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả chủ đề</option>
            {topics.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="solved">Đã hoàn thành</option>
            <option value="unsolved">Chưa làm</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="leetcode-error-alert">
          <span>{error}</span>
        </div>
      )}

      {/* Problems List Table */}
      <div className="leetcode-table-wrapper">
        {loading ? (
          <div className="leetcode-loading-spinner">
            <div className="spinner"></div>
            <span>Đang tải danh sách bài tập...</span>
          </div>
        ) : displayedProblems.length === 0 ? (
          <div className="leetcode-empty-state">
            <p>Không tìm thấy bài tập nào khớp với bộ lọc.</p>
          </div>
        ) : (
          <table className="leetcode-problems-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Trạng thái</th>
                <th style={{ width: '70px' }}>ID</th>
                <th>Tên bài tập</th>
                <th style={{ width: '110px' }}>Độ khó</th>
                <th>Chủ đề</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {displayedProblems.map(problem => {
                const isSolved = solvedSlugs.has(problem.problem_slug);
                return (
                  <tr key={problem.problem_id}>
                    <td style={{ textAlign: 'center' }}>
                      {isSolved ? (
                        <span className="status-solved-badge" title="Đã giải thành công">Solved</span>
                      ) : (
                        <span className="status-unsolved-badge" title="Chưa giải">Todo</span>
                      )}
                    </td>
                    <td className="problem-id-col">#{problem.problem_id}</td>
                    <td>
                      <Link href={`/leetcode/${problem.problem_slug}`} className="problem-title-link">
                        {problem.title}
                      </Link>
                    </td>
                    <td>
                      <span className={`diff-badge diff-${problem.difficulty.toLowerCase()}`}>
                        {problem.difficulty}
                      </span>
                    </td>
                    <td>
                      <div className="problem-tags-list">
                        {problem.topics.slice(0, 3).map(tag => (
                          <span key={tag} className="topic-tag-item">{tag}</span>
                        ))}
                        {problem.topics.length > 3 && (
                          <span className="topic-tag-item-more">+{problem.topics.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Link href={`/leetcode/${problem.problem_slug}`} className="btn-solve-now">
                        {isSolved ? 'Luyện lại' : 'Lập trình'}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="leetcode-pagination-bar">
          <button
            className="pag-btn"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Trước
          </button>

          <div className="leetcode-page-numbers">
            {(() => {
              const total = pagination.totalPages;
              const pages = [];
              pages.push(1);
              let start = Math.max(2, page - 1);
              let end = Math.min(total - 1, page + 1);
              if (page <= 3) {
                end = Math.min(total - 1, 4);
              }
              if (page >= total - 2) {
                start = Math.max(2, total - 3);
              }
              if (start > 2) {
                pages.push(-1);
              }
              for (let i = start; i <= end; i++) {
                pages.push(i);
              }
              if (end < total - 1) {
                pages.push(-2);
              }
              if (total > 1) {
                pages.push(total);
              }

              return pages.map((p, idx) => {
                if (p < 0) {
                  return <span key={`ellipsis-${idx}`} className="pag-ellipsis">...</span>;
                }
                return (
                  <button
                    key={`page-${p}`}
                    className={`pag-num-btn ${p === page ? 'active' : ''}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                );
              });
            })()}
          </div>

          <button
            className="pag-btn"
            disabled={page === pagination.totalPages}
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
          >
            Sau
          </button>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const p = parseInt(jumpPage);
              if (p && p >= 1 && p <= pagination.totalPages) {
                setPage(p);
                setJumpPage('');
              }
            }}
            className="leetcode-jump-form"
          >
            <span className="jump-label">Đi đến:</span>
            <input
              type="number"
              min="1"
              max={pagination.totalPages}
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              placeholder="..."
              className="leetcode-jump-input"
            />
            <button type="submit" className="leetcode-jump-btn">Đi</button>
          </form>
        </div>
      )}
    </div>
  );
}
