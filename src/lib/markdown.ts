const { marked } = require('marked');

// Configure marked with GitHub-Flavored Markdown and line breaks (enables plain text rendering)
marked.setOptions({
  gfm: true,
  breaks: true,
});

export function parseMarkdown(md: string): string {
  if (!md) return '';

  try {
    // Preprocess markdown
    let processed = md;

    // Clean up leading dots before headers (e.g. "...## Title" -> "## Title")
    processed = processed.replace(/^\s*\.*\s*(#+)/gm, '$1');

    // Replace $$ ... $$ blocks
    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
      const cleanFormula = formula
        .replace(/\\dots/g, '...')
        .replace(/\\bmod/g, ' mod ')
        .replace(/\\le/g, ' ≤ ')
        .replace(/\\ge/g, ' ≥ ')
        .replace(/\\ne/g, ' ≠ ')
        .replace(/\\times/g, ' × ')
        .replace(/\\/g, '');
      return `<div class="math-block">${cleanFormula.trim()}</div>`;
    });

    // Replace $ ... $ inline math
    processed = processed.replace(/\$(.*?)\$/g, (match, formula) => {
      if (formula.trim().startsWith('$') || formula.trim().endsWith('$')) return match;
      const cleanFormula = formula
        .replace(/\\dots/g, '...')
        .replace(/\\bmod/g, ' mod ')
        .replace(/\\le/g, ' ≤ ')
        .replace(/\\ge/g, ' ≥ ')
        .replace(/\\ne/g, ' ≠ ')
        .replace(/\\times/g, ' × ')
        .replace(/\\/g, '');
      return `<code class="math-inline">${cleanFormula.trim()}</code>`;
    });

    // Compile Markdown to HTML
    const html = marked.parse(processed) as string;

    // Sanitize the HTML using DOMPurify
    let cleanHtml = html;

    const allowedTags = [
      'div', 'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'strong', 'em', 'del', 'ins',
      'u', 'sub', 'sup', 'code', 'pre', 'ul', 'ol', 'li', 'table', 'thead', 'tbody',
      'tr', 'th', 'td', 'blockquote', 'hr', 'img', 'a', 'font'
    ];

    const allowedAttributes = [
      'href', 'title', 'src', 'alt', 'width', 'height', 'style', 'color', 'size', 'face', 'class', 'target', 'align'
    ];

    if (typeof window !== 'undefined') {
      try {
        const DOMPurify = require('dompurify');
        cleanHtml = DOMPurify.sanitize(html, {
          ALLOWED_TAGS: allowedTags,
          ALLOWED_ATTR: allowedAttributes,
          ALLOW_DATA_ATTR: false,
        });
      } catch (e) {
        console.error('Client-side DOMPurify error:', e);
        cleanHtml = html
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }
    } else {
      try {
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM('');
        const savedWindow = (global as any).window;
        const savedDocument = (global as any).document;

        (global as any).window = dom.window;
        (global as any).document = dom.window.document;

        const DOMPurifyFactory = require('dompurify');
        const purify = DOMPurifyFactory(dom.window);
        cleanHtml = purify.sanitize(html, {
          ALLOWED_TAGS: allowedTags,
          ALLOWED_ATTR: allowedAttributes,
          ALLOW_DATA_ATTR: false,
        });

        if (savedWindow === undefined) delete (global as any).window;
        else (global as any).window = savedWindow;

        if (savedDocument === undefined) delete (global as any).document;
        else (global as any).document = savedDocument;
      } catch (e) {
        console.error('Server-side DOMPurify error:', e);
        cleanHtml = html
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }
    }

    // Wrap tables in a horizontal-scroll container so wide tables stay
    // aligned (real table layout) while remaining scrollable on mobile.
    cleanHtml = cleanHtml.replace(
      /<table(\s[^>]*)?>/g,
      '<div class="table-wrapper"><table$1>'
    ).replace(/<\/table>/g, '</table></div>');

    // Replace <img ...>{width="539px"} or similar
    cleanHtml = cleanHtml.replace(/<img(.*?)>\{width="(.*?)"\}/g, (match, imgBody, width) => {
      return `<img${imgBody} width="${width}" style="max-width: 100%; height: auto; display: block; margin: 16px auto; border-radius: 8px;">`;
    });

    return cleanHtml;
  } catch (error) {
    console.error('Error parsing markdown:', error);
    // Safe plain text fallback with HTML escape
    return md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br />');
  }
}
