import DOMPurify from 'dompurify'

// Whitelist sengaja sempit — cuma tag yang beneran dipakai toolbar Tiptap
// di BlogEditor (bold/italic/heading/list/link/gambar). Konten cuma bisa
// ditulis staff marketing/owner (RLS), tapi ini tetap defense-in-depth
// murah buat cegah HTML/script mentah nyasar dari paste clipboard.
const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'img', 'blockquote']
const ALLOWED_ATTR = ['href', 'src', 'alt', 'target', 'rel']

export function sanitizeBlogHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR })
}
