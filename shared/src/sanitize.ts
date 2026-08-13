import DOMPurify from 'dompurify'

const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre', 'hr']
const ALLOWED_ATTR = ['href', 'src', 'alt', 'target', 'rel']

export function sanitizeBlogHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR })
}
