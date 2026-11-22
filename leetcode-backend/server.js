const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { runCode, canRunLocally, TIER1_LANGUAGES } = require('./runner');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const PORT = process.env.PORT || 5005;
const PROBLEMS_DIR = '/root/leetcode-problems/problems';

let problemsIndex = [];

// Display name mapping for native languages
const LANG_DISPLAY = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  python3: 'Python 3',
  c: 'C',
  cpp: 'C++',
  java: 'Java',
  golang: 'Go',
  rust: 'Rust',
  php: 'PHP',
  ruby: 'Ruby'
};

// Index problems metadata on startup
function indexProblems() {
  try {
    if (!fs.existsSync(PROBLEMS_DIR)) {
      console.error(`Problems directory not found at: ${PROBLEMS_DIR}`);
      return;
    }

    const files = fs.readdirSync(PROBLEMS_DIR).filter(f => f.endsWith('.json'));
    console.log(`Indexing ${files.length} problems...`);

    problemsIndex = [];
    files.forEach(file => {
      try {
        const filePath = path.join(PROBLEMS_DIR, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        problemsIndex.push({
          problem_id: data.problem_id || data.frontend_id,
          title: data.title,
          problem_slug: data.problem_slug,
          difficulty: data.difficulty || 'Easy',
          topics: data.topics || [],
        });
      } catch (err) {
        // Skip malformed files
      }
    });

    problemsIndex.sort((a, b) => {
      const idA = parseInt(a.problem_id) || 999999;
      const idB = parseInt(b.problem_id) || 999999;
      return idA - idB;
    });

    console.log(`Successfully indexed ${problemsIndex.length} problems.`);
  } catch (err) {
    console.error('Error indexing problems:', err);
  }
}

indexProblems();

// Re-index trigger
app.post('/api/problems/reindex', (req, res) => {
  indexProblems();
  res.json({ success: true, count: problemsIndex.length });
});

// GET /api/languages - Native language support info
app.get('/api/languages', (req, res) => {
  const languages = {};
  TIER1_LANGUAGES.forEach(l => {
    languages[l] = { name: LANG_DISPLAY[l] || l, native: true };
  });
  res.json(languages);
});

// GET /api/problems - Paginated list with filtering & search
app.get('/api/problems', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 25;
  const search = (req.query.search || '').toLowerCase();
  const difficulty = req.query.difficulty || '';
  const topic = req.query.topic || '';

  let filtered = [...problemsIndex];

  if (search) {
    filtered = filtered.filter(p => 
      p.title.toLowerCase().includes(search) || 
      p.problem_slug.toLowerCase().includes(search) ||
      p.problem_id.toString().includes(search)
    );
  }

  if (difficulty) {
    filtered = filtered.filter(p => p.difficulty.toLowerCase() === difficulty.toLowerCase());
  }

  if (topic) {
    filtered = filtered.filter(p => 
      p.topics.some(t => t.toLowerCase() === topic.toLowerCase())
    );
  }

  const total = filtered.length;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const items = filtered.slice(startIndex, endIndex);

  const allTopics = [...new Set(problemsIndex.flatMap(p => p.topics))].sort();

  res.json({
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    topics: allTopics
  });
});

// GET /api/problems/:slug/next - Next problem recommendation
app.get('/api/problems/:slug/next', (req, res) => {
  const currentSlug = req.params.slug;
  const currentIndex = problemsIndex.findIndex(p => p.problem_slug === currentSlug);

  if (currentIndex !== -1 && currentIndex + 1 < problemsIndex.length) {
    const nextProb = problemsIndex[currentIndex + 1];
    return res.json({ next_slug: nextProb.problem_slug, next_title: nextProb.title });
  }

  // Wrap around to first problem if at end
  if (problemsIndex.length > 0) {
    return res.json({ next_slug: problemsIndex[0].problem_slug, next_title: problemsIndex[0].title });
  }

  res.status(404).json({ error: 'No next problem found' });
});

// GET /api/problems/:slug - Detail for a single problem
app.get('/api/problems/:slug', (req, res) => {
  const slug = req.params.slug;
  const entry = problemsIndex.find(p => p.problem_slug === slug);
  const filename = entry
    ? `${entry.problem_id.toString().padStart(4, '0')}-${slug}.json`
    : null;

  let filePath = '';
  if (filename) {
    filePath = path.join(PROBLEMS_DIR, filename);
  } else {
    const files = fs.readdirSync(PROBLEMS_DIR);
    const matched = files.find(f => f.endsWith(`-${slug}.json`));
    if (matched) filePath = path.join(PROBLEMS_DIR, matched);
  }

  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: `Problem not found: ${slug}` });
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Error reading problem details' });
  }
});

// POST /api/submissions - Pure Native Code Execution (No AI)
app.post('/api/submissions', async (req, res) => {
  const { lang, code, slug } = req.body;

  if (!lang || !code || !slug) {
    return res.status(400).json({ error: 'Missing required parameters: lang, code, slug' });
  }

  const langLower = lang.toLowerCase();

  // Strictly check if language is supported natively
  if (!canRunLocally(langLower)) {
    return res.status(400).json({
      error: `Language "${lang}" is not configured for native execution on this server.`
    });
  }

  // Load problem details
  const files = fs.readdirSync(PROBLEMS_DIR);
  const matched = files.find(f => f.endsWith(`-${slug}.json`));
  if (!matched) {
    return res.status(404).json({ error: `Problem not found for execution: ${slug}` });
  }

  let problem;
  try {
    problem = JSON.parse(fs.readFileSync(path.join(PROBLEMS_DIR, matched), 'utf-8'));
  } catch (e) {
    return res.status(500).json({ error: 'Error loading problem details for execution' });
  }

  // Load or generate comprehensive test cases
  let testCases = [];
  try {
    const { getOrGenerateTestCases } = require('./testcase-generator');
    testCases = await getOrGenerateTestCases(problem);
  } catch (err) {
    console.error(`Error loading/generating test cases for ${slug}:`, err);
    testCases = problem.examples || [];
  }

  // Execute directly in native sandbox
  const runResult = runCode(langLower, code, problem, testCases);

  res.json({
    runResult,
    executionMode: 'native'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`LeetCode OJ backend running on http://0.0.0.0:${PORT}`);
  console.log(`Native languages supported: ${TIER1_LANGUAGES.join(', ')}`);
});
