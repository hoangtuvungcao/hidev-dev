const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TEMP_DIR = '/tmp/leetcode_run';
const TIMEOUT_MS = 8000;

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}
try { fs.chmodSync(TEMP_DIR, 0o777); } catch (e) { }

function parseInputKeyValues(inputStr) {
  const inputs = {};
  let bracketDepth = 0;
  let inString = false;
  let stringChar = '';
  let currentKey = '';
  let currentValue = '';
  let mode = 'key';

  for (let i = 0; i < inputStr.length; i++) {
    const char = inputStr[i];
    const prevChar = i > 0 ? inputStr[i - 1] : '';

    // Track string literals — don't count brackets/delimiters inside strings
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }

    if (!inString) {
      if (char === '[' || char === '{' || char === '(') bracketDepth++;
      else if (char === ']' || char === '}' || char === ')') bracketDepth--;
    }

    if (!inString && bracketDepth === 0 && char === ',' && mode === 'value') {
      const key = currentKey.trim();
      const valStr = currentValue.trim();
      if (key && valStr) {
        try { inputs[key] = JSON.parse(valStr); } catch (e) {
          try { inputs[key] = eval(`(${valStr})`); } catch (err) { inputs[key] = valStr; }
        }
      }
      currentKey = ''; currentValue = ''; mode = 'key';
    } else if (!inString && bracketDepth === 0 && char === '=' && mode === 'key') {
      mode = 'value';
    } else {
      if (mode === 'key') currentKey += char;
      else currentValue += char;
    }
  }
  // Flush last key-value pair
  if (currentKey.trim() && currentValue.trim()) {
    const key = currentKey.trim();
    const valStr = currentValue.trim();
    try { inputs[key] = JSON.parse(valStr); } catch (e) {
      try { inputs[key] = eval(`(${valStr})`); } catch (err) { inputs[key] = valStr; }
    }
  }

  return inputs;
}

// Split a raw input string into positional values, respecting brackets and quotes
function splitPositionalValues(inputStr) {
  const values = [];
  let bracketDepth = 0;
  let inString = false;
  let stringChar = '';
  let current = '';

  for (let i = 0; i < inputStr.length; i++) {
    const char = inputStr[i];
    const prevChar = i > 0 ? inputStr[i - 1] : '';

    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }

    if (!inString) {
      if (char === '[' || char === '{' || char === '(') bracketDepth++;
      else if (char === ']' || char === '}' || char === ')') bracketDepth--;
    }

    if (!inString && bracketDepth === 0 && char === ',') {
      if (current.trim()) values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) values.push(current.trim());
  return values;
}

function parseValue(valStr) {
  try { return JSON.parse(valStr); } catch (e) {
    try { return eval(`(${valStr})`); } catch (err) { return valStr; }
  }
}

function parseExample(exampleText) {
  const lines = exampleText.split('\n');
  let inputStr = '';
  let outputStr = '';
  for (const line of lines) {
    if (line.toLowerCase().startsWith('input:')) {
      inputStr = line.substring(6).trim();
    } else if (line.toLowerCase().startsWith('output:')) {
      outputStr = line.substring(7).trim();
    }
  }

  // Try key=value parsing first (e.g. "s = \"42\", target = 5")
  const inputs = parseInputKeyValues(inputStr);

  let expectedOutput = parseValue(outputStr);

  // Store raw inputStr so we can re-parse later if inputs is empty
  return { inputs, expectedOutput, _rawInputStr: inputStr };
}

// Extract parameter names from code snippets (e.g., "def myAtoi(self, s: str)" -> ["s"])
function extractParamNamesFromSnippets(problem, lang) {
  if (!problem || !problem.code_snippets) return [];

  // ĐÃ SỬA: Hàm phụ trợ để split parameters mà không bị lỗi bởi dấu phẩy trong generics
  function splitParams(paramStr) {
    const params = [];
    let current = '';
    let depth = 0;

    for (let i = 0; i < paramStr.length; i++) {
      const char = paramStr[i];
      if (char === '<' || char === '[' || char === '(' || char === '{') depth++;
      else if (char === '>' || char === ']' || char === ')' || char === '}') depth--;
      else if (char === ',' && depth === 0) {
        if (current.trim()) params.push(current.trim());
        current = '';
        continue;
      }
      current += char;
    }
    if (current.trim()) params.push(current.trim());
    return params;
  }

  // Prefer the snippet matching the user's language, then python3, then any
  const langOrder = [lang, 'python3', 'python', 'javascript', 'typescript', 'java', 'cpp', 'c', 'golang', 'rust'];
  for (const lk of langOrder) {
    const snippet = problem.code_snippets[lk];
    if (!snippet) continue;

    const cleanedSnippet = cleanCodeForExtraction(snippet);

    if (lk === 'python3' || lk === 'python') {
      const pyMatch = cleanedSnippet.match(/def\s+[a-zA-Z0-9_]+\s*\(self\s*,?\s*([^)]+)\)/);
      if (pyMatch) {
        const params = splitParams(pyMatch[1]).map(p => p.trim().split(/[:\s=]/)[0].trim()).filter(Boolean);
        if (params.length > 0) return params;
      }
    }

    if (lk === 'java') {
      const javaMatch = cleanedSnippet.match(/(?:public\s+)?\S+\s+[a-zA-Z0-9_]+\s*\(([^)]*)\)/);
      if (javaMatch && javaMatch[1].trim()) {
        const params = splitParams(javaMatch[1]).map(p => {
          const parts = p.trim().split(/\s+/);
          return parts.length >= 2 ? parts[parts.length - 1].replace(/[\[\]&*]/g, '') : '';
        }).filter(Boolean);
        if (params.length > 0) return params;
      }
    }

    if (lk === 'cpp' || lk === 'c') {
      const cMatch = cleanedSnippet.match(/(?:int|char|void|double|float|long|bool|string|ListNode|TreeNode|vector)[^(]*\(([^)]*)\)/);
      if (cMatch && cMatch[1].trim()) {
        const params = splitParams(cMatch[1]).map(p => {
          const parts = p.trim().split(/\s+/);
          return parts.length >= 2 ? parts[parts.length - 1].replace(/[\[\]&*]/g, '') : '';
        }).filter(Boolean);
        if (params.length > 0) return params;
      }
    }

    if (lk === 'javascript' || lk === 'typescript') {
      const jsMatch = cleanedSnippet.match(/(?:function\s+)?[a-zA-Z0-9_]+\s*(?:=\s*function)?\s*\(([^)]*)\)/);
      if (jsMatch && jsMatch[1].trim()) {
        const params = splitParams(jsMatch[1]).map(p => p.trim().split(/[:\s=]/)[0].trim()).filter(Boolean);
        if (params.length > 0) return params;
      }
    }

    if (lk === 'golang') {
      const goMatch = cleanedSnippet.match(/func\s+[a-zA-Z0-9_]+\s*\(([^)]*)\)/);
      if (goMatch && goMatch[1].trim()) {
        const params = splitParams(goMatch[1]).map(p => p.trim().split(/\s+/)[0]).filter(Boolean);
        if (params.length > 0) return params;
      }
    }

    if (lk === 'rust') {
      const rustMatch = cleanedSnippet.match(/pub\s+fn\s+[a-zA-Z0-9_]+\s*\(([^)]*)\)/);
      if (rustMatch && rustMatch[1].trim()) {
        const params = splitParams(rustMatch[1]).map(p => p.trim().split(/[:\s=]/)[0].trim()).filter(Boolean);
        if (params.length > 0) return params;
      }
    }
  }

  return [];
}

// When parseExample returns empty inputs but raw inputStr has data,
// try to map positional values to param names from code snippets
function enrichParsedExamples(parsedExamples, problem, lang) {
  return parsedExamples.map(ex => {
    // If inputs already has keys, it parsed OK
    if (Object.keys(ex.inputs).length > 0) return ex;

    // If raw input string is empty/missing, nothing to do
    const rawStr = ex._rawInputStr;
    if (!rawStr || !rawStr.trim()) return ex;

    // Extract param names from code snippets
    const paramNames = extractParamNamesFromSnippets(problem, lang);

    // Split the raw input string into positional values
    const positionalValues = splitPositionalValues(rawStr);

    if (positionalValues.length === 0) return ex;

    const enrichedInputs = {};

    if (paramNames.length > 0) {
      // Map positional values to param names
      for (let i = 0; i < positionalValues.length && i < paramNames.length; i++) {
        enrichedInputs[paramNames[i]] = parseValue(positionalValues[i]);
      }
    } else {
      // No param names available — use generic names (arg0, arg1, ...)
      for (let i = 0; i < positionalValues.length; i++) {
        enrichedInputs[`arg${i}`] = parseValue(positionalValues[i]);
      }
    }

    return { inputs: enrichedInputs, expectedOutput: ex.expectedOutput };
  });
}

function getParamTypes(problem, lang) {
  const paramNames = extractParamNamesFromSnippets(problem, lang);
  if (paramNames.length === 0) return [];

  const snippet = problem.code_snippets?.[lang] || '';
  const methodName = extractMethodName(problem, lang, '');

  const jsDocTypes = {};
  paramNames.forEach(pname => {
    const jsDocRegex = new RegExp(`@param\\s+\\{?([^}\\n]+)\\}?\\s+${pname}\\b`, 'i');
    const match = snippet.match(jsDocRegex);
    if (match) {
      const typeStr = match[1].trim();
      if (typeStr.includes('ListNode[]') || typeStr.includes('vector<ListNode') || typeStr.includes('List[ListNode]') || typeStr.includes('ListNode**')) {
        jsDocTypes[pname] = 'ListNode[]';
      } else if (typeStr.includes('TreeNode[]') || typeStr.includes('vector<TreeNode') || typeStr.includes('List<TreeNode>')) {
        jsDocTypes[pname] = 'TreeNode[]';
      } else if (typeStr.includes('ListNode')) {
        jsDocTypes[pname] = 'ListNode';
      } else if (typeStr.includes('TreeNode')) {
        jsDocTypes[pname] = 'TreeNode';
      }
    }
  });

  const sigTypes = {};
  if (methodName) {
    let searchMethodName = methodName;
    if (lang === 'rust' || lang === 'ruby') {
      searchMethodName = methodName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    }
    const sigRegex = new RegExp(`${searchMethodName}\\s*\\(([^)]*)\\)`, 'm');
    const match = snippet.match(sigRegex);
    if (match) {
      const paramsListStr = match[1];
      const params = [];
      let currentParam = '';
      let depth = 0;
      for (let i = 0; i < paramsListStr.length; i++) {
        const char = paramsListStr[i];
        if (char === '<' || char === '[' || char === '(') depth++;
        if (char === '>' || char === ']' || char === ')') depth--;
        if (char === ',' && depth === 0) {
          params.push(currentParam.trim());
          currentParam = '';
        } else {
          currentParam += char;
        }
      }
      if (currentParam.trim()) {
        params.push(currentParam.trim());
      }

      paramNames.forEach(pname => {
        const paramDecl = params.find(p => new RegExp(`\\b${pname}\\b`).test(p));
        if (paramDecl) {
          if (paramDecl.includes('ListNode[]') ||
            paramDecl.includes('vector<ListNode') ||
            paramDecl.includes('List[ListNode]') ||
            paramDecl.includes('List[Optional[ListNode]]') ||
            paramDecl.includes('List<ListNode>') ||
            paramDecl.includes('ListNode**')) {
            sigTypes[pname] = 'ListNode[]';
          } else if (paramDecl.includes('TreeNode[]') ||
            paramDecl.includes('vector<TreeNode') ||
            paramDecl.includes('List[TreeNode]') ||
            paramDecl.includes('List<TreeNode>')) {
            sigTypes[pname] = 'TreeNode[]';
          } else if (paramDecl.includes('ListNode') || paramDecl.includes('listnode')) {
            sigTypes[pname] = 'ListNode';
          } else if (paramDecl.includes('TreeNode') || paramDecl.includes('treenode')) {
            sigTypes[pname] = 'TreeNode';
          } else if (paramDecl.includes('string[]') ||
            paramDecl.includes('String[]') ||
            paramDecl.includes('vector<string>') ||
            paramDecl.includes('vector<String>') ||
            paramDecl.includes('List<String>') ||
            paramDecl.includes('List<string>')) {
            sigTypes[pname] = 'string[]';
          } else if (paramDecl.includes('double[]') ||
            paramDecl.includes('vector<double>') ||
            paramDecl.includes('List<Double>')) {
            sigTypes[pname] = 'double[]';
          } else if (paramDecl.includes('char[]') ||
            paramDecl.includes('vector<char>') ||
            paramDecl.includes('char*') ||
            paramDecl.includes('List<Character>')) {
            sigTypes[pname] = 'char[]';
          } else if (paramDecl.includes('vector<vector') ||
            paramDecl.includes('List<List') ||
            paramDecl.includes('int[][]') ||
            paramDecl.includes('Integer[][]')) {
            sigTypes[pname] = 'int[][]';
          }
        }
      });
    }
  }

  return paramNames.map(pname => {
    return sigTypes[pname] || jsDocTypes[pname] || 'other';
  });
}

