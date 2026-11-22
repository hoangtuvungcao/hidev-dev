'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DynamicEditor from '@monaco-editor/react';
import { parseMarkdown } from '@/lib/markdown';

interface Example {
  example_num: number;
  example_text: string;
  images?: string[];
}

interface ProblemDetail {
  title: string;
  problem_id: string;
  difficulty: string;
  problem_slug: string;
  topics: string[];
  description: string;
  examples: Example[];
  constraints: string[];
  hints: string[];
  code_snippets: Record<string, string>;
  solution?: string;
}

interface TestcaseResult {
  status: string;
  passed: boolean;
  input: Record<string, any>;
  actual?: any;
  expected?: any;
  error?: string;
}

interface SubmitResponse {
  runResult: {
    success: boolean;
    status: string;
    error?: string;
    executionTimeMs?: number;
    totalPassed?: number;
    totalCases?: number;
    results?: TestcaseResult[];
  };
  executionMode?: string;
}

interface SubmissionRecord {
  id: string;
  timestamp: string;
  status: string;
  lang: string;
  executionTimeMs?: number;
  code?: string;
}

const MONACO_LANG_MAP: Record<string, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python3: 'python',
  python: 'python',
  cpp: 'cpp',
  c: 'c',
  java: 'java',
  golang: 'go',
  rust: 'rust',
  php: 'php',
  ruby: 'ruby',
};

const NATIVE_LANG_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python3: 'Python 3',
  python: 'Python',
  cpp: 'C++',
  c: 'C',
  java: 'Java',
  golang: 'Go',
  rust: 'Rust',
  php: 'PHP',
  ruby: 'Ruby',
};

const SUPPORTED_LANG_KEYS = [
  'javascript', 'typescript', 'python3', 'python', 'cpp', 'c', 'java', 'golang', 'rust', 'php', 'ruby'
];

const rewriteLeetcodeImages = (html: string, problemSlug: string) => {
  if (!html) return html;
  let rewritten = html;
  // Replace src="Figures/... or src="/Figures/...
  rewritten = rewritten.replace(/src=["']\/?Figures\/([^"']+)["']/g, (match, p1) => {
    return `src="https://leetcode.com/problems/${problemSlug}/Figures/${p1}"`;
  });
  // Also handle any other relative image src like src="/static/... or src="static/...
  rewritten = rewritten.replace(/src=["']\/?static\/([^"']+)["']/g, (match, p1) => {
    return `src="https://leetcode.com/static/${p1}"`;
  });
  return rewritten;
};

