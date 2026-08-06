import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface LegalPageProps {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}

export default function LegalPage({ title, updatedAt, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-berlin-navy dark:text-white font-sans">
      <header className="border-b border-gray-100 dark:border-[#2a2d35]">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-6 h-16">
          <Link to="/" className="flex items-center">
            <img src="/logo-on-white.png" alt="Berlin 188 Garage" className="h-9 object-contain" />
          </Link>
          <Link to="/" className="spec-label text-gray-500 dark:text-gray-400 hover:text-berlin-navy dark:hover:text-white transition-colors inline-flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Beranda
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-14 md:py-20">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-3 leading-tight">{title}</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 font-sans mb-10">Berlaku sejak {updatedAt}</p>

        <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert prose-headings:font-extrabold prose-headings:text-berlin-navy dark:prose-headings:text-white prose-a:text-berlin-red">
          {children}
        </div>
      </article>
    </div>
  );
}