function isVoidFunction(problem) {
  if (!problem || !problem.code_snippets) return false;

  const methodName = extractMethodName(problem, 'javascript', '');
  if (!methodName) return false;

  const cppSnippet = cleanCodeForExtraction(problem.code_snippets.cpp || '');
  const javaSnippet = cleanCodeForExtraction(problem.code_snippets.java || '');
  const python3Snippet = cleanCodeForExtraction(problem.code_snippets.python3 || '');
  const tsSnippet = cleanCodeForExtraction(problem.code_snippets.typescript || '');
  const goSnippet = cleanCodeForExtraction(problem.code_snippets.golang || '');
  const rustSnippet = cleanCodeForExtraction(problem.code_snippets.rust || '');
  const cSnippet = cleanCodeForExtraction(problem.code_snippets.c || '');

  if (new RegExp(`\\bvoid\\s+${methodName}\\b`).test(cppSnippet) ||
    new RegExp(`\\bvoid\\s+${methodName}\\b`).test(javaSnippet) ||
    new RegExp(`\\bvoid\\s+${methodName}\\b`).test(cSnippet)) {
    return true;
  }

  if (new RegExp(`\\b${methodName}\\s*\\([^)]*\\)\\s*:\\s*void\\b`).test(tsSnippet)) {
    return true;
  }

  if (new RegExp(`\\b${methodName}\\s*\\([^)]*\\)\\s*->\\s*None\\b`).test(python3Snippet)) {
    return true;
  }

  if (new RegExp(`func\\s+${methodName}\\s*\\([^)]*\\)\\s*\\{`).test(goSnippet)) {
    return true;
  }

  const rustMatch = rustSnippet.match(new RegExp(`fn\\s+${methodName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')}\\s*[^{]*\\{`));
  if (rustMatch && !rustMatch[0].includes('->')) {
    return true;
  }

  return false;
}

// ĐÃ SỬA: Hàm tìm tham số có khả năng được sửa đổi bởi void function
function findVoidOutputParam(paramNames, paramTypes) {
  // Tìm tham số có tên gợi ý là output parameter
  const outputKeywords = ['result', 'output', 'res', 'out', 'ret', 'return', 'ans', 'answer', 'matrix', 'grid', 'board', 'nums', 'arr', 'array', 'list', 'str', 'string'];
  
  for (let i = 0; i < paramNames.length; i++) {
    const pname = paramNames[i].toLowerCase();
    const ptype = paramTypes[i] || 'other';
    
    // Ưu tiên tham số có cấu trúc dữ liệu phức tạp
    if (ptype === 'ListNode' || ptype === 'TreeNode' || ptype === 'ListNode[]' || ptype === 'TreeNode[]' || ptype === 'int[][]') {
      return i;
    }
    
    // Tìm tham số có từ khóa output
    for (const keyword of outputKeywords) {
      if (pname.includes(keyword)) {
        return i;
      }
    }
  }
  
  // Mặc định trả về tham số đầu tiên nếu không tìm thấy
  return 0;
}

function isEqual(actual, expected, preserveOrder = false) {
  if (actual === expected) return true;

  // Normalize empty array vs null (commonly used for empty ListNode/TreeNode)
  if ((actual === null && Array.isArray(expected) && expected.length === 0) ||
    (expected === null && Array.isArray(actual) && actual.length === 0)) {
    return true;
  }

  if (typeof actual === 'number' && typeof expected === 'number') {
    return Math.abs(actual - expected) < 1e-5;
  }
  try {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr === expectedStr) return true;

    if (Array.isArray(actual) && Array.isArray(expected)) {
      if (actual.length !== expected.length) return false;
      if (preserveOrder) return false;

      // For 2D arrays (like subsets), sort the outer array elements, but keep inner array order!
      if (actual.length > 0 && Array.isArray(actual[0]) && Array.isArray(expected[0])) {
        const actSorted = actual.map(x => JSON.stringify(x)).sort();
        const expSorted = expected.map(x => JSON.stringify(x)).sort();
        if (JSON.stringify(actSorted) === JSON.stringify(expSorted)) return true;
      } else {
        // For 1D arrays where order doesn't matter (if not preserving order)
        const actSorted = [...actual].sort();
        const expSorted = [...expected].sort();
        if (JSON.stringify(actSorted) === JSON.stringify(expSorted)) return true;
      }
    }
  } catch (e) { }
  return false;
}

const TIER1_LANGUAGES = [
  'javascript', 'typescript', 'python', 'python3',
  'c', 'cpp', 'java', 'golang',
  'rust', 'php', 'ruby'
];

function canRunLocally(lang) {
  return TIER1_LANGUAGES.includes(lang.toLowerCase());
}

