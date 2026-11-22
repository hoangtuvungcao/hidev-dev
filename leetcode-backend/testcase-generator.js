const fs = require('fs');
const path = require('path');

const GENERATED_TESTS_DIR = fs.existsSync('/root/leetcode-problems')
  ? '/root/leetcode-problems/generated_tests'
  : path.join(__dirname, 'generated_tests');

if (!fs.existsSync(GENERATED_TESTS_DIR)) {
  try {
    fs.mkdirSync(GENERATED_TESTS_DIR, { recursive: true });
  } catch (e) {
    console.error('Failed to create generated_tests directory:', e);
  }
}

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables');
  }

  const models = [
    'gemini-3.5-flash',
    'gemini-2.5-flash',
    'gemini-3.1-flash-lite'
  ];

  let lastError = null;

  for (const model of models) {
    try {
      console.log(`Calling Gemini API using model: ${model}...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error for ${model}: ${response.status} ${response.statusText} - ${errText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error(`Empty response from Gemini API for model ${model}`);
      }
      return text;
    } catch (err) {
      console.warn(`Model ${model} failed: ${err.message}. Trying next model if available.`);
      lastError = err;
    }
  }

  throw new Error(`All Gemini models failed. Last error: ${lastError ? lastError.message : 'Unknown error'}`);
}

function cleanJsonResponse(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
  }
  return cleaned;
}

async function getOrGenerateTestCases(problem) {
  const slug = problem.problem_slug;
  const cachePath = path.join(GENERATED_TESTS_DIR, `${slug}.json`);

  // 1. Try to read from cache
  if (fs.existsSync(cachePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (e) {
      console.error(`Error reading cached test cases for ${slug}, will regenerate:`, e);
    }
  }

  // 2. Generate using Gemini
  console.log(`Generating test cases and reference solution for problem: ${slug}...`);
  const jsSnippet = problem.code_snippets?.javascript || '';
  const pySnippet = problem.code_snippets?.python3 || problem.code_snippets?.python || '';
  const fallbackSnippet = Object.values(problem.code_snippets || {})[0] || '';

  const prompt = `You are an expert LeetCode test case generator. Your task is to generate:
1. A correct, clean, and optimized reference solution in JavaScript.
2. A comprehensive suite of 10-15 distinct test case inputs based on the constraints.

Problem: ${problem.title}
Slug: ${problem.problem_slug}
Description:
${problem.description}

Constraints:
${JSON.stringify(problem.constraints, null, 2)}

JavaScript Starter Code:
${jsSnippet || '/* No JS starter code available, write the function from scratch */'}

You MUST return a JSON object with this exact structure:
{
  "reference_code": "...",
  "test_inputs": [
    { "paramName1": value1, "paramName2": value2 }
  ]
}

Rules:
- Fill in the JavaScript starter code correctly. The reference_code must compile and run in a standard Node.js environment.
- The reference_code must return the correct answer for any input based on the problem description.
- Generate 10-15 distinct test case inputs.
- The parameter names in "test_inputs" must EXACTLY match the parameters of the JavaScript function.
- Include basic examples described in the description.
- Strictly respect all problem constraints (e.g. if the problem says "each input has exactly one solution", your test cases MUST have exactly one unique correct answer).
- Include edge cases based on constraints (e.g. minimum/maximum bounds, empty strings, empty arrays, negative numbers).
- For ListNode: represent values as a simple flat JSON array of integers, e.g. [1, 2, 3] or null.
- For TreeNode: represent values as a level-order JSON array, e.g. [1, null, 2, 3] or null.
- All values must be valid JSON values. No raw expressions like 2**31.
- You must return ONLY the raw JSON object matching the requested schema. No markdown formatting.`;

  try {
    const rawResponse = await callGemini(prompt);
    const cleanedJson = cleanJsonResponse(rawResponse);
    const parsed = JSON.parse(cleanedJson);

    if (parsed.reference_code && Array.isArray(parsed.test_inputs) && parsed.test_inputs.length > 0) {
      // Run the reference code on inputs to compute correct expected outputs natively
      console.log(`Executing reference solution in JavaScript to compute outputs for ${slug}...`);
      const { runCode } = require('./runner');
      
      // Prepare inputs for the runner format
      const runnerInputs = parsed.test_inputs.map(inp => ({
        inputs: inp,
        expected: null // We don't care about expected here, we just want the output
      }));

      const runResult = runCode('javascript', parsed.reference_code, problem, runnerInputs);

      if (runResult.success && Array.isArray(runResult.results) && runResult.results.length > 0) {
        const validatedTestCases = runResult.results.map(r => {
          if (r.status === 'Runtime Error') {
            throw new Error(`Reference solution threw error: ${r.error}`);
          }
          return {
            inputs: r.input,
            expected: r.actual
          };
        });

        // Save to cache
        fs.writeFileSync(cachePath, JSON.stringify(validatedTestCases, null, 2));
        console.log(`Successfully generated, executed, and cached ${validatedTestCases.length} test cases for ${slug}.`);
        return validatedTestCases;
      } else {
        throw new Error(runResult.error || 'Execution of reference solution failed');
      }
    } else {
      throw new Error('Invalid JSON structure returned by Gemini (missing reference_code or test_inputs)');
    }
  } catch (err) {
    console.error(`Failed to generate test cases using reference solution for ${slug}:`, err);
  }

  // 3. Fallback to basic examples if anything fails
  console.log(`Falling back to basic examples for ${slug}`);
  return problem.examples || [];
}

module.exports = {
  getOrGenerateTestCases
};
