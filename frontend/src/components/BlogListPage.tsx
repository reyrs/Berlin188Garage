import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BlogPost } from '@shared/types';
import { fetchPublishedBlogPosts } from '@shared/db';
import CurveAccent from '@shared/components/CurveAccent';

export const BLOG_CATEGORIES: BlogPost['category'][] = ['Tips Perawatan', 'Berita Bengkel', 'Promo'];

export default function BlogListPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<BlogPost['category'] | null>(null);

  useEffect(() => {
    fetchPublishedBlogPosts()
      .then(setPosts)
      .catch(err => console.error('Failed to load blog posts:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = filter ? posts.filter(p => p.category === filter) : posts;

  return (
    <div className="min-h-screen bg-white text-berlin-navy font-sans">
      <header className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-16">
          <Link to="/" className="flex items-center">
            <img src="/logo-on-white.png" alt="Berlin 188 Garage" className="h-9 object-contain" />
          </Link>
          <Link to="/" className="spec-label text-gray-500 hover:text-berlin-navy transition-colors inline-flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Beranda
          </Link>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-16 md:py-20">
        <p className="spec-label text-berlin-red mb-3">Blog</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-8">Tips & kabar dari Berlin 188 Garage</h1>

        <div className="flex gap-6 border-b border-gray-100 mb-10 overflow-x-auto">
          <button onClick={() => setFilter(null)}
            className={`relative spec-label pb-3 whitespace-nowrap transition-colors cursor-pointer ${!filter ? 'text-berlin-navy' : 'text-gray-400 hover:text-gray-600'}`}>
            Semua
            <CurveAccent active={!filter} />
          </button>
          {BLOG_CATEGORIES.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className={`relative spec-label pb-3 whitespace-nowrap transition-colors cursor-pointer ${filter === c ? 'text-berlin-navy' : 'text-gray-400 hover:text-gray-600'}`}>
              {c}
              <CurveAccent active={filter === c} />
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-16">Memuat artikel...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-6 rounded-xl border border-dashed border-gray-300">
            <p className="text-sm font-medium text-gray-500">
              {posts.length === 0 ? 'Artikel segera hadir.' : 'Belum ada artikel untuk kategori ini.'}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(post => (
              <Link key={post.id} to={`/blog/${post.slug}`} className="group block">
                <div className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 mb-3">
                  <img src={post.coverImageUrl} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" referrerPolicy="no-referrer" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-berlin-red">{post.category}</span>
                <h2 className="font-bold text-base text-berlin-navy mt-1 leading-snug group-hover:text-berlin-red transition-colors">{post.title}</h2>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2">{post.excerpt}</p>
                <p className="text-[10px] text-gray-400 mt-2 font-sans">
                  {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
