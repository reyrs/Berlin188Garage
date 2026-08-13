import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BlogPost } from '@shared/types';
import { fetchBlogPostBySlug } from '@shared/db';
import { sanitizeBlogHtml } from '@shared/sanitize';

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!slug) { setIsLoading(false); return; }
    fetchBlogPostBySlug(slug)
      .then(setPost)
      .catch(err => console.error('Failed to load blog post:', err))
      .finally(() => setIsLoading(false));
  }, [slug]);

  // Google's crawler renders JS so this still helps SEO even though it
  // won't help WhatsApp/Facebook link previews (those don't run JS at all
  // — a known, accepted limitation, see the design spec).
  useEffect(() => {
    if (!post) return;
    document.title = `${post.title} — Berlin 188 Garage`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', post.excerpt);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `https://www.berlin188.com/blog/${post.slug}`);

    return () => {
      document.title = 'Berlin 188 Garage';
      canonical?.remove();
    };
  }, [post]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Memuat artikel...</div>;
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-lg font-bold text-berlin-navy">Artikel nggak ditemukan.</p>
        <p className="text-sm text-gray-500">Mungkin link-nya salah atau artikelnya sudah tidak tersedia.</p>
        <Link to="/blog" className="text-sm font-semibold text-berlin-red hover:underline">Lihat semua artikel</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-berlin-navy font-sans">
      <header className="border-b border-gray-100">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-6 h-16">
          <Link to="/" className="flex items-center">
            <img src="/logo-on-white.png" alt="Berlin 188 Garage" className="h-9 object-contain" />
          </Link>
          <Link to="/blog" className="spec-label text-gray-500 hover:text-berlin-navy transition-colors inline-flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Semua Artikel
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-14 md:py-20">
        <span className="text-[10px] font-bold uppercase tracking-widest text-berlin-red">{post.category}</span>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mt-2 mb-3 leading-tight">{post.title}</h1>
        <p className="text-xs text-gray-400 font-sans mb-8">
          {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
        </p>

        <div className="aspect-[16/9] rounded-xl overflow-hidden bg-gray-100 mb-10">
          <img src={post.coverImageUrl} alt={post.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>

        <div
          className="prose prose-sm sm:prose-base max-w-none prose-headings:font-extrabold prose-headings:text-berlin-navy prose-a:text-berlin-red"
          dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(post.content) }}
        />
      </article>
    </div>
  );
}
