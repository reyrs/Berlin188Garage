import { describe, it, expect } from 'vitest';
import { sanitizeBlogHtml } from './sanitize';

describe('sanitizeBlogHtml', () => {
  it('keeps allowed formatting tags', () => {
    const html = '<h2>Judul</h2><p>Isi <strong>tebal</strong> dan <em>miring</em>.</p>';
    expect(sanitizeBlogHtml(html)).toBe(html);
  });

  it('keeps links and images with their expected attributes', () => {
    const html = '<a href="https://example.com" target="_blank" rel="noopener">Link</a><img src="/x.jpg" alt="foto" />';
    const result = sanitizeBlogHtml(html);
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('src="/x.jpg"');
    expect(result).toContain('alt="foto"');
  });

  it('strips <script> tags entirely', () => {
    const result = sanitizeBlogHtml('<p>Halo</p><script>alert("xss")</script>');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert');
    expect(result).toContain('<p>Halo</p>');
  });

  it('strips inline event handler attributes (onerror, onclick, etc.)', () => {
    const result = sanitizeBlogHtml('<img src="x.jpg" onerror="alert(1)" />');
    expect(result).not.toContain('onerror');
  });

  it('strips javascript: URLs in links', () => {
    const result = sanitizeBlogHtml('<a href="javascript:alert(1)">klik</a>');
    expect(result.toLowerCase()).not.toContain('javascript:');
  });

  it('strips tags outside the toolbar whitelist (iframe, style)', () => {
    const result = sanitizeBlogHtml('<p>Isi</p><iframe src="evil.com"></iframe><style>body{display:none}</style>');
    expect(result).not.toContain('<iframe');
    expect(result).not.toContain('<style');
    expect(result).toContain('<p>Isi</p>');
  });
});