const rewriteImgUrl = (url: string, problemSlug: string) => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/Figures/') || url.startsWith('Figures/')) {
    const cleanPath = url.replace(/^\/?Figures\//, '');
    return `https://leetcode.com/problems/${problemSlug}/Figures/${cleanPath}`;
  }
  if (url.startsWith('/static/') || url.startsWith('static/')) {
    const cleanPath = url.replace(/^\/?static\//, '');
    return `https://leetcode.com/static/${cleanPath}`;
  }
  const cleanPath = url.replace(/^\//, '');
  return `https://leetcode.com/problems/${problemSlug}/${cleanPath}`;
};

export default function LeetcodeDetail() {
  const { slug } = useParams();
  const router = useRouter();
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Editor & Panel states
  const [lang, setLang] = useState('javascript');
  const [codeValue, setCodeValue] = useState('');
  const [activeLeftTab, setActiveLeftTab] = useState<'desc' | 'solution' | 'hints' | 'history'>('desc');
  const [activeConsoleTab, setActiveConsoleTab] = useState<'testcase' | 'result'>('testcase');
  const [selectedTestCaseIdx, setSelectedTestCaseIdx] = useState(0);
  const [consoleHeight, setConsoleHeight] = useState(300);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startY = e.clientY;
    const startHeight = consoleHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const newHeight = Math.max(100, Math.min(window.innerHeight - 200, startHeight + deltaY));
      setConsoleHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Execution states
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [nextProblemInfo, setNextProblemInfo] = useState<{ next_slug: string; next_title: string } | null>(null);
  const [submissionHistory, setSubmissionHistory] = useState<SubmissionRecord[]>([]);

  const editorRef = useRef<any>(null);
  const leetcodeUrl = (process.env.NEXT_PUBLIC_LEETCODE_URL || '').replace(/\/$/, '');

  // Available languages from snippet + native support
  const availableLanguages = useMemo(() => {
    if (!problem?.code_snippets) return [];
    const keys = Object.keys(problem.code_snippets);
    return SUPPORTED_LANG_KEYS.filter(l => keys.includes(l));
  }, [problem]);

  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const initialTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' | null;
    if (initialTheme) {
      setThemeMode(initialTheme);
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          const updatedTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' | null;
          if (updatedTheme) {
            setThemeMode(updatedTheme);
          }
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!leetcodeUrl) {
      Promise.resolve().then(() => {
        setError('LeetCode API URL is not configured.');
        setLoading(false);
      });
      return;
    }

    const fetchDetail = async () => {
      try {
        const response = await fetch(`${leetcodeUrl}/api/problems/${slug}`);
        if (!response.ok) {
          throw new Error('Không thể tải chi tiết bài tập.');
        }
        const data = await response.json();
        setProblem(data);

        try {
          localStorage.setItem('leetcode_last_visited', JSON.stringify({
            slug: data.problem_slug,
            title: data.title
          }));
        } catch (e) {}

        // Pick preferred initial language
        const preferred = ['python3', 'python', 'javascript', 'cpp', 'java', 'golang'];
        let initialLang = '';
        for (const p of preferred) {
          if (data.code_snippets && data.code_snippets[p]) {
            initialLang = p;
            break;
          }
        }
        if (!initialLang && data.code_snippets) {
          initialLang = Object.keys(data.code_snippets).find(k => SUPPORTED_LANG_KEYS.includes(k)) || 'javascript';
        }

        setLang(initialLang);

        // Load saved code or template from localStorage first
        const savedCode = localStorage.getItem(`leetcode_code_${slug}_${initialLang}`);
        if (savedCode) {
          setCodeValue(savedCode);
        } else if (data.code_snippets && data.code_snippets[initialLang]) {
          setCodeValue(data.code_snippets[initialLang]);
        }

        // Fetch Next problem info
        try {
          const nextRes = await fetch(`${leetcodeUrl}/api/problems/${slug}/next`);
          if (nextRes.ok) {
            const nextData = await nextRes.json();
            setNextProblemInfo(nextData);
          }
        } catch { }

        // Load history from localStorage first
        let localHist: SubmissionRecord[] = [];
        try {
          const savedHist = localStorage.getItem(`leetcode_hist_${slug}`);
          if (savedHist) {
            localHist = JSON.parse(savedHist);
            setSubmissionHistory(localHist);
          }
        } catch { }

        // Fetch solved slugs, drafts, and submissions from DB
        try {
          const dbRes = await fetch(`/api/leetcode?slug=${slug}`);
          if (dbRes.ok) {
            const dbData = await dbRes.json();

            // Sync drafts from DB into localStorage
            if (dbData.drafts && Array.isArray(dbData.drafts)) {
              dbData.drafts.forEach((draft: { lang: string; code: string }) => {
                const localDraft = localStorage.getItem(`leetcode_code_${slug}_${draft.lang}`);
                if (!localDraft && draft.code) {
                  localStorage.setItem(`leetcode_code_${slug}_${draft.lang}`, draft.code);
                }
              });
            }

            // Reload code draft for current language if DB draft was synchronized
            const finalSavedCode = localStorage.getItem(`leetcode_code_${slug}_${initialLang}`);
            if (finalSavedCode) {
              setCodeValue(finalSavedCode);
            }

            // Sync submissions list
            if (dbData.submissions && Array.isArray(dbData.submissions) && dbData.submissions.length > 0) {
              const combinedHist = [...localHist];
              dbData.submissions.forEach((dbSub: any) => {
                const alreadyExists = combinedHist.some(h =>
                  h.executionTimeMs === dbSub.executionTimeMs &&
                  h.timestamp === dbSub.timestamp &&
                  h.status === dbSub.status
                );
                if (!alreadyExists) {
                  combinedHist.push({
                    id: dbSub.id?.toString() || Math.random().toString(36).substring(2, 9),
                    timestamp: dbSub.timestamp,
                    status: dbSub.status,
                    lang: dbSub.lang,
                    executionTimeMs: dbSub.executionTimeMs,
                    code: dbSub.code
                  });
                }
              });
              setSubmissionHistory(combinedHist);
              localStorage.setItem(`leetcode_hist_${slug}`, JSON.stringify(combinedHist));
            }
          }
        } catch (e) {
          console.error("DB progress sync failed:", e);
        }

      } catch (err: any) {
        setError(err.message || 'Lỗi xảy ra khi tải bài tập.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [slug, leetcodeUrl]);

  // Debounced API call to save code draft to DB
  useEffect(() => {
    if (!codeValue || !slug || !lang) return;

    const timer = setTimeout(async () => {
      try {
        await fetch('/api/leetcode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_draft',
            slug,
            lang,
            code: codeValue
          })
        });
      } catch { }
    }, 1500);

    return () => clearTimeout(timer);
  }, [codeValue, slug, lang]);

  // Handle language switch
  const handleLangChange = (newLang: string) => {
    setLang(newLang);
    const savedCode = localStorage.getItem(`leetcode_code_${slug}_${newLang}`);
    if (savedCode) {
      setCodeValue(savedCode);
    } else if (problem && problem.code_snippets && problem.code_snippets[newLang]) {
      setCodeValue(problem.code_snippets[newLang]);
    } else {
      setCodeValue('');
    }
  };

  // Restore/load code from a past submission
  const handleLoadSubmission = (record: SubmissionRecord) => {
    if (!record.code) {
      alert('Không tìm thấy mã nguồn của bản nộp này.');
      return;
    }
    const confirmMsg = `Bạn có muốn khôi phục mã nguồn của bản nộp này (${NATIVE_LANG_LABELS[record.lang] || record.lang}) vào trình soạn thảo? (Mã nguồn hiện tại của bạn sẽ bị ghi đè)`;
    if (window.confirm(confirmMsg)) {
      if (record.lang && availableLanguages.includes(record.lang)) {
        setLang(record.lang);
        setCodeValue(record.code);
        localStorage.setItem(`leetcode_code_${slug}_${record.lang}`, record.code);
      } else {
        setCodeValue(record.code);
      }
    }
  };

  // Auto-save code on change
  const handleCodeChange = (value: string | undefined) => {
    const val = value || '';
    setCodeValue(val);
    if (slug && lang) {
      localStorage.setItem(`leetcode_code_${slug}_${lang}`, val);
    }
  };

  // Reset to default template
  const handleResetCode = () => {
    if (problem && problem.code_snippets && problem.code_snippets[lang]) {
      const template = problem.code_snippets[lang];
      setCodeValue(template);
      localStorage.setItem(`leetcode_code_${slug}_${lang}`, template);
    }
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeValue);
  };

  // Handle Submit Code
  const handleSubmit = async () => {
    if (!leetcodeUrl || !problem || !codeValue.trim() || submitting) return;
    setSubmitting(true);
    setActiveConsoleTab('result');

    try {
      const response = await fetch(`${leetcodeUrl}/api/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang,
          code: codeValue,
          slug: problem.problem_slug
        })
      });

      if (!response.ok) {
        throw new Error('Lỗi xảy ra khi gửi code lên server.');
      }

      const data: SubmitResponse = await response.json();
      setResult(data);

      const status = data.runResult?.status || 'Error';
      const timeMs = data.runResult?.executionTimeMs;

      // Save submission record locally
      const record: SubmissionRecord = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        status,
        lang,
        executionTimeMs: timeMs,
        code: codeValue
      };

      const newHist = [record, ...submissionHistory].slice(0, 20);
      setSubmissionHistory(newHist);
      localStorage.setItem(`leetcode_hist_${slug}`, JSON.stringify(newHist));

      // Save submission record to DB
      try {
        await fetch('/api/leetcode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'record_submission',
            slug: problem.problem_slug,
            lang,
            status,
            executionTimeMs: timeMs,
            code: codeValue
          })
        });
      } catch (e) {
        console.error("Failed to save submission to DB:", e);
      }

      // If Accepted, save to solved set locally
      if (status === 'Accepted') {
        try {
          const solvedStr = localStorage.getItem('leetcode_solved_slugs');
          const solvedSet = solvedStr ? new Set(JSON.parse(solvedStr)) : new Set();
          solvedSet.add(problem.problem_slug);
          localStorage.setItem('leetcode_solved_slugs', JSON.stringify([...solvedSet]));
        } catch { }
      }

    } catch (err: any) {
      setResult({
        runResult: {
          success: false,
          status: 'Runtime Error',
          error: err.message || 'Không thể kết nối đến máy chủ thực thi.'
        }
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="leetcode-loading-spinner full-page">
        <div className="spinner"></div>
        <span>Đang khởi tạo trình soạn thảo VS Code...</span>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="leetcode-page-container error-state">
        <h2>Lỗi Tải Bài Tập</h2>
        <p>{error || 'Bài tập không tồn tại.'}</p>
        <button onClick={() => router.push('/leetcode')} className="btn btn-primary" style={{ marginTop: '16px' }}>
          Quay lại danh sách bài tập
        </button>
      </div>
    );
  }

  const monacoLang = MONACO_LANG_MAP[lang] || 'javascript';

  return (
    <div className="vscode-ide-layout">
      {/* VS Code IDE Header Toolbar */}
      <div className="vscode-header">
        <div className="vscode-header-left">
          <button onClick={() => router.push('/leetcode')} className="vscode-nav-back">
            Danh sách bài
          </button>
          <div className="vscode-title-block">
            <span className="vscode-problem-num">#{problem.problem_id}</span>
            <span className="vscode-problem-title">{problem.title}</span>
            <span className={`diff-badge diff-${problem.difficulty.toLowerCase()}`}>
              {problem.difficulty}
            </span>
          </div>
        </div>

        <div className="vscode-header-right">
          <select
            value={lang}
            onChange={(e) => handleLangChange(e.target.value)}
            className="vscode-lang-select"
          >
            {availableLanguages.map(l => (
              <option key={l} value={l}>
                {NATIVE_LANG_LABELS[l] || l}
              </option>
            ))}
          </select>

          <button onClick={handleResetCode} className="vscode-btn-secondary" title="Khôi phục code mẫu">
            Reset
          </button>

          <button onClick={handleCopyCode} className="vscode-btn-secondary" title="Sao chép code">
            Copy
          </button>

          <button
            onClick={handleSubmit}
            disabled={submitting || !codeValue.trim()}
            className="vscode-btn-run"
          >
            {submitting ? 'Đang thực thi...' : 'Chạy & Chấm bài'}
          </button>
        </div>
      </div>

      {/* Main IDE Workspace */}
      <div className="vscode-workspace">
        {/* Left Pane: Description / Editorial / Hints / Submissions */}
        <div className="vscode-pane-left">
          <div className="vscode-tabs-header">
            <button
              className={`vscode-tab-item ${activeLeftTab === 'desc' ? 'active' : ''}`}
              onClick={() => setActiveLeftTab('desc')}
            >
              Đề bài
            </button>
            <button
              className={`vscode-tab-item ${activeLeftTab === 'hints' ? 'active' : ''}`}
              onClick={() => setActiveLeftTab('hints')}
            >
              Gợi ý ({problem.hints?.length || 0})
            </button>
            {problem.solution && (
              <button
                className={`vscode-tab-item ${activeLeftTab === 'solution' ? 'active' : ''}`}
                onClick={() => setActiveLeftTab('solution')}
              >
                Lời giải
              </button>
            )}
            <button
              className={`vscode-tab-item ${activeLeftTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveLeftTab('history')}
            >
              Lịch sử ({submissionHistory.length})
            </button>
          </div>

          <div className="vscode-pane-content">
            {activeLeftTab === 'desc' && (
              <div className="vscode-desc-wrapper">
                <div className="vscode-desc-html" dangerouslySetInnerHTML={{ __html: rewriteLeetcodeImages(problem.description, problem.problem_slug) }} />

                <h4 className="vscode-section-heading">Ví dụ mẫu:</h4>
                {problem.examples?.map((ex) => (
                  <div key={ex.example_num} className="vscode-example-card">
                    <div className="vscode-ex-num">Ví dụ {ex.example_num}:</div>
                    <pre className="vscode-ex-pre">{ex.example_text}</pre>
                    {ex.images && ex.images.length > 0 && (
                      <div className="vscode-example-images">
                        {ex.images.map((imgUrl, imgIdx) => (
                          <img
                            key={imgIdx}
                            src={rewriteImgUrl(imgUrl, problem.problem_slug)}
                            alt={`Ví dụ ${ex.example_num}`}
                            className="vscode-ex-img"
                            loading="lazy"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {problem.constraints && problem.constraints.length > 0 && (
                  <div className="vscode-constraints-block">
                    <h4 className="vscode-section-heading">Ràng buộc:</h4>
                    <ul>
                      {problem.constraints.map((c, i) => (
                        <li key={i}><code>{c}</code></li>
                      ))}
                    </ul>
                  </div>
                )}

                {problem.topics && problem.topics.length > 0 && (
                  <div className="vscode-topics-block">
                    <h4 className="vscode-section-heading">Chủ đề:</h4>
                    <div className="problem-tags-list">
                      {problem.topics.map(tag => (
                        <span key={tag} className="topic-tag-item">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeLeftTab === 'hints' && (
              <div className="vscode-hints-wrapper">
                {problem.hints && problem.hints.length > 0 ? (
                  problem.hints.map((hint, idx) => (
                    <div key={idx} className="vscode-hint-card">
                      <div className="vscode-hint-num">Gợi ý {idx + 1}</div>
                      <div className="vscode-hint-body" dangerouslySetInnerHTML={{ __html: rewriteLeetcodeImages(hint, problem.problem_slug) }} />
                    </div>
                  ))
                ) : (
                  <p className="vscode-text-muted">Không có gợi ý nào cho bài tập này.</p>
                )}
              </div>
            )}

            {activeLeftTab === 'solution' && (
              <div className="vscode-solution-wrapper">
                <div
                  className="content-body"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(rewriteLeetcodeImages(problem.solution || '', problem.problem_slug)) }}
                />
              </div>
            )}

            {activeLeftTab === 'history' && (
              <div className="vscode-history-wrapper">
                {submissionHistory.length === 0 ? (
                  <p className="vscode-text-muted">Chưa có lịch sử nộp bài.</p>
                ) : (
                  <table className="vscode-history-table">
                    <thead>
                      <tr>
                        <th>Trạng thái</th>
                        <th>Ngôn ngữ</th>
                        <th>Thời gian chạy</th>
                        <th>Thời điểm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissionHistory.map((item) => (
                        <tr 
                          key={item.id} 
                          onClick={() => handleLoadSubmission(item)}
                          className="vscode-history-row"
                          title="Nhấn để tải mã nguồn này vào trình soạn thảo"
                        >
                          <td>
                            <span className={`status-pill status-${item.status.toLowerCase().replace(/\s+/g, '-')}`}>
                              {item.status}
                            </span>
                          </td>
                          <td>{NATIVE_LANG_LABELS[item.lang] || item.lang}</td>
                          <td>{item.executionTimeMs !== undefined ? `${item.executionTimeMs} ms` : '-'}</td>
                          <td style={{ color: '#888' }}>{item.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Monaco Editor & Console Panel */}
        <div className="vscode-pane-right">
          {/* Top Half: Monaco VS Code Editor */}
          <div className="vscode-editor-container">
            <DynamicEditor
              height="100%"
              language={monacoLang}
              theme={themeMode === 'light' ? 'vs' : 'vs-dark'}
              value={codeValue}
              onChange={handleCodeChange}
              onMount={(editor) => {
                editorRef.current = editor;
              }}
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                wordWrap: 'on',
                formatOnPaste: true,
                padding: { top: 12, bottom: 12 },
                cursorBlinking: 'smooth',
                smoothScrolling: true,
              }}
            />
          </div>

          {/* Draggable Resizer Bar */}
          <div 
            className={`vscode-console-resizer ${isResizing ? 'active' : ''}`} 
            onMouseDown={handleMouseDown}
          />

          {/* Bottom Half: Console & Execution Results */}
          <div className="vscode-console-container" style={{ height: `${consoleHeight}px` }}>
            <div className="vscode-console-header">
              <div className="vscode-console-tabs">
                <button
                  className={`vscode-console-tab-btn ${activeConsoleTab === 'testcase' ? 'active' : ''}`}
                  onClick={() => setActiveConsoleTab('testcase')}
                >
                  Testcase mẫu
                </button>
                <button
                  className={`vscode-console-tab-btn ${activeConsoleTab === 'result' ? 'active' : ''}`}
                  onClick={() => setActiveConsoleTab('result')}
                >
                  Kết quả chấm
                </button>
              </div>

              {/* Next Problem Button when Accepted */}
              {result && result.runResult?.status === 'Accepted' && nextProblemInfo && (
                <button
                  onClick={() => router.push(`/leetcode/${nextProblemInfo.next_slug}`)}
                  className="vscode-btn-next-problem"
                >
                  Bài tiếp theo: {nextProblemInfo.next_title}
                </button>
              )}
            </div>

            <div className="vscode-console-body">
              {activeConsoleTab === 'testcase' && (
                <div className="vscode-testcases-preview">
                  <div className="vscode-testcase-tabs-row">
                    {problem.examples?.map((ex, i) => (
                      <button
                        key={i}
                        className={`vscode-testcase-subtab ${selectedTestCaseIdx === i ? 'active' : ''}`}
                        onClick={() => setSelectedTestCaseIdx(i)}
                      >
                        Case {i + 1}
                      </button>
                    ))}
                  </div>

                  {problem.examples && problem.examples[selectedTestCaseIdx] && (
                    <div className="vscode-testcase-detail-box">
                      <pre>{problem.examples[selectedTestCaseIdx].example_text}</pre>
                    </div>
                  )}
                </div>
              )}

              {activeConsoleTab === 'result' && (
                <div className="vscode-result-view">
                  {!result ? (
                    <div className="vscode-text-muted">{"Nhấn \"Chạy & Chấm bài\" để xem kết quả."}</div>
                  ) : (
                    <>
                      {/* Overall Status Header */}
                      <div className="vscode-result-status-bar">
                        <span className={`vscode-status-title status-${result.runResult?.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                          {result.runResult?.status}
                        </span>

                        {result.runResult?.executionTimeMs !== undefined && (
                          <span className="vscode-metric-badge">
                            Thời gian chạy: <strong>{result.runResult.executionTimeMs} ms</strong>
                          </span>
                        )}

                        {result.runResult?.totalCases !== undefined && (
                          <span className="vscode-metric-badge">
                            Testcases: <strong>{result.runResult.totalPassed} / {result.runResult.totalCases} Passed</strong>
                          </span>
                        )}
                      </div>

                      {/* Compile or Runtime Error Box */}
                      {result.runResult?.error && (
                        <div className="vscode-error-console-box">
                          <pre>{result.runResult.error}</pre>
                        </div>
                      )}

                      {/* Per-Testcase Cards */}
                      {result.runResult?.results && result.runResult.results.length > 0 && (
                        <div className="vscode-testcase-results-list">
                          {result.runResult.results.map((res, i) => (
                            <div key={i} className={`vscode-result-item ${res.passed ? 'passed' : 'failed'}`}>
                              <div className="vscode-result-item-header">
                                <span className="vscode-item-title">Testcase #{i + 1}</span>
                                <span className={`status-pill ${res.passed ? 'passed' : 'failed'}`}>
                                  {res.status}
                                </span>
                              </div>

                              <div className="vscode-result-grid">
                                <div>
                                  <div className="vscode-grid-label">Đầu vào (Input):</div>
                                  <pre className="vscode-code-box">{JSON.stringify(res.input)}</pre>
                                </div>

                                {res.actual !== undefined && (
                                  <div>
                                    <div className="vscode-grid-label">Kết quả thực tế (Output):</div>
                                    <pre className={`vscode-code-box ${res.passed ? 'passed-box' : 'failed-box'}`}>
                                      {JSON.stringify(res.actual)}
                                    </pre>
                                  </div>
                                )}

                                <div>
                                  <div className="vscode-grid-label">Kết quả mong đợi (Expected):</div>
                                  <pre className="vscode-code-box expected-box">{JSON.stringify(res.expected)}</pre>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