function slugToCamel(slug) {
  return slug.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

function cleanCodeForExtraction(code) {
  if (!code) return '';
  return code.split('\n')
    .map(line => line.trim())
    // Ignore lines that look like comments
    .filter(line => !line.startsWith('#') && !line.startsWith('//') && !line.startsWith('*') && !line.startsWith('/*'))
    .join('\n');
}

function extractMethodName(problem, lang, userCode) {
  // Regex quét các kiểu trả về phổ biến của C/C++ để lấy ra tên hàm
  const cStyleRegex = /(?:int|char|void|double|float|long|bool|ListNode|TreeNode|vector)\s*\*?\s*([a-zA-Z0-9_]+)\s*\(/;

  const matchMethod = (snippet) => {
    const cleaned = cleanCodeForExtraction(snippet);
    const match = cleaned.match(/def\s+([a-zA-Z0-9_]+)\s*\(/) ||
      cleaned.match(/function\s+([a-zA-Z0-9_]+)\s*\(/) ||
      cleaned.match(/var\s+([a-zA-Z0-9_]+)\s*=\s*function/) ||
      cleaned.match(/const\s+([a-zA-Z0-9_]+)\s*=\s*function/) ||
      cleaned.match(/func\s+([a-zA-Z0-9_]+)\s*\(/) ||
      cleaned.match(cStyleRegex);
    if (match && match[1] !== '__init__') return match[1];
    return null;
  };

  if (problem && problem.code_snippets) {
    const pySnippet = problem.code_snippets.python3 || problem.code_snippets.python;
    if (pySnippet) {
      const name = matchMethod(pySnippet);
      if (name) return name;
    }
    for (const key in problem.code_snippets) {
      const name = matchMethod(problem.code_snippets[key]);
      if (name) return name;
    }
  }

  if (userCode) {
    const name = matchMethod(userCode);
    if (name) return name;
  }

  return slugToCamel(problem.problem_slug);
}

function slugToSnake(slug) {
  return slug.replace(/-/g, '_');
}

function generateJSWrapper(code, methodName, parsedExamples, problem) {
  const isList = Object.values(problem?.code_snippets || {}).some(s => s.includes('ListNode')) || code.includes('ListNode');
  const isTree = Object.values(problem?.code_snippets || {}).some(s => s.includes('TreeNode')) || code.includes('TreeNode');
  const paramTypes = getParamTypes(problem, 'javascript');

  const cleanedCode = cleanCodeForExtraction(code);
  const hasListNode = cleanedCode.includes('class ListNode') || cleanedCode.includes('function ListNode');
  const hasTreeNode = cleanedCode.includes('class TreeNode') || cleanedCode.includes('function TreeNode');

  let helpers = `
${(isList && !hasListNode) ? `
class ListNode {
  constructor(val, next) {
    this.val = (val===undefined ? 0 : val)
    this.next = (next===undefined ? null : next)
  }
}
` : ''}

${(isTree && !hasTreeNode) ? `
class TreeNode {
  constructor(val, left, right) {
    this.val = (val===undefined ? 0 : val)
    this.left = (left===undefined ? null : left)
    this.right = (right===undefined ? null : right)
  }
}
` : ''}

function toListNode(arr) {
  if (!Array.isArray(arr)) return arr;
  let dummy = new ListNode(0);
  let curr = dummy;
  for (let val of arr) {
    curr.next = new ListNode(val);
    curr = curr.next;
  }
  return dummy.next;
}

function fromListNode(node) {
  if (!node || node.constructor.name !== 'ListNode') return node;
  let res = [];
  let curr = node;
  while (curr) {
    res.push(curr.val);
    curr = curr.next;
  }
  return res;
}

function toTreeNode(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  let nodes = arr.map(val => val === null ? null : new TreeNode(val));
  let kids = [...nodes].reverse();
  let root = kids.pop();
  for (let node of nodes) {
    if (node) {
      if (kids.length) node.left = kids.pop();
      if (kids.length) node.right = kids.pop();
    }
  }
  return root;
}

function fromTreeNode(root) {
  if (!root) return [];
  let res = [];
  let queue = [root];
  while (queue.length > 0) {
    let node = queue.shift();
    if (node) {
      res.push(node.val);
      queue.push(node.left);
      queue.push(node.right);
    } else {
      res.push(null);
    }
  }
  while (res.length > 0 && res[res.length - 1] === null) {
    res.pop();
  }
  return res;
}

function preprocessArg(arg, paramType) {
  if (paramType === 'ListNode') {
    return toListNode(arg);
  } else if (paramType === 'ListNode[]') {
    if (Array.isArray(arg)) {
      return arg.map(toListNode);
    }
    return arg;
  } else if (paramType === 'TreeNode') {
    return toTreeNode(arg);
  } else if (paramType === 'TreeNode[]') {
    if (Array.isArray(arg)) {
      return arg.map(toTreeNode);
    }
    return arg;
  }
  return arg;
}

function postprocessResult(res, returnType) {
  if (returnType === 'ListNode' && res && res.constructor.name === 'ListNode') {
    return fromListNode(res);
  }
  if (returnType === 'TreeNode' && res && res.constructor.name === 'TreeNode') {
    return fromTreeNode(res);
  }
  if (Array.isArray(res)) {
    return res.map(x => postprocessResult(x, returnType));
  }
  return res;
}
`;

  const isVoid = isVoidFunction(problem);
  const paramNames = Object.keys(parsedExamples[0]?.inputs || {});
  const voidOutputIndex = isVoid ? findVoidOutputParam(paramNames, paramTypes) : 0;

  let testCalls = '';
  parsedExamples.forEach((ex, idx) => {
    const rawArgs = Object.values(ex.inputs);

    testCalls += `
try {
  let fn;
  if (typeof Solution !== 'undefined') {
    const sol = new Solution();
    fn = sol.${methodName}.bind(sol);
  } else if (typeof ${methodName} !== 'undefined') {
    fn = ${methodName};
  } else {
    throw new Error("Function ${methodName} is not defined");
  }

  const rawArgs = ${JSON.stringify(rawArgs)};
  const paramTypes = ${JSON.stringify(paramTypes)};
  const processedArgs = rawArgs.map((arg, i) => preprocessArg(arg, paramTypes[i]));
  const out = fn(...processedArgs);
  const finalOut = ${isVoid ? `postprocessResult(processedArgs[${voidOutputIndex}], paramTypes[${voidOutputIndex}] || 'other')` : "postprocessResult(out, " + (isList ? "'ListNode'" : (isTree ? "'TreeNode'" : "'other'")) + ")"};
  console.log("TEST_CASE_${idx}_RESULT:" + JSON.stringify(finalOut));
} catch(e) {
  console.log("TEST_CASE_${idx}_ERROR:" + e.message);
}
`;
  });

  return `${helpers}\n${code}\n${testCalls}`;
}

function generatePythonWrapper(code, methodName, parsedExamples, problem) {
  const isList = Object.values(problem?.code_snippets || {}).some(s => s.includes('ListNode')) || code.includes('ListNode');
  const isTree = Object.values(problem?.code_snippets || {}).some(s => s.includes('TreeNode')) || code.includes('TreeNode');
  const paramTypes = getParamTypes(problem, 'python3');

  let helpers = `
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def to_list_node(arr):
    if not arr or not isinstance(arr, list):
        return None
    dummy = ListNode(0)
    curr = dummy
    for val in arr:
        curr.next = ListNode(val)
        curr = curr.next
    return dummy.next

def from_list_node(node):
    if not (node is not None and node.__class__.__name__ == 'ListNode'):
        return node
    res = []
    curr = node
    while curr:
        res.append(curr.val)
        curr = curr.next
    return res

def to_tree_node(arr):
    if not arr or not isinstance(arr, list):
        return None
    nodes = [None if val is None else TreeNode(val) for val in arr]
    kids = nodes[::-1]
    root = kids.pop() if kids else None
    for node in nodes:
        if node:
            if kids: node.left = kids.pop()
            if kids: node.right = kids.pop()
    return root

def from_tree_node(root):
    if not root:
        return []
    res = []
    queue = [root]
    while queue:
        node = queue.pop(0)
        if node:
            res.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
        else:
            res.append(None)
    while res and res[-1] is None:
        res.pop()
    return res

def preprocess_arg(arg, param_type):
    if param_type == 'ListNode':
        return to_list_node(arg)
    elif param_type == 'ListNode[]':
        if isinstance(arg, list):
            return [to_list_node(x) for x in arg]
        return arg
    elif param_type == 'TreeNode':
        return to_tree_node(arg)
    elif param_type == 'TreeNode[]':
        if isinstance(arg, list):
            return [to_tree_node(x) for x in arg]
        return arg
    return arg

def postprocess_result(res, return_type):
    if return_type == 'ListNode' and res is not None and res.__class__.__name__ == 'ListNode':
        return from_list_node(res)
    if return_type == 'TreeNode' and res is not None and res.__class__.__name__ == 'TreeNode':
        return from_tree_node(res)
    if isinstance(res, list):
        return [postprocess_result(x, return_type) for x in res]
    return res
`;

  const isVoid = isVoidFunction(problem);
  const paramNames = Object.keys(parsedExamples[0]?.inputs || {});
  const voidOutputIndex = isVoid ? findVoidOutputParam(paramNames, paramTypes) : 0;

  let testCalls = '';
  parsedExamples.forEach((ex, idx) => {
    const rawArgs = Object.values(ex.inputs).map(v => JSON.stringify(v));

    testCalls += `
try:
    sol = Solution()
    param_types = ${JSON.stringify(paramTypes)}
    raw_args = [json.loads(x) for x in ${JSON.stringify(rawArgs)}]
    processed_args = [preprocess_arg(raw_args[i], param_types[i] if i < len(param_types) else 'other') for i in range(len(raw_args))]
    out = sol.${methodName}(*processed_args)
    final_out = ${isVoid ? `postprocess_result(processed_args[${voidOutputIndex}], param_types[${voidOutputIndex}] if len(param_types) > ${voidOutputIndex} else 'other')` : "postprocess_result(out, " + (isList ? "'ListNode'" : (isTree ? "'TreeNode'" : "'other'")) + ")"}
    print("TEST_CASE_${idx}_RESULT:" + json.dumps(final_out))
except Exception as e:
    print("TEST_CASE_${idx}_ERROR:" + str(e))
`;
  });

  return `import json\nfrom typing import *\n\n${helpers}\n\n${code}\n\n${testCalls}`;
}

function extractCReturnType(code, methodName) {
  const regex = new RegExp(`([a-zA-Z0-9_*\\s]+)\\s+${methodName}\\s*\\(`);
  const match = code.match(regex);
  if (match) {
    return match[1].trim();
  }
  return 'int';
}

// function generateCWrapper(code, methodName, parsedExamples) {
//   const returnType = extractCReturnType(code, methodName);

//   let testCalls = '';
//   parsedExamples.forEach((ex, idx) => {
//     const inputs = Object.values(ex.inputs);
//     let argDecls = '';
//     let argNames = [];
//     const paramNames = Object.keys(ex.inputs);

//     paramNames.forEach((pname, pi) => {
//       const val = inputs[pi];
//       if (Array.isArray(val)) {
//         argDecls += `    int ${pname}_arr_${idx}[] = {${val.join(',')}};\n`;
//         argDecls += `    int* ${pname}_${idx} = ${pname}_arr_${idx};\n`;
//         argNames.push(`${pname}_${idx}`);
//         const hasSizeParam = code.toLowerCase().includes(`${pname.toLowerCase()}size`);
//         if (hasSizeParam) {
//           argDecls += `    int ${pname}Size_${idx} = ${val.length};\n`;
//           argNames.push(`${pname}Size_${idx}`);
//         }
//       } else if (typeof val === 'string') {
//         argDecls += `    char* ${pname}_${idx} = "${val}";\n`;
//         argNames.push(`${pname}_${idx}`);
//       } else {
//         argDecls += `    int ${pname}_${idx} = ${val};\n`;
//         argNames.push(`${pname}_${idx}`);
//       }
//     });

//     const hasReturnSize = code.includes('returnSize') || code.includes('return_size');
//     if (hasReturnSize) {
//       argDecls += `    int returnSizeVal_${idx} = 0;\n`;
//       argDecls += `    int* returnSize_${idx} = &returnSizeVal_${idx};\n`;
//       argNames.push(`returnSize_${idx}`);
//     }

//     if (returnType.trim() === 'void') {
//       const firstParamVal = inputs[0];
//       if (Array.isArray(firstParamVal)) {
//         testCalls += `
//   {
// ${argDecls}    ${methodName}(${argNames.join(', ')});
//     printf("TEST_CASE_${idx}_RESULT:[");
//     for (int i = 0; i < ${firstParamVal.length}; i++) {
//       printf("%d", ${argNames[0]}[i]);
//       if (i < ${firstParamVal.length} - 1) printf(",");
//     }
//     printf("]\\n");
//   }
// `;
//       } else {
//         testCalls += `
//   {
// ${argDecls}    ${methodName}(${argNames.join(', ')});
//     printf("TEST_CASE_${idx}_RESULT:\\n");
//   }
// `;
//       }
//     } else if (returnType.includes('*')) {
//       if (returnType.includes('char')) {
//         testCalls += `
//   {
// ${argDecls}    char* result = ${methodName}(${argNames.join(', ')});
//     printf("TEST_CASE_${idx}_RESULT:\\"%s\\"\\n", result);
//   }
// `;
//       } else {
//         testCalls += `
//   {
// ${argDecls}    int* result = ${methodName}(${argNames.join(', ')});
//     printf("TEST_CASE_${idx}_RESULT:[");
//     int size = ${hasReturnSize ? `returnSizeVal_${idx}` : '0'};
//     for (int i = 0; i < size; i++) {
//       printf("%d", result[i]);
//       if (i < size - 1) printf(",");
//     }
//     printf("]\\n");
//   }
// `;
//       }
//     } else if (returnType.includes('double') || returnType.includes('float')) {
//       testCalls += `
//   {
// ${argDecls}    double result = ${methodName}(${argNames.join(', ')});
//     printf("TEST_CASE_${idx}_RESULT:%f\\n", result);
//   }
// `;
//     } else if (returnType.includes('bool') || returnType.includes('_Bool')) {
//       testCalls += `
//   {
// ${argDecls}    bool result = ${methodName}(${argNames.join(', ')});
//     printf("TEST_CASE_${idx}_RESULT:%s\\n", result ? "true" : "false");
//   }
// `;
//     } else {
//       testCalls += `
//   {
// ${argDecls}    int result = ${methodName}(${argNames.join(', ')});
//     printf("TEST_CASE_${idx}_RESULT:%d\\n", result);
//   }
// `;
//     }
//   });

//   return `#include <stdio.h>
// #include <stdlib.h>
// #include <string.h>
// #include <stdbool.h>

// ${code}

// int main() {
// ${testCalls}
//   return 0;
// }
// `;
// }
function generateCWrapper(code, methodName, parsedExamples, problem) {
  const returnType = extractCReturnType(code, methodName);
  const paramTypes = getParamTypes(problem, 'c');
  const paramNamesSnippet = extractParamNamesFromSnippets(problem, 'c');

  // Định nghĩa thêm struct và hàm bổ trợ cho C giống như bên C++
  let helpers = `
#ifndef LIST_NODE_DEFINED
#define LIST_NODE_DEFINED
struct ListNode {
    int val;
    struct ListNode *next;
};
#endif

#ifndef TREE_NODE_DEFINED
#define TREE_NODE_DEFINED
struct TreeNode {
    int val;
    struct TreeNode *left;
    struct TreeNode *right;
};
#endif

#define NULL_SENTINEL -2147483648 // INT_MIN

struct ListNode* toListNodeC(int* arr, int size) {
    if (size == 0) return NULL;
    struct ListNode* dummy = (struct ListNode*)malloc(sizeof(struct ListNode));
    dummy->val = 0;
    dummy->next = NULL;
    struct ListNode* curr = dummy;
    for (int i = 0; i < size; i++) {
        if (arr[i] == NULL_SENTINEL) continue;
        curr->next = (struct ListNode*)malloc(sizeof(struct ListNode));
        curr->next->val = arr[i];
        curr->next->next = NULL;
        curr = curr->next;
    }
    struct ListNode* head = dummy->next;
    free(dummy);
    return head;
}

struct TreeNode* toTreeNodeC(int* arr, int size) {
    if (size == 0 || arr[0] == NULL_SENTINEL) return NULL;
    struct TreeNode* root = (struct TreeNode*)malloc(sizeof(struct TreeNode));
    root->val = arr[0];
    root->left = NULL;
    root->right = NULL;

    struct TreeNode** q = (struct TreeNode**)malloc(sizeof(struct TreeNode*) * (size + 10));
    int head = 0, tail = 0;
    q[tail++] = root;

    int i = 1;
    while (head < tail && i < size) {
        struct TreeNode* curr = q[head++];
        if (i < size && arr[i] != NULL_SENTINEL) {
            curr->left = (struct TreeNode*)malloc(sizeof(struct TreeNode));
            curr->left->val = arr[i];
            curr->left->left = NULL;
            curr->left->right = NULL;
            q[tail++] = curr->left;
        }
        i++;
        if (i < size && arr[i] != NULL_SENTINEL) {
            curr->right = (struct TreeNode*)malloc(sizeof(struct TreeNode));
            curr->right->val = arr[i];
            curr->right->left = NULL;
            curr->right->right = NULL;
            q[tail++] = curr->right;
        }
        i++;
    }
    free(q);
    return root;
}
`;

  let testCalls = '';
  parsedExamples.forEach((ex, idx) => {
    const inputs = Object.values(ex.inputs);
    let argDecls = '';
    let argNames = [];
    const paramNames = Object.keys(ex.inputs);

    paramNames.forEach((pname, pi) => {
      const val = inputs[pi];
      const sigTypeIdx = paramNamesSnippet.indexOf(pname);
      const sigType = sigTypeIdx !== -1 ? paramTypes[sigTypeIdx] : 'other';
      const isListNode = sigType === 'ListNode' || pname.toLowerCase().includes('head');
      const isTreeNode = sigType === 'TreeNode' || pname.toLowerCase().includes('root');

      if (Array.isArray(val)) {
        // ĐÃ SỬA: Chỉ kiểm tra tên parameter để tránh false positives
        // ĐÃ SỬA: Sử dụng INT_MIN thay vì -999999 để tránh xung đột với giá trị thực tế
        const NULL_SENTINEL = -2147483648; // INT_MIN
        const safeVals = val.map(x => (x === null || x === 'null') ? NULL_SENTINEL : x);

        if (isTreeNode) {
          argDecls += `    int ${pname}_arr_${idx}[] = {${safeVals.join(',')}};\n`;
          argDecls += `    struct TreeNode* ${pname}_${idx} = toTreeNodeC(${pname}_arr_${idx}, ${val.length});\n`;
          argNames.push(`${pname}_${idx}`);
        } else if (isListNode) {
          argDecls += `    int ${pname}_arr_${idx}[] = {${safeVals.join(',')}};\n`;
          argDecls += `    struct ListNode* ${pname}_${idx} = toListNodeC(${pname}_arr_${idx}, ${val.length});\n`;
          argNames.push(`${pname}_${idx}`);
        } else if (val.length > 0 && Array.isArray(val[0])) {
          // Declare each sub-array first to avoid invalid pointer initialization in C
          val.forEach((sub, subIdx) => {
            const subSafeVals = sub.map(x => (x === null || x === 'null') ? NULL_SENTINEL : x);
            argDecls += `    int ${pname}_${idx}_sub_${subIdx}[] = {${subSafeVals.join(',')}};\n`;
          });
          const subArrayNames = val.map((_, subIdx) => `${pname}_${idx}_sub_${subIdx}`).join(', ');
          argDecls += `    int* ${pname}_${idx}[] = {${subArrayNames}};\n`;
          argDecls += `    int** ${pname}_ptr_${idx} = ${pname}_${idx};\n`;
          argNames.push(`${pname}_ptr_${idx}`);
        } else {
          argDecls += `    int ${pname}_arr_${idx}[] = {${safeVals.join(',')}};\n`;
          argDecls += `    int* ${pname}_${idx} = ${pname}_arr_${idx};\n`;
          argNames.push(`${pname}_${idx}`);
        }

        const hasSizeParam = code.toLowerCase().includes(`${pname.toLowerCase()}size`);
        if (hasSizeParam) {
          argDecls += `    int ${pname}Size_${idx} = ${val.length};\n`;
          argNames.push(`${pname}Size_${idx}`);
        }

        const hasColSizeParam = code.toLowerCase().includes(`${pname.toLowerCase()}colsize`);
        if (hasColSizeParam) {
          const colSizes = val.map(row => row.length).join(',');
          argDecls += `    int ${pname}ColSize_arr_${idx}[] = {${colSizes}};\n`;
          argDecls += `    int* ${pname}ColSize_${idx} = ${pname}ColSize_arr_${idx};\n`;
          argNames.push(`${pname}ColSize_${idx}`);
        }
      } else if (typeof val === 'string') {
        argDecls += `    char* ${pname}_${idx} = "${val}";\n`;
        argNames.push(`${pname}_${idx}`);
      } else {
        if (val === null || val === 'null') {
          // ĐÃ SỬA: Kiểm tra cả head/ListNode cho danh sách liên kết
          if (isTreeNode) {
            argDecls += `    struct TreeNode* ${pname}_${idx} = NULL;\n`;
          } else if (isListNode) {
            argDecls += `    struct ListNode* ${pname}_${idx} = NULL;\n`;
          } else {
            argDecls += `    int* ${pname}_${idx} = NULL;\n`;
          }
        } else {
          argDecls += `    int ${pname}_${idx} = ${val};\n`;
        }
        argNames.push(`${pname}_${idx}`);
      }
    });

    const hasReturnSize = code.includes('returnSize') || code.includes('return_size');
    if (hasReturnSize) {
      argDecls += `    int returnSizeVal_${idx} = 0;\n`;
      argDecls += `    int* returnSize_${idx} = &returnSizeVal_${idx};\n`;
      argNames.push(`returnSize_${idx}`);
    }

    if (returnType.trim() === 'void') {
      const firstParamVal = inputs[0];
      const firstParamName = paramNames[0] || '';
      // ĐÃ SỬA: Xử lý void function với ListNode/TreeNode
      if (firstParamName.toLowerCase().includes('head') || code.includes('ListNode')) {
        testCalls += `
  {
${argDecls}    ${methodName}(${argNames.join(', ')});
    printf("TEST_CASE_${idx}_RESULT:[");
    struct ListNode* curr = ${argNames[0]};
    while (curr != NULL) {
      printf("%d", curr->val);
      if (curr->next != NULL) printf(",");
      curr = curr->next;
    }
    printf("]\\n");
  }
`;
      } else if (firstParamName.toLowerCase().includes('root') || code.includes('TreeNode')) {
        testCalls += `
  {
${argDecls}    ${methodName}(${argNames.join(', ')});
    printf("TEST_CASE_${idx}_RESULT:[]\\n");
  }
`;
      } else if (Array.isArray(firstParamVal) && firstParamVal.length > 0 && Array.isArray(firstParamVal[0])) {
        const colCount = firstParamVal[0].length;
        testCalls += `
  {
${argDecls}    ${methodName}(${argNames.join(', ')});
    printf("TEST_CASE_${idx}_RESULT:[");
    for (int i = 0; i < ${firstParamVal.length}; i++) {
      printf("[");
      for (int j = 0; j < ${colCount}; j++) {
        printf("%d", ${argNames[0]}[i][j]);
        if (j < ${colCount} - 1) printf(",");
      }
      printf("]");
      if (i < ${firstParamVal.length} - 1) printf(",");
    }
    printf("]\\n");
  }
`;
      } else if (Array.isArray(firstParamVal)) {
        testCalls += `
  {
${argDecls}    ${methodName}(${argNames.join(', ')});
    printf("TEST_CASE_${idx}_RESULT:[");
    for (int i = 0; i < ${firstParamVal.length}; i++) {
      if (${argNames[0]}[i] != -999999) {
         printf("%d", ${argNames[0]}[i]);
         if (i < ${firstParamVal.length} - 1) printf(",");
      }
    }
    printf("]\\n");
  }
`;
      } else {
        testCalls += `
  {
${argDecls}    ${methodName}(${argNames.join(', ')});
    printf("TEST_CASE_${idx}_RESULT:\\n");
  }
`;
      }
    } else if (returnType.includes('*')) {
      if (returnType.includes('char')) {
        testCalls += `
  {
${argDecls}    char* result = ${methodName}(${argNames.join(', ')});
    printf("TEST_CASE_${idx}_RESULT:\\"%s\\"\\n", result);
  }
`;
      } else if (returnType.includes('ListNode')) {
        testCalls += `
  {
${argDecls}    struct ListNode* result = ${methodName}(${argNames.join(', ')});
    printf("TEST_CASE_${idx}_RESULT:[");
    struct ListNode* curr = result;
    while (curr != NULL) {
      printf("%d", curr->val);
      if (curr->next != NULL) printf(",");
      curr = curr->next;
    }
    printf("]\\n");
  }
`;
      } else if (returnType.includes('TreeNode')) {
        testCalls += `
  {
${argDecls}    struct TreeNode* result = ${methodName}(${argNames.join(', ')});
    printf("TEST_CASE_${idx}_RESULT:[");
    // ĐÃ SỬA: Cây được in theo BFS
    if (result != NULL) {
      struct TreeNode** q = (struct TreeNode**)malloc(sizeof(struct TreeNode*) * 1000);
      int head = 0, tail = 0;
      q[tail++] = result;
      while (head < tail) {
        struct TreeNode* curr = q[head++];
        if (curr != NULL) {
          printf("%d", curr->val);
          if (curr->left != NULL) q[tail++] = curr->left;
          if (curr->right != NULL) q[tail++] = curr->right;
        } else {
          printf("null");
        }
        if (head < tail) printf(",");
      }
      free(q);
    }
    printf("]\\n");
  }
`;
      } else if (returnType.includes('**')) {
        // ĐÃ SỬA: Xử lý mảng 2 chiều (int**)
        testCalls += `
  {
${argDecls}    int** result = ${methodName}(${argNames.join(', ')});
    printf("TEST_CASE_${idx}_RESULT:[");
    int size = ${hasReturnSize ? `returnSizeVal_${idx}` : '0'};
    for (int i = 0; i < size; i++) {
      if (i > 0) printf(",");
      printf("[");
      for (int j = 0; j < size; j++) {
        if (j > 0) printf(",");
        printf("%d", result[i][j]);
      }
      printf("]");
    }
    printf("]\\n");
  }
`;
      } else {
        testCalls += `
  {
${argDecls}    int* result = ${methodName}(${argNames.join(', ')});
    printf("TEST_CASE_${idx}_RESULT:[");
    if (result != NULL) {
      int size = ${hasReturnSize ? `returnSizeVal_${idx}` : '0'};
      for (int i = 0; i < size; i++) {
        printf("%d", result[i]);
        if (i < size - 1) printf(",");
      }
    }
    printf("]\\n");
  }
`;
      }
    } else if (returnType.includes('double') || returnType.includes('float')) {
      testCalls += `
  {
${argDecls}    double result = ${methodName}(${argNames.join(', ')});
    printf("TEST_CASE_${idx}_RESULT:%f\\n", result);
  }
`;
    } else if (returnType.includes('bool') || returnType.includes('_Bool')) {
      testCalls += `
  {
${argDecls}    bool result = ${methodName}(${argNames.join(', ')});
    printf("TEST_CASE_${idx}_RESULT:%s\\n", result ? "true" : "false");
  }
`;
    } else {
      testCalls += `
  {
${argDecls}    int result = ${methodName}(${argNames.join(', ')});
    printf("TEST_CASE_${idx}_RESULT:%d\\n", result);
  }
`;
    }
  });

  return `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

${helpers}

${code}

int main() {
${testCalls}
  return 0;
}
`;
}
// function generateCppWrapper(code, methodName, parsedExamples, problem) {
//   const isList = Object.values(problem?.code_snippets || {}).some(s => s.includes('ListNode')) || code.includes('ListNode');
//   const isTree = Object.values(problem?.code_snippets || {}).some(s => s.includes('TreeNode')) || code.includes('TreeNode');
//   const paramTypes = getParamTypes(problem, 'cpp');

//   let testCalls = '';
//   parsedExamples.forEach((ex, idx) => {
//     const inputs = Object.values(ex.inputs);
//     let argDecls = '';
//     let argNames = [];
//     const paramNames = Object.keys(ex.inputs);

//     paramNames.forEach((pname, pi) => {
//       const val = inputs[pi];
//       const ptype = paramTypes[pi] || 'other';

//       if (Array.isArray(val)) {
//         if (ptype === 'ListNode') {
//           argDecls += `    ListNode* ${pname}_${idx} = toListNode({${val.map(x => x === null ? -999999 : x).join(',')}});\n`;
//           argNames.push(`${pname}_${idx}`);
//         } else if (ptype === 'ListNode[]') {
//           argDecls += `    vector<ListNode*> ${pname}_${idx};\n`;
//           val.forEach(subval => {
//             if (subval === null) {
//               argDecls += `    ${pname}_${idx}.push_back(nullptr);\n`;
//             } else if (Array.isArray(subval)) {
//               argDecls += `    ${pname}_${idx}.push_back(toListNode({${subval.map(x => x === null ? -999999 : x).join(',')}}));\n`;
//             }
//           });
//           argNames.push(`${pname}_${idx}`);
//         } else if (ptype === 'TreeNode') {
//           const stringVals = val.map(x => x === null ? `"null"` : `"${x}"`).join(',');
//           argDecls += `    TreeNode* ${pname}_${idx} = toTreeNode({${stringVals}});\n`;
//           argNames.push(`${pname}_${idx}`);
//         } else if (ptype === 'TreeNode[]') {
//           argDecls += `    vector<TreeNode*> ${pname}_${idx};\n`;
//           val.forEach(subval => {
//             if (subval === null) {
//               argDecls += `    ${pname}_${idx}.push_back(nullptr);\n`;
//             } else if (Array.isArray(subval)) {
//               const stringVals = subval.map(x => x === null ? `"null"` : `"${x}"`).join(',');
//               argDecls += `    ${pname}_${idx}.push_back(toTreeNode({${stringVals}}));\n`;
//             }
//           });
//           argNames.push(`${pname}_${idx}`);
//         } else if (val.length > 0 && Array.isArray(val[0])) {
//           argDecls += `    vector<vector<int>> ${pname}_${idx} = {${val.map(sub => `{${sub.join(',')}}`).join(',')}};\n`;
//           argNames.push(`${pname}_${idx}`);
//         } else {
//           argDecls += `    vector<int> ${pname}_${idx} = {${val.join(',')}};\n`;
//           argNames.push(`${pname}_${idx}`);
//         }
//       } else if (typeof val === 'string') {
//         argDecls += `    string ${pname}_${idx} = "${val}";\n`;
//         argNames.push(`${pname}_${idx}`);
//       } else {
//         argDecls += `    int ${pname}_${idx} = ${val};\n`;
//         argNames.push(`${pname}_${idx}`);
//       }
//     });

//     const hasSolutionClass = code.includes('class Solution') || code.includes('struct Solution');
//     const isVoid = isVoidFunction(problem);

//     testCalls += `
//   // Test ${idx}
//   {
// ${argDecls}    try {
//       ${isVoid ? 
//         (hasSolutionClass ? 'Solution sol;\n      sol.' + methodName + '(' + argNames.join(', ') + ');' : methodName + '(' + argNames.join(', ') + ');') :
//         (hasSolutionClass ? 'Solution sol;\n      auto result = sol.' + methodName + '(' + argNames.join(', ') + ');' : 'auto result = ' + methodName + '(' + argNames.join(', ') + ');')
//       }
//       cout << "TEST_CASE_${idx}_RESULT:";
//       printResult(${isVoid ? argNames[0] : 'result'});
//       cout << endl;
//     } catch (exception& e) {
//       cout << "TEST_CASE_${idx}_ERROR:" << e.what() << endl;
//     }
//   }
// `;
//   });
function generateCppWrapper(code, methodName, parsedExamples, problem) {
  const isList = Object.values(problem?.code_snippets || {}).some(s => s.includes('ListNode')) || code.includes('ListNode');
  const isTree = Object.values(problem?.code_snippets || {}).some(s => s.includes('TreeNode')) || code.includes('TreeNode');
  const paramTypes = getParamTypes(problem, 'cpp');

  let testCalls = '';
  parsedExamples.forEach((ex, idx) => {
    const inputs = Object.values(ex.inputs);
    let argDecls = '';
    let argNames = [];
    const paramNames = Object.keys(ex.inputs);

    paramNames.forEach((pname, pi) => {
      const val = inputs[pi];
      const ptype = paramTypes[pi] || 'other';

      if (Array.isArray(val)) {
        if (ptype === 'ListNode') {
          argDecls += `    ListNode* ${pname}_${idx} = toListNode({${val.map(x => x === null ? -2147483648 : x).join(',')}});\n`;
          argNames.push(`${pname}_${idx}`);
        } else if (ptype === 'ListNode[]') {
          argDecls += `    vector<ListNode*> ${pname}_${idx};\n`;
          val.forEach(subval => {
            if (subval === null) {
              argDecls += `    ${pname}_${idx}.push_back(nullptr);\n`;
            } else if (Array.isArray(subval)) {
              argDecls += `    ${pname}_${idx}.push_back(toListNode({${subval.map(x => x === null ? -2147483648 : x).join(',')}}));\n`;
            }
          });
          argNames.push(`${pname}_${idx}`);
        } else if (ptype === 'TreeNode') {
          const stringVals = val.map(x => x === null ? `"null"` : `"${x}"`).join(',');
          argDecls += `    TreeNode* ${pname}_${idx} = toTreeNode({${stringVals}});\n`;
          argNames.push(`${pname}_${idx}`);
        } else if (ptype === 'TreeNode[]') {
          argDecls += `    vector<TreeNode*> ${pname}_${idx};\n`;
          val.forEach(subval => {
            if (subval === null) {
              argDecls += `    ${pname}_${idx}.push_back(nullptr);\n`;
            } else if (Array.isArray(subval)) {
              const stringVals = subval.map(x => x === null ? `"null"` : `"${x}"`).join(',');
              argDecls += `    ${pname}_${idx}.push_back(toTreeNode({${stringVals}}));\n`;
            }
          });
          argNames.push(`${pname}_${idx}`);
        } else if (ptype === 'string[]') {
          argDecls += `    vector<string> ${pname}_${idx} = {${val.map(x => `"${x}"`).join(',')}};\n`;
          argNames.push(`${pname}_${idx}`);
        } else if (ptype === 'double[]') {
          argDecls += `    vector<double> ${pname}_${idx} = {${val.join(',')}};\n`;
          argNames.push(`${pname}_${idx}`);
        } else if (ptype === 'char[]') {
          // Handle char array as string for simplicity
          const charStr = val.map(x => typeof x === 'string' ? `"${x}"` : String.fromCharCode(x)).join(',');
          argDecls += `    vector<char> ${pname}_${idx} = {${val.map(x => typeof x === 'string' ? `'${x}'` : `'${String.fromCharCode(x)}'`).join(',')}};\n`;
          argNames.push(`${pname}_${idx}`);
        } else if (ptype === 'int[][]' || (val.length > 0 && Array.isArray(val[0]))) {
          argDecls += `    vector<vector<int>> ${pname}_${idx} = {${val.map(sub => `{${sub.join(',')}}`).join(',')}};\n`;
          argNames.push(`${pname}_${idx}`);
        } else if (val.length === 0) {
          // ĐÃ SỬA: Xử lý mảng rỗng - mặc định là vector<int> rỗng
          argDecls += `    vector<int> ${pname}_${idx};\n`;
          argNames.push(`${pname}_${idx}`);
        } else {
          argDecls += `    vector<int> ${pname}_${idx} = {${val.join(',')}};\n`;
          argNames.push(`${pname}_${idx}`);
        }
      } else if (typeof val === 'string') {
        argDecls += `    string ${pname}_${idx} = "${val}";\n`;
        argNames.push(`${pname}_${idx}`);
      } else {
        // ĐÃ SỬA: Xử lý chính xác giá trị null đơn lẻ cho con trỏ cây/danh sách liên kết
        if (val === null || val === 'null') {
          if (ptype === 'TreeNode') {
            argDecls += `    TreeNode* ${pname}_${idx} = nullptr;\n`;
          } else if (ptype === 'ListNode') {
            argDecls += `    ListNode* ${pname}_${idx} = nullptr;\n`;
          } else {
            argDecls += `    int ${pname}_${idx} = 0;\n`;
          }
        } else {
          argDecls += `    int ${pname}_${idx} = ${val};\n`;
        }
        argNames.push(`${pname}_${idx}`);
      }
    });

    const hasSolutionClass = code.includes('class Solution') || code.includes('struct Solution');
    const isVoid = isVoidFunction(problem);
    const voidOutputIndex = isVoid ? findVoidOutputParam(paramNames, paramTypes) : 0;

    testCalls += `
  // Test ${idx}
  {
${argDecls}    try {
      ${isVoid ?
        (hasSolutionClass ? 'Solution sol;\n      sol.' + methodName + '(' + argNames.join(', ') + ');' : methodName + '(' + argNames.join(', ') + ');') :
        (hasSolutionClass ? 'Solution sol;\n      auto result = sol.' + methodName + '(' + argNames.join(', ') + ');' : 'auto result = ' + methodName + '(' + argNames.join(', ') + ');')
      }
      cout << "TEST_CASE_${idx}_RESULT:";
      printResult(${isVoid ? argNames[voidOutputIndex] : 'result'});
      cout << endl;
    } catch (exception& e) {
      cout << "TEST_CASE_${idx}_ERROR:" << e.what() << endl;
    }
  }
`;
  });

  return `#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <map>
#include <set>
#include <algorithm>
#include <numeric>
#include <queue>
#include <stack>
#include <climits>
#include <cmath>
#include <sstream>

using namespace std;

#ifndef LIST_NODE_DEFINED
#define LIST_NODE_DEFINED
struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};
#endif

#ifndef TREE_NODE_DEFINED
#define TREE_NODE_DEFINED
struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};
#endif

#define NULL_SENTINEL -2147483648 // INT_MIN

ListNode* toListNode(const vector<int>& arr) {
    if (arr.empty()) return nullptr;
    ListNode* dummy = new ListNode(0);
    ListNode* curr = dummy;
    for (int val : arr) {
        if (val == NULL_SENTINEL) continue;
        curr->next = new ListNode(val);
        curr = curr->next;
    }
    ListNode* head = dummy->next;
    delete dummy;
    return head;
}

TreeNode* toTreeNode(const vector<string>& arr) {
    if (arr.empty() || arr[0] == "null") return nullptr;
    TreeNode* root = new TreeNode(stoi(arr[0]));
    queue<TreeNode*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < arr.size()) {
        TreeNode* curr = q.front();
        q.pop();
        if (i < arr.size() && arr[i] != "null") {
            curr->left = new TreeNode(stoi(arr[i]));
            q.push(curr->left);
        }
        i++;
        if (i < arr.size() && arr[i] != "null") {
            curr->right = new TreeNode(stoi(arr[i]));
            q.push(curr->right);
        }
        i++;
    }
    return root;
}

template<typename T>
void printResult(const vector<T>& v) {
  cout << "[";
  for(size_t i=0; i<v.size(); i++){
    if(i>0) cout<<",";
    cout<<v[i];
  }
  cout << "]";
}

template<typename T>
void printResult(const vector<vector<T>>& v) {
  cout << "[";
  for(size_t i=0; i<v.size(); i++){
    if(i>0) cout<<",";
    printResult(v[i]);
  }
  cout << "]";
}

void printResult(int v) { cout << v; }
void printResult(long long v) { cout << v; }
void printResult(double v) { cout << v; }
void printResult(bool v) { cout << (v ? "true" : "false"); }
void printResult(const string& v) { cout << "\"" << v << "\""; }

void printResult(ListNode* head) {
    cout << "[";
    ListNode* curr = head;
    while (curr) {
        cout << curr->val;
        if (curr->next) cout << ",";
        curr = curr->next;
    }
    cout << "]";
}

void printResult(TreeNode* root) {
    if (!root) {
        cout << "[]";
        return;
    }
    cout << "[";
    vector<string> res;
    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        TreeNode* curr = q.front();
        q.pop();
        if (curr) {
            res.push_back(to_string(curr->val));
            q.push(curr->left);
            q.push(curr->right);
        } else {
            res.push_back("null");
        }
    }
    while (!res.empty() && res.back() == "null") {
        res.pop_back();
    }
    for (size_t i = 0; i < res.size(); i++) {
        if (i > 0) cout << ",";
        cout << res[i];
    }
    cout << "]";
}

${code}

int main() {
${testCalls}
  return 0;
}
`;
}

function generateJavaWrapper(code, methodName, parsedExamples, problem) {
  const isList = Object.values(problem?.code_snippets || {}).some(s => s.includes('ListNode')) || code.includes('ListNode');
  const isTree = Object.values(problem?.code_snippets || {}).some(s => s.includes('TreeNode')) || code.includes('TreeNode');
  const paramTypes = getParamTypes(problem, 'java');

  let testCalls = '';
  parsedExamples.forEach((ex, idx) => {
    const inputs = Object.values(ex.inputs);
    const paramNames = Object.keys(ex.inputs);
    let argDecls = '';
    let argNames = [];

    paramNames.forEach((pname, pi) => {
      const val = inputs[pi];
      const ptype = paramTypes[pi] || 'other';
      const actualArgName = `${pname}${idx}`;

      if (Array.isArray(val)) {
        if (ptype === 'ListNode') {
          argDecls += `      ListNode ${actualArgName} = Main.toListNode(new int[]{${val.join(',')}});\n`;
          argNames.push(actualArgName);
        } else if (ptype === 'ListNode[]') {
          const subDecls = val.map(sub => {
            if (sub === null) return 'null';
            return `Main.toListNode(new int[]{${sub.join(',')}})`;
          }).join(', ');
          argDecls += `      ListNode[] ${actualArgName} = new ListNode[]{${subDecls}};\n`;
          argNames.push(actualArgName);
        } else if (ptype === 'TreeNode') {
          const stringVals = val.map(x => x === null ? `"null"` : `"${x}"`).join(',');
          argDecls += `      TreeNode ${actualArgName} = Main.toTreeNode(new String[]{${stringVals}});\n`;
          argNames.push(actualArgName);
        } else if (ptype === 'TreeNode[]') {
          const subDecls = val.map(sub => {
            if (sub === null) return 'null';
            const stringVals = sub.map(x => x === null ? `"null"` : `"${x}"`).join(',');
            return `Main.toTreeNode(new String[]{${stringVals}})`;
          }).join(', ');
          argDecls += `      TreeNode[] ${actualArgName} = new TreeNode[]{${subDecls}};\n`;
          argNames.push(actualArgName);
        } else if (ptype === 'string[]') {
          argDecls += `      String[] ${actualArgName} = new String[]{${val.map(x => `"${x}"`).join(',')}};\n`;
          argNames.push(actualArgName);
        } else if (ptype === 'double[]') {
          argDecls += `      double[] ${actualArgName} = new double[]{${val.join(',')}};\n`;
          argNames.push(actualArgName);
        } else if (ptype === 'char[]') {
          argDecls += `      char[] ${actualArgName} = new char[]{${val.map(x => typeof x === 'string' ? `'${x}'` : `'${String.fromCharCode(x)}'`).join(',')}};\n`;
          argNames.push(actualArgName);
        } else if (ptype === 'int[][]' || (val.length > 0 && Array.isArray(val[0]))) {
          const subArrays = val.map(sub => `new int[]{${sub.join(',')}}`).join(', ');
          argDecls += `      int[][] ${actualArgName} = new int[][]{${subArrays}};\n`;
          argNames.push(actualArgName);
        } else if (val.length === 0) {
          // ĐÃ SỬA: Xử lý mảng rỗng - mặc định là int[] rỗng
          argDecls += `      int[] ${actualArgName} = new int[]{};\n`;
          argNames.push(actualArgName);
        } else {
          argDecls += `      int[] ${actualArgName} = new int[]{${val.join(',')}};\n`;
          argNames.push(actualArgName);
        }
      } else if (typeof val === 'string') {
        argDecls += `      String ${actualArgName} = "${val}";\n`;
        argNames.push(actualArgName);
      } else if (typeof val === 'boolean') {
        argDecls += `      boolean ${actualArgName} = ${val};\n`;
        argNames.push(actualArgName);
      } else {
        // ĐÃ SỬA: Xử lý chính xác giá trị null đơn lẻ cho con trỏ cây/danh sách liên kết
        if (val === null || val === 'null') {
          if (ptype === 'TreeNode') {
            argDecls += `      TreeNode ${actualArgName} = null;\n`;
          } else if (ptype === 'ListNode') {
            argDecls += `      ListNode ${actualArgName} = null;\n`;
          } else {
            argDecls += `      int ${actualArgName} = 0;\n`;
          }
        } else {
          argDecls += `      int ${actualArgName} = ${val};\n`;
        }
        argNames.push(actualArgName);
      }
    });

    const isVoid = isVoidFunction(problem);
    const voidOutputIndex = isVoid ? findVoidOutputParam(paramNames, paramTypes) : 0;

    testCalls += `
    // Test ${idx}
    try {
${argDecls}      Solution sol = new Solution();
      ${isVoid ? `sol.${methodName}(${argNames.join(', ')});\n      Object result = ${argNames[voidOutputIndex]};` : `Object result = sol.${methodName}(${argNames.join(', ')});`}
      System.out.print("TEST_CASE_${idx}_RESULT:");
      System.out.println(resultToJson(result));
    } catch (Exception e) {
      System.out.println("TEST_CASE_${idx}_ERROR:" + e.getMessage());
    }
`;
  });

  return `import java.util.*;

${code}

// ĐÃ SỬA: Thêm comment để tránh redefinition (Java không có #ifndef như C++)
// Nếu user code đã định nghĩa các class này, có thể cần comment bỏ phần dưới
class ListNode {
    public int val;
    public ListNode next;
    public ListNode() {}
    public ListNode(int val) { this.val = val; }
    public ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

class TreeNode {
    public int val;
    public TreeNode left;
    public TreeNode right;
    public TreeNode() {}
    public TreeNode(int val) { this.val = val; }
    public TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}

class Main {
  static ListNode toListNode(int[] arr) {
    if (arr == null || arr.length == 0) return null;
    ListNode dummy = new ListNode(0);
    ListNode curr = dummy;
    for (int val : arr) {
      curr.next = new ListNode(val);
      curr = curr.next;
    }
    return dummy.next;
  }

  static TreeNode toTreeNode(String[] arr) {
    if (arr == null || arr.length == 0 || arr[0].equals("null")) return null;
    TreeNode root = new TreeNode(Integer.parseInt(arr[0]));
    Queue<TreeNode> q = new LinkedList<>();
    q.add(root);
    int i = 1;
    while (!q.isEmpty() && i < arr.length) {
      TreeNode curr = q.poll();
      if (i < arr.length && !arr[i].equals("null")) {
        curr.left = new TreeNode(Integer.parseInt(arr[i]));
        q.add(curr.left);
      }
      i++;
      if (i < arr.length && !arr[i].equals("null")) {
        curr.right = new TreeNode(Integer.parseInt(arr[i]));
        q.add(curr.right);
      }
      i++;
    }
    return root;
  }

  static String resultToJson(Object obj) {
    if (obj == null) return "null";
    if (obj instanceof ListNode) {
      ListNode curr = (ListNode) obj;
      StringBuilder sb = new StringBuilder("[");
      while (curr != null) {
        sb.append(curr.val);
        if (curr.next != null) sb.append(",");
        curr = curr.next;
      }
      sb.append("]");
      return sb.toString();
    }
    if (obj instanceof TreeNode) {
      TreeNode root = (TreeNode) obj;
      List<String> res = new ArrayList<>();
      Queue<TreeNode> q = new LinkedList<>();
      q.add(root);
      while (!q.isEmpty()) {
        TreeNode curr = q.poll();
        if (curr != null) {
          res.add(String.valueOf(curr.val));
          q.add(curr.left);
          q.add(curr.right);
        } else {
          res.add("null");
        }
      }
      while (!res.isEmpty() && res.get(res.size() - 1).equals("null")) {
        res.remove(res.size() - 1);
      }
      StringBuilder sb = new StringBuilder("[");
      for (int i = 0; i < res.size(); i++) {
        if (i > 0) sb.append(",");
        sb.append(res.get(i));
      }
      sb.append("]");
      return sb.toString();
    }
    if (obj.getClass().isArray()) {
      int len = java.lang.reflect.Array.getLength(obj);
      StringBuilder sb = new StringBuilder("[");
      for (int i = 0; i < len; i++) {
        if (i > 0) sb.append(",");
        sb.append(resultToJson(java.lang.reflect.Array.get(obj, i)));
      }
      sb.append("]");
      return sb.toString();
    }
    if (obj instanceof String) return "\\"" + obj + "\\"";
    if (obj instanceof Boolean) return obj.toString();
    if (obj instanceof List) {
      List<?> list = (List<?>) obj;
      StringBuilder sb = new StringBuilder("[");
      for (int i = 0; i < list.size(); i++) {
        if (i > 0) sb.append(",");
        sb.append(resultToJson(list.get(i)));
      }
      sb.append("]");
      return sb.toString();
    }
    return obj.toString();
  }

  public static void main(String[] args) {
${testCalls}
  }
}
`;
}

function generateGoWrapper(code, methodName, parsedExamples, problem) {
  const isList = Object.values(problem?.code_snippets || {}).some(s => s.includes('ListNode')) || code.includes('ListNode');
  const isTree = Object.values(problem?.code_snippets || {}).some(s => s.includes('TreeNode')) || code.includes('TreeNode');
  const paramTypes = getParamTypes(problem, 'golang');

  let testCalls = '';
  parsedExamples.forEach((ex, idx) => {
    const inputs = Object.values(ex.inputs);
    const paramNames = Object.keys(ex.inputs);
    let argDecls = '';
    let argNames = [];

    paramNames.forEach((pname, pi) => {
      const val = inputs[pi];
      const ptype = paramTypes[pi] || 'other';

      if (Array.isArray(val)) {
        if (ptype === 'ListNode') {
          argDecls += `  ${pname}${idx} := toListNode([]int{${val.join(',')}})\n`;
          argNames.push(`${pname}${idx}`);
        } else if (ptype === 'ListNode[]') {
          const subDecls = val.map(sub => {
            if (sub === null) return 'nil';
            return `toListNode([]int{${sub.join(',')}})`;
          }).join(', ');
          argDecls += `  ${pname}${idx} := []*ListNode{${subDecls}}\n`;
          argNames.push(`${pname}${idx}`);
        } else if (ptype === 'TreeNode') {
          const stringVals = val.map(x => x === null ? `"null"` : `"${x}"`).join(',');
          argDecls += `  ${pname}${idx} := toTreeNode([]string{${stringVals}})\n`;
          argNames.push(`${pname}${idx}`);
        } else if (ptype === 'TreeNode[]') {
          const subDecls = val.map(sub => {
            if (sub === null) return 'nil';
            const stringVals = sub.map(x => x === null ? `"null"` : `"${x}"`).join(',');
            return `toTreeNode([]string{${stringVals}})`;
          }).join(', ');
          argDecls += `  ${pname}${idx} := []*TreeNode{${subDecls}}\n`;
          argNames.push(`${pname}${idx}`);
        } else if (ptype === 'string[]') {
          argDecls += `  ${pname}${idx} := []string{${val.map(x => `"${x}"`).join(',')}}\n`;
          argNames.push(`${pname}${idx}`);
        } else if (ptype === 'double[]') {
          argDecls += `  ${pname}${idx} := []float64{${val.join(',')}}\n`;
          argNames.push(`${pname}${idx}`);
        } else if (ptype === 'char[]') {
          argDecls += `  ${pname}${idx} := []string{${val.map(x => `"${x}"`).join(',')}}\n`;
          argNames.push(`${pname}${idx}`);
        } else if (ptype === 'int[][]' || (val.length > 0 && Array.isArray(val[0]))) {
          const subArrays = val.map(sub => `[]int{${sub.join(',')}}`).join(', ');
          argDecls += `  ${pname}${idx} := [][]int{${subArrays}}\n`;
          argNames.push(`${pname}${idx}`);
        } else if (val.length === 0) {
          // ĐÃ SỬA: Xử lý mảng rỗng - mặc định là []int rỗng
          argDecls += `  ${pname}${idx} := []int{}\n`;
          argNames.push(`${pname}${idx}`);
        } else {
          argDecls += `  ${pname}${idx} := []int{${val.join(',')}}\n`;
          argNames.push(`${pname}${idx}`);
        }
      } else if (typeof val === 'string') {
        argDecls += `  ${pname}${idx} := "${val}"\n`;
        argNames.push(`${pname}${idx}`);
      } else if (typeof val === 'boolean') {
        argDecls += `  ${pname}${idx} := ${val}\n`;
        argNames.push(`${pname}${idx}`);
      } else {
        // ĐÃ SỬA: Xử lý chính xác giá trị null đơn lẻ cho con trỏ cây/danh sách liên kết
        if (val === null || val === 'null') {
          if (ptype === 'TreeNode') {
            argDecls += `  var ${pname}${idx} *TreeNode = nil\n`;
          } else if (ptype === 'ListNode') {
            argDecls += `  var ${pname}${idx} *ListNode = nil\n`;
          } else {
            argDecls += `  ${pname}${idx} := 0\n`;
          }
        } else {
          argDecls += `  ${pname}${idx} := ${val}\n`;
        }
        argNames.push(`${pname}${idx}`);
      }
    });

    const isVoid = isVoidFunction(problem);
    const voidOutputIndex = isVoid ? findVoidOutputParam(paramNames, paramTypes) : 0;

    testCalls += `
  // Test ${idx}
  func() {
    defer func() {
      if r := recover(); r != nil {
        fmt.Printf("TEST_CASE_${idx}_ERROR:%v\\n", r)
      }
    }()
${argDecls}    ${isVoid ? `${methodName}(${argNames.join(', ')})\n    result := ${argNames[voidOutputIndex]}` : `result := ${methodName}(${argNames.join(', ')})`}
    jsonBytes, _ := json.Marshal(result)
    fmt.Printf("TEST_CASE_${idx}_RESULT:%s\\n", string(jsonBytes))
  }()
`;
  });

  return `package main

import (
  "fmt"
  "encoding/json"
  "sort"
  "math"
  "strings"
)

var _ = fmt.Println
var _ = json.Marshal
var _ = sort.Ints
var _ = math.Max
var _ = strings.Contains

// ĐÃ SỬA: Thêm comment để tránh redefinition (Go không có #ifndef như C++)
// Nếu user code đã định nghĩa các type này, có thể cần comment bỏ phần dưới
type ListNode struct {
    Val int
    Next *ListNode
}

type TreeNode struct {
    Val int
    Left *TreeNode
    Right *TreeNode
}

func (n *ListNode) MarshalJSON() ([]byte, error) {
    var res []int
    curr := n
    for curr != nil {
        res = append(res, curr.Val)
        curr = curr.Next
    }
    return json.Marshal(res)
}

func (n *TreeNode) MarshalJSON() ([]byte, error) {
    if n == nil {
        return []byte("[]"), nil
    }
    var res []interface{}
    queue := []*TreeNode{n}
    for len(queue) > 0 {
        curr := queue[0]
        queue = queue[1:]
        if curr != nil {
            res = append(res, curr.Val)
            queue = append(queue, curr.Left)
            queue = append(queue, curr.Right)
        } else {
            res = append(res, nil)
        }
    }
    for len(res) > 0 && res[len(res)-1] == nil {
        res = res[:len(res)-1]
    }
    return json.Marshal(res)
}

func toListNode(arr []int) *ListNode {
    if len(arr) == 0 {
        return nil
    }
    dummy := &ListNode{}
    curr := dummy
    for _, val := range arr {
        curr.Next = &ListNode{Val: val}
        curr = curr.Next
    }
    return dummy.Next
}

func toTreeNode(arr []string) *TreeNode {
    if len(arr) == 0 || len(arr) == 1 && arr[0] == "null" {
        return nil
    }
    var val0 int
    fmt.Sscanf(arr[0], "%d", &val0)
    root := &TreeNode{Val: val0}
    queue := []*TreeNode{root}
    i := 1
    for len(queue) > 0 && i < len(arr) {
        curr := queue[0]
        queue = queue[1:]
        if i < len(arr) && arr[i] != "null" {
            var val int
            fmt.Sscanf(arr[i], "%d", &val)
            curr.Left = &TreeNode{Val: val}
            queue = append(queue, curr.Left)
        }
        i++
        if i < len(arr) && arr[i] != "null" {
            var val int
            fmt.Sscanf(arr[i], "%d", &val)
            curr.Right = &TreeNode{Val: val}
            queue = append(queue, curr.Right)
        }
        i++
    }
    return root
}

${code}

func main() {
${testCalls}
}
`;
}

function generateRustWrapper(code, methodName, parsedExamples, problem) {
  const isList = Object.values(problem?.code_snippets || {}).some(s => s.includes('ListNode')) || code.includes('ListNode');
  const isTree = Object.values(problem?.code_snippets || {}).some(s => s.includes('TreeNode')) || code.includes('TreeNode');
  const paramTypes = getParamTypes(problem, 'rust');
  const isVoid = isVoidFunction(problem);

  // Extract Rust parameter declarations from the snippet
  const rustSnippet = problem?.code_snippets?.rust || '';
  const rustParamsDecls = [];
  const rustSigMatch = rustSnippet.match(/fn\s+[a-zA-Z0-9_]+\s*\(([^)]*)\)/);
  if (rustSigMatch) {
    const paramsListStr = rustSigMatch[1];
    let currentParam = '';
    let depth = 0;
    for (let i = 0; i < paramsListStr.length; i++) {
      const char = paramsListStr[i];
      if (char === '<' || char === '[' || char === '(') depth++;
      if (char === '>' || char === ']' || char === ')') depth--;
      if (char === ',' && depth === 0) {
        rustParamsDecls.push(currentParam.trim());
        currentParam = '';
      } else {
        currentParam += char;
      }
    }
    if (currentParam.trim()) {
      rustParamsDecls.push(currentParam.trim());
    }
  }

  // Convert methodName (camelCase) to snake_case (standard Rust name)
  const snakeMethodName = methodName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  const sigRegex = new RegExp(`fn\\s+${snakeMethodName}\\s*\\([^{]*\\)\\s*->\\s*([^{]+?)\\s*\\{`, 'm');
  const sigMatch = rustSnippet.match(sigRegex);
  const returnType = sigMatch ? sigMatch[1].trim() : '';
  const returnsList = returnType.includes('ListNode');
  const returnsTree = returnType.includes('TreeNode');

  let testCalls = '';
  parsedExamples.forEach((ex, idx) => {
    const inputs = Object.values(ex.inputs);
    let argDecls = '';
    let argNames = [];
    const paramNames = Object.keys(ex.inputs);

    paramNames.forEach((pname, pi) => {
      const val = inputs[pi];
      const ptype = paramTypes[pi] || 'other';

      const isRustMutRef = rustParamsDecls[pi] && rustParamsDecls[pi].includes('&mut');
      const isRustRef = rustParamsDecls[pi] && rustParamsDecls[pi].includes('&') && !rustParamsDecls[pi].includes('&mut');
      const letKeyword = isRustMutRef ? 'let mut' : 'let';
      const actualArgName = `${pname}_${idx}`;

      if (isRustMutRef) {
        argNames.push(`&mut ${actualArgName}`);
      } else if (isRustRef) {
        argNames.push(`&${actualArgName}`);
      } else {
        argNames.push(actualArgName);
      }

      if (Array.isArray(val)) {
        if (ptype === 'ListNode') {
          argDecls += `    ${letKeyword} ${actualArgName} = to_list_node(vec![${val.join(',')}]);\n`;
        } else if (ptype === 'ListNode[]') {
          const subDecls = val.map(sub => {
            if (sub === null) return 'None';
            return `to_list_node(vec![${sub.join(',')}])`;
          }).join(', ');
          argDecls += `    ${letKeyword} ${actualArgName} = vec![${subDecls}];\n`;
        } else if (ptype === 'TreeNode') {
          const stringVals = val.map(x => x === null ? `None` : `Some(${x})`).join(',');
          argDecls += `    ${letKeyword} ${actualArgName} = to_tree_node(vec![${stringVals}]);\n`;
        } else if (ptype === 'TreeNode[]') {
          const subDecls = val.map(sub => {
            if (sub === null) return 'None';
            const stringVals = sub.map(x => x === null ? `None` : `Some(${x})`).join(',');
            return `to_tree_node(vec![${stringVals}])`;
          }).join(', ');
          argDecls += `    ${letKeyword} ${actualArgName} = vec![${subDecls}];\n`;
        } else if (ptype === 'string[]') {
          argDecls += `    ${letKeyword} ${actualArgName} = vec![${val.map(x => `"${x}"`).join(',')}].into_iter().map(|s| s.to_string()).collect();\n`;
        } else if (ptype === 'double[]') {
          argDecls += `    ${letKeyword} ${actualArgName} = vec![${val.join(',')}];\n`;
        } else if (ptype === 'char[]') {
          argDecls += `    ${letKeyword} ${actualArgName} = vec![${val.map(x => typeof x === 'string' ? `'${x}'` : `'${String.fromCharCode(x)}'`).join(',')}];\n`;
        } else if (ptype === 'int[][]' || (val.length > 0 && Array.isArray(val[0]))) {
          const subArrays = val.map(sub => `vec![${sub.join(',')}]`).join(', ');
          argDecls += `    ${letKeyword} ${actualArgName} = vec![${subArrays}];\n`;
        } else if (val.length === 0) {
          // ĐÃ SỬA: Xử lý mảng rỗng - mặc định là Vec::new()
          argDecls += `    ${letKeyword} ${actualArgName} = Vec::new();\n`;
        } else {
          argDecls += `    ${letKeyword} ${actualArgName} = vec![${val.join(',')}];\n`;
        }
      } else if (typeof val === 'string') {
        argDecls += `    ${letKeyword} ${actualArgName} = "${val}".to_string();\n`;
      } else if (typeof val === 'boolean') {
        argDecls += `    ${letKeyword} ${actualArgName} = ${val};\n`;
      } else {
        // ĐÃ SỬA: Xử lý chính xác giá trị null đơn lẻ cho con trỏ cây/danh sách liên kết
        if (val === null || val === 'null') {
          if (ptype === 'TreeNode') {
            argDecls += `    ${letKeyword} ${actualArgName}: Option<Rc<RefCell<TreeNode>>> = None;\n`;
          } else if (ptype === 'ListNode') {
            argDecls += `    ${letKeyword} ${actualArgName}: Option<Box<ListNode>> = None;\n`;
          } else {
            argDecls += `    ${letKeyword} ${actualArgName} = 0;\n`;
          }
        } else {
          argDecls += `    ${letKeyword} ${actualArgName} = ${val};\n`;
        }
      }
    });

    const voidOutputIndex = isVoid ? findVoidOutputParam(paramNames, paramTypes) : 0;
    const firstArgVar = `${paramNames[voidOutputIndex]}_${idx}`;

    if (isVoid) {
      const outputType = paramTypes[voidOutputIndex] || 'other';
      if (outputType === 'ListNode') {
        testCalls += `
    {
${argDecls}        Solution::${snakeMethodName}(${argNames.join(', ')});
        print!("TEST_CASE_${idx}_RESULT:");
        print_list_node(${firstArgVar});
    }
`;
      } else if (outputType === 'TreeNode') {
        testCalls += `
    {
${argDecls}        Solution::${snakeMethodName}(${argNames.join(', ')});
        print!("TEST_CASE_${idx}_RESULT:");
        print_tree_node(${firstArgVar});
    }
`;
      } else {
        testCalls += `
    {
${argDecls}        Solution::${snakeMethodName}(${argNames.join(', ')});
        println!("TEST_CASE_${idx}_RESULT:{:?}", ${firstArgVar});
    }
`;
      }
    } else {
      if (returnsList) {
        testCalls += `
    {
${argDecls}        let result = Solution::${snakeMethodName}(${argNames.join(', ')});
        print!("TEST_CASE_${idx}_RESULT:");
        print_list_node(result);
    }
`;
      } else if (returnsTree) {
        testCalls += `
    {
${argDecls}        let result = Solution::${snakeMethodName}(${argNames.join(', ')});
        print!("TEST_CASE_${idx}_RESULT:");
        print_tree_node(result);
    }
`;
      } else {
        testCalls += `
    {
${argDecls}        let result = Solution::${snakeMethodName}(${argNames.join(', ')});
        println!("TEST_CASE_${idx}_RESULT:{:?}", result);
    }
`;
      }
    }
  });

  return `
// ĐÃ SỬA: Thêm comment để tránh redefinition (Rust không có #ifndef như C++)
// Nếu user code đã định nghĩa các struct này, có thể cần comment bỏ phần dưới
#[derive(PartialEq, Eq, Clone, Debug)]
pub struct ListNode {
  pub val: i32,
  pub next: Option<Box<ListNode>>
}

impl ListNode {
  #[inline]
  pub fn new(val: i32) -> Self {
    ListNode {
      next: None,
      val
    }
  }
}

#[derive(Debug, PartialEq, Eq)]
pub struct TreeNode {
  pub val: i32,
  pub left: Option<std::rc::Rc<std::cell::RefCell<TreeNode>>>,
  pub right: Option<std::rc::Rc<std::cell::RefCell<TreeNode>>>,
}

impl TreeNode {
  #[inline]
  pub fn new(val: i32) -> Self {
    TreeNode {
      val,
      left: None,
      right: None
    }
  }
}

fn to_list_node(arr: Vec<i32>) -> Option<Box<ListNode>> {
    let mut head = None;
    let mut curr = &mut head;
    for val in arr {
        *curr = Some(Box::new(ListNode::new(val)));
        curr = &mut curr.as_mut().unwrap().next;
    }
    head
}

fn to_tree_node(arr: Vec<Option<i32>>) -> Option<std::rc::Rc<std::cell::RefCell<TreeNode>>> {
    if arr.is_empty() || arr[0].is_none() {
        return None;
    }
    let root = std::rc::Rc::new(std::cell::RefCell::new(TreeNode::new(arr[0].unwrap())));
    let mut queue = std::collections::VecDeque::new();
    queue.push_back(std::rc::Rc::clone(&root));
    let mut i = 1;
    while !queue.is_empty() && i < arr.len() {
        let curr = queue.pop_front().unwrap();
        if i < arr.len() {
            if let Some(val) = arr[i] {
                let left = std::rc::Rc::new(std::cell::RefCell::new(TreeNode::new(val)));
                curr.borrow_mut().left = Some(std::rc::Rc::clone(&left));
                queue.push_back(left);
            }
            i += 1;
        }
        if i < arr.len() {
            if let Some(val) = arr[i] {
                let right = std::rc::Rc::new(std::cell::RefCell::new(TreeNode::new(val)));
                curr.borrow_mut().right = Some(std::rc::Rc::clone(&right));
                queue.push_back(right);
            }
            i += 1;
        }
    }
    Some(root)
}

fn print_list_node(head: Option<Box<ListNode>>) {
    print!("[");
    let mut curr = head;
    let mut first = true;
    while let Some(node) = curr {
        if !first {
            print!(",");
        }
        print!("{}", node.val);
        first = false;
        curr = node.next;
    }
    println!("]");
}

fn print_tree_node(root: Option<std::rc::Rc<std::cell::RefCell<TreeNode>>>) {
    if root.is_none() {
        println!("[]");
        return;
    }
    let mut res = Vec::new();
    let mut queue = std::collections::VecDeque::new();
    queue.push_back(root);
    while !queue.is_empty() {
        let curr = queue.pop_front().unwrap();
        if let Some(node) = curr {
            res.push(Some(node.borrow().val));
            queue.push_back(node.borrow().left.clone());
            queue.push_back(node.borrow().right.clone());
        } else {
            res.push(None);
        }
    }
    while !res.is_empty() && res.last().unwrap().is_none() {
        res.pop();
    }
    print!("[");
    for (idx, val) in res.iter().enumerate() {
        if idx > 0 {
            print!(",");
        }
        if let Some(v) = val {
            print!("{}", v);
        } else {
            print!("null");
        }
    }
    println!("]");
}

struct Solution;

${code}

fn main() {
${testCalls}
}
`;
}

function generatePHPWrapper(code, methodName, parsedExamples, problem) {
  const paramTypes = getParamTypes(problem, 'php');
  const isList = code.includes('ListNode') || paramTypes.includes('ListNode') ||
                 parsedExamples.some(ex => Object.keys(ex.inputs).some(p => p.toLowerCase().includes('head')));
  const isTree = code.includes('TreeNode') || paramTypes.includes('TreeNode') ||
                 parsedExamples.some(ex => Object.keys(ex.inputs).some(p => p.toLowerCase().includes('root')));
  const isVoid = isVoidFunction(problem);

  let helpers = '';
  if (isList) {
    helpers += `
class ListNode {
    public $val;
    public $next;
    function __construct($val = 0, $next = null) {
        $this->val = $val;
        $this->next = $next;
    }
}

function toListNode($arr) {
    if (!is_array($arr) || empty($arr)) return null;
    $dummy = new ListNode(0);
    $curr = $dummy;
    foreach ($arr as $val) {
        $curr->next = new ListNode($val);
        $curr = $curr->next;
    }
    return $dummy->next;
}

function fromListNode($node) {
    if ($node == null || !($node instanceof ListNode)) return $node;
    $res = [];
    $curr = $node;
    while ($curr != null) {
        $res[] = $curr->val;
        $curr = $curr->next;
    }
    return $res;
}
`;
  }

  if (isTree) {
    helpers += `
class TreeNode {
    public $val;
    public $left;
    public $right;
    function __construct($val = 0, $left = null, $right = null) {
        $this->val = $val;
        $this->left = $left;
        $this->right = $right;
    }
}

function toTreeNode($arr) {
    if (!is_array($arr) || empty($arr) || $arr[0] === null) return null;
    $nodes = [];
    foreach ($arr as $val) {
        $nodes[] = ($val === null) ? null : new TreeNode($val);
    }
    $kids = array_reverse($nodes);
    $root = array_pop($kids);
    foreach ($nodes as $node) {
        if ($node != null) {
            if (!empty($kids)) $node->left = array_pop($kids);
            if (!empty($kids)) $node->right = array_pop($kids);
        }
    }
    return $root;
}

function fromTreeNode($root) {
    if ($root == null) return [];
    $res = [];
    $queue = [$root];
    while (!empty($queue)) {
        $node = array_shift($queue);
        if ($node != null) {
            $res[] = $node->val;
            $queue[] = $node->left;
            $queue[] = $node->right;
        } else {
            $res[] = null;
        }
    }
    while (!empty($res) && end($res) === null) {
        array_pop($res);
    }
    return $res;
}
`;
  }

  let testCalls = '';
  parsedExamples.forEach((ex, idx) => {
    const inputs = Object.values(ex.inputs);
    const paramNames = Object.keys(ex.inputs);
    const voidOutputIndex = isVoid ? findVoidOutputParam(paramNames, paramTypes) : 0;
    let argPrep = '';
    let argNames = [];

    paramNames.forEach((pname, pi) => {
      const val = inputs[pi];
      const actualArgName = `$arg_${pi}`;

      if (Array.isArray(val)) {
        if (pname.toLowerCase().includes('head') || isList) {
          argPrep += `  ${actualArgName} = toListNode(${JSON.stringify(val)});\n`;
        } else if (pname.toLowerCase().includes('root') || isTree) {
          argPrep += `  ${actualArgName} = toTreeNode(${JSON.stringify(val)});\n`;
        } else {
          argPrep += `  ${actualArgName} = ${JSON.stringify(val)};\n`;
        }
      } else if (typeof val === 'string') {
        argPrep += `  ${actualArgName} = "${val}";\n`;
      } else if (val === null || val === 'null') {
        argPrep += `  ${actualArgName} = null;\n`;
      } else {
        argPrep += `  ${actualArgName} = ${val};\n`;
      }
      argNames.push(actualArgName);
    });

    testCalls += `
try {
  $sol = new Solution();
${argPrep}  ${isVoid ? `$sol->${methodName}(${argNames.join(', ')});\n  $result = ${argNames[voidOutputIndex]};` : `$result = $sol->${methodName}(${argNames.join(', ')});`}
  if ($result instanceof ListNode) {
      $result = fromListNode($result);
  } else if ($result instanceof TreeNode) {
      $result = fromTreeNode($result);
  }
  echo "TEST_CASE_${idx}_RESULT:" . json_encode($result) . "\\n";
} catch (Exception $e) {
  echo "TEST_CASE_${idx}_ERROR:" . $e->getMessage() . "\\n";
}
`;
  });

  return `<?php
${helpers}

${code}

${testCalls}
?>`;
}

function generateRubyWrapper(code, methodName, parsedExamples, problem) {
  const snakeName = slugToSnake(methodName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, ''));
  const paramTypes = getParamTypes(problem, 'ruby');
  const isList = code.includes('ListNode') || paramTypes.includes('ListNode') ||
                 parsedExamples.some(ex => Object.keys(ex.inputs).some(p => p.toLowerCase().includes('head')));
  const isTree = code.includes('TreeNode') || paramTypes.includes('TreeNode') ||
                 parsedExamples.some(ex => Object.keys(ex.inputs).some(p => p.toLowerCase().includes('root')));
  const isVoid = isVoidFunction(problem);

  function toRubyLiteral(v) {
    if (v === null || v === 'null') return 'nil';
    if (Array.isArray(v)) {
      return '[' + v.map(toRubyLiteral).join(',') + ']';
    }
    if (typeof v === 'string') {
      return JSON.stringify(v);
    }
    return v;
  }

  let helpers = '';
  if (isList) {
    helpers += `
class ListNode
  attr_accessor :val, :next
  def initialize(val = 0, next_node = nil)
    @val = val
    @next = next_node
  end
end

def to_list_node(arr)
  return nil if !arr || arr.empty?
  dummy = ListNode.new(0)
  curr = dummy
  arr.each do |val|
    curr.next = ListNode.new(val)
    curr = curr.next
  end
  dummy.next
end

def from_list_node(node)
  return node if !node || !node.is_a?(ListNode)
  res = []
  curr = node
  while curr
    res << curr.val
    curr = curr.next
  end
  res
end
`;
  }

  if (isTree) {
    helpers += `
class TreeNode
  attr_accessor :val, :left, :right
  def initialize(val = 0, left = nil, right = nil)
    @val = val
    @left = left
    @right = right
  end
end

def to_tree_node(arr)
  return nil if !arr || arr.empty? || arr[0].nil?
  nodes = arr.map { |val| val.nil? ? nil : TreeNode.new(val) }
  kids = nodes.reverse
  root = kids.pop
  nodes.each do |node|
    if node
      node.left = kids.pop unless kids.empty?
      node.right = kids.pop unless kids.empty?
    end
  end
  root
end

def from_tree_node(root)
  return [] if !root
  res = []
  queue = [root]
  while !queue.empty?
    node = queue.shift
    if node
      res << node.val
      queue << node.left
      queue << node.right
    else
      res << nil
    end
  end
  res.pop while !res.empty? && res.last.nil?
  res
end
`;
  }

  let testCalls = '';
  parsedExamples.forEach((ex, idx) => {
    const inputs = Object.values(ex.inputs);
    const paramNames = Object.keys(ex.inputs);
    const voidOutputIndex = isVoid ? findVoidOutputParam(paramNames, paramTypes) : 0;
    let argPrep = '';
    let argNames = [];

    paramNames.forEach((pname, pi) => {
      const val = inputs[pi];
      const actualArgName = `arg_${pi}`;

      if (Array.isArray(val)) {
        if (pname.toLowerCase().includes('head') || isList) {
          argPrep += `  ${actualArgName} = to_list_node(${toRubyLiteral(val)})\n`;
        } else if (pname.toLowerCase().includes('root') || isTree) {
          argPrep += `  ${actualArgName} = to_tree_node(${toRubyLiteral(val)})\n`;
        } else {
          argPrep += `  ${actualArgName} = ${toRubyLiteral(val)}\n`;
        }
      } else if (typeof val === 'string') {
        argPrep += `  ${actualArgName} = "${val}"\n`;
      } else if (val === null || val === 'null') {
        argPrep += `  ${actualArgName} = nil\n`;
      } else {
        argPrep += `  ${actualArgName} = ${val}\n`;
      }
      argNames.push(actualArgName);
    });

    testCalls += `
begin
  require 'json'
${argPrep}  ${isVoid ? `${snakeName}(${argNames.join(', ')})\n  result = ${argNames[voidOutputIndex]}` : `result = ${snakeName}(${argNames.join(', ')})`}
  if result.class.name == 'ListNode'
    result = from_list_node(result)
  elsif result.class.name == 'TreeNode'
    result = from_tree_node(result)
  end
  puts "TEST_CASE_${idx}_RESULT:" + result.to_json
rescue => e
  puts "TEST_CASE_${idx}_ERROR:" + e.message
end
`;
  });

  return `require 'json'

${helpers}

${code}

${testCalls}`;
}

function runCode(lang, code, problem, examples) {
  const jobId = Math.random().toString(36).substring(2, 15);
  const langLower = lang.toLowerCase();
  const methodName = extractMethodName(problem, langLower, code);

  const isList = Object.values(problem?.code_snippets || {}).some(s => s.includes('ListNode')) || code.includes('ListNode');
  const isTree = Object.values(problem?.code_snippets || {}).some(s => s.includes('TreeNode')) || code.includes('TreeNode');

  let parsedExamples;
  if (examples.length > 0 && (examples[0].inputs !== undefined || examples[0].expectedOutput !== undefined || examples[0].expected !== undefined)) {
    // Already parsed/generated test cases!
    parsedExamples = examples.map(ex => ({
      inputs: ex.inputs || {},
      expectedOutput: ex.expectedOutput !== undefined ? ex.expectedOutput : ex.expected,
      _rawInputStr: ex._rawInputStr || ''
    }));
  } else {
    // Raw problem.examples with example_text
    parsedExamples = examples.map(ex => {
      try { return parseExample(ex.example_text); }
      catch (e) { return null; }
    }).filter(Boolean);

    // Enrich parsed examples: if any example has empty inputs but raw data exists,
    // try to extract param names from code snippets and map positional values
    parsedExamples = enrichParsedExamples(parsedExamples, problem, langLower);
  }

  if (parsedExamples.length === 0) {
    return { success: false, status: 'Error', error: 'Could not parse examples/testcases for this problem.' };
  }

  // Final validation: warn if any example still has empty inputs
  const emptyInputExamples = parsedExamples.filter(ex => Object.keys(ex.inputs).length === 0 && ex._rawInputStr && ex._rawInputStr.trim());
  if (emptyInputExamples.length > 0) {
    console.warn(`[runner] Warning: ${emptyInputExamples.length} example(s) have unparseable inputs for problem ${problem.problem_slug}`);
  }

  let filePath = '';
  let compileCmds = [];
  let runCmd = '';
  let cleanupFiles = [];
  let wrapperCode = '';

  try {
    switch (langLower) {
      case 'javascript': {
        filePath = path.join(TEMP_DIR, `run_${jobId}.js`);
        wrapperCode = generateJSWrapper(code, methodName, parsedExamples, problem);
        runCmd = `node ${filePath}`;
        cleanupFiles = [filePath];
        break;
      }

      case 'typescript': {
        filePath = path.join(TEMP_DIR, `run_${jobId}.ts`);
        wrapperCode = generateJSWrapper(code, methodName, parsedExamples, problem);
        runCmd = `npx tsx ${filePath}`;
        cleanupFiles = [filePath];
        break;
      }

      case 'python':
      case 'python3': {
        filePath = path.join(TEMP_DIR, `run_${jobId}.py`);
        wrapperCode = generatePythonWrapper(code, methodName, parsedExamples, problem);
        runCmd = `python3 ${filePath}`;
        cleanupFiles = [filePath];
        break;
      }

      case 'c': {
        filePath = path.join(TEMP_DIR, `run_${jobId}.c`);
        const binPath = path.join(TEMP_DIR, `run_${jobId}_bin`);
        wrapperCode = generateCWrapper(code, methodName, parsedExamples, problem);
        compileCmds = [`gcc -o ${binPath} ${filePath} -lm -Wall 2>&1`];
        runCmd = binPath;
        cleanupFiles = [filePath, binPath];
        break;
      }

      case 'cpp': {
        filePath = path.join(TEMP_DIR, `run_${jobId}.cpp`);
        const binPath = path.join(TEMP_DIR, `run_${jobId}_bin`);
        wrapperCode = generateCppWrapper(code, methodName, parsedExamples, problem);
        compileCmds = [`g++ -std=c++17 -o ${binPath} ${filePath} -Wall 2>&1`];
        runCmd = binPath;
        cleanupFiles = [filePath, binPath];
        break;
      }

      case 'java': {
        const javaDir = path.join(TEMP_DIR, `java_${jobId}`);
        fs.mkdirSync(javaDir, { recursive: true });
        try { fs.chmodSync(javaDir, 0o777); } catch (e) { }
        filePath = path.join(javaDir, 'Main.java');
        wrapperCode = generateJavaWrapper(code, methodName, parsedExamples, problem);
        compileCmds = [`javac ${filePath} 2>&1`];
        runCmd = `java -cp ${javaDir} Main`;
        cleanupFiles = [javaDir];
        break;
      }

      case 'golang': {
        filePath = path.join(TEMP_DIR, `run_${jobId}.go`);
        wrapperCode = generateGoWrapper(code, methodName, parsedExamples, problem);
        runCmd = `go run ${filePath}`;
        cleanupFiles = [filePath];
        break;
      }

      case 'rust': {
        filePath = path.join(TEMP_DIR, `run_${jobId}.rs`);
        const binPath = path.join(TEMP_DIR, `run_${jobId}_rs`);
        wrapperCode = generateRustWrapper(code, methodName, parsedExamples, problem);
        compileCmds = [`rustc -o ${binPath} ${filePath} 2>&1`];
        runCmd = binPath;
        cleanupFiles = [filePath, binPath];
        break;
      }

      case 'php': {
        filePath = path.join(TEMP_DIR, `run_${jobId}.php`);
        wrapperCode = generatePHPWrapper(code, methodName, parsedExamples, problem);
        runCmd = `php ${filePath}`;
        cleanupFiles = [filePath];
        break;
      }

      case 'ruby': {
        filePath = path.join(TEMP_DIR, `run_${jobId}.rb`);
        wrapperCode = generateRubyWrapper(code, methodName, parsedExamples, problem);
        runCmd = `ruby ${filePath}`;
        cleanupFiles = [filePath];
        break;
      }

      default:
        return { success: false, status: 'Unsupported', error: `Language "${lang}" is not supported for local execution.` };
    }

    fs.writeFileSync(filePath, wrapperCode);
    try { fs.chmodSync(filePath, 0o666); } catch (e) { }

    for (const compileCmd of compileCmds) {
      try {
        execSync(`su sandbox -s /bin/bash -c "timeout --kill-after=2 10 ${compileCmd}"`, {
          timeout: TIMEOUT_MS + 2000,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } catch (compileErr) {
        const stderr = compileErr.stderr || compileErr.stdout || compileErr.message || '';
        const sanitized = stderr.replace(new RegExp(TEMP_DIR + '[^\\s:]*', 'g'), '<file>');
        return {
          success: false,
          status: 'Compile Error',
          error: sanitized.substring(0, 2000),
          results: []
        };
      }
    }

    const startTime = Date.now();
    const sandboxCmd = `su sandbox -s /bin/bash -c "timeout --kill-after=2 ${Math.floor(TIMEOUT_MS / 1000)} ${runCmd}"`;
    const stdout = execSync(sandboxCmd, {
      timeout: TIMEOUT_MS + 2000,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024,
    });
    const executionTimeMs = Math.round(Date.now() - startTime);

    if (stdout.includes('COMPILE_SUCCESS') && !stdout.includes('TEST_CASE_')) {
      return {
        success: true,
        status: 'Compiled',
        compileOnly: true,
        executionTimeMs,
        results: []
      };
    }

    const results = parsedExamples.map((ex, idx) => {
      const resRegex = new RegExp(`TEST_CASE_${idx}_RESULT:(.*)`);
      const errRegex = new RegExp(`TEST_CASE_${idx}_ERROR:(.*)`);
      const resMatch = stdout.match(resRegex);
      const errMatch = stdout.match(errRegex);

      if (errMatch) {
        return {
          status: 'Runtime Error',
          passed: false,
          error: errMatch[1].trim(),
          input: ex.inputs,
          expected: ex.expectedOutput
        };
      }

      if (resMatch) {
        let actual;
        try { actual = JSON.parse(resMatch[1].trim()); }
        catch (e) { actual = resMatch[1].trim(); }

        const passed = isEqual(actual, ex.expectedOutput, isList || isTree);
        return {
          status: passed ? 'Accepted' : 'Wrong Answer',
          input: ex.inputs,
          actual,
          expected: ex.expectedOutput,
          passed
        };
      }

      return {
        status: 'No Output',
        passed: false,
        error: 'No output received for this testcase.',
        input: ex.inputs,
        expected: ex.expectedOutput
      };
    });

    const passedCount = results.filter(r => r.passed).length;
    const allPassed = results.length > 0 && passedCount === results.length;
    return {
      success: true,
      status: allPassed ? 'Accepted' : 'Wrong Answer',
      executionTimeMs,
      totalPassed: passedCount,
      totalCases: results.length,
      results
    };

  } catch (e) {
    const errMsg = e.stderr || e.message || 'Execution failed';
    const sanitized = errMsg.replace(new RegExp(TEMP_DIR + '[^\\s:]*', 'g'), '<file>');

    if (e.killed || (e.message && e.message.includes('TIMEOUT'))) {
      return {
        success: false,
        status: 'Time Limit Exceeded',
        error: `Execution timed out (${TIMEOUT_MS / 1000}s limit).`,
        results: []
      };
    }

    return {
      success: false,
      status: 'Runtime Error',
      error: sanitized.substring(0, 2000),
      results: []
    };
  } finally {
    try { execSync('pkill -u sandbox -9 2>/dev/null || true'); } catch (err) { }
    for (const f of cleanupFiles) {
      try {
        if (fs.existsSync(f)) {
          const stat = fs.statSync(f);
          if (stat.isDirectory()) {
            fs.rmSync(f, { recursive: true, force: true });
          } else {
            fs.unlinkSync(f);
          }
        }
      } catch (err) { }
    }
  }
}

module.exports = {
  runCode,
  parseExample,
  canRunLocally,
  getParamTypes,
  extractParamNamesFromSnippets,
  generateCWrapper,
  TIER1_LANGUAGES
};
