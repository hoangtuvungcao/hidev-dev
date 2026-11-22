import { parseMarkdown } from '../lib/markdown';

describe('Markdown Parser & Sanitizer Tests', () => {
  it('should parse headings, bold text, lists, and code blocks', () => {
    const md = '# Heading 1\n## Heading 2\n**bold**\n* item 1\n* item 2\n```javascript\nconsole.log("hello")\n```';
    const html = parseMarkdown(md);
    
    expect(html).toContain('<h1>Heading 1</h1>');
    expect(html).toContain('<h2>Heading 2</h2>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<li>item 1</li>');
    expect(html).toContain('<pre>');
    expect(html).toContain('console.log("hello")');
  });

  it('should sanitize raw HTML tags and prevent XSS injection', () => {
    const maliciousMd = '<script>alert("hack")</script>\n<img src="x" onerror="alert(1)" />\n[Link](javascript:alert(1))';
    const cleanHtml = parseMarkdown(maliciousMd);
    
    // Ensure dangerous tags and event handlers are completely removed
    expect(cleanHtml).not.toContain('<script>');
    expect(cleanHtml).not.toContain('onerror');
    expect(cleanHtml).not.toContain('href="javascript:');
    
    // Ensure safe image structure remains but without the payload
    expect(cleanHtml).toContain('<img src="x">');
  });

  it('should support rich styling options such as text colors and sizes', () => {
    const styledMd = '<span style="color:red; font-size:20px;">Styled Text</span>';
    const html = parseMarkdown(styledMd);
    
    expect(html).toContain('<span style="color:red; font-size:20px;">Styled Text</span>');
  });

  it('should support plain text rendering with standard paragraphs and line breaks', () => {
    const textMd = 'This is line 1.\nThis is line 2.\n\nThis is paragraph 2.';
    const html = parseMarkdown(textMd);
    
    expect(html).toContain('This is line 1.<br>This is line 2.');
    expect(html).toContain('<p>This is paragraph 2.</p>');
  });
});
