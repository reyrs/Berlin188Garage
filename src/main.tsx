import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './lib/theme';
import { NotificationProvider } from './lib/notifications';
import { initAnalytics } from './lib/analytics';
import App from './App.tsx';
import BlogListPage from './components/BlogListPage.tsx';
import BlogPostPage from './components/BlogPostPage.tsx';
import NotFoundPage from './components/NotFoundPage.tsx';
import './index.css';

initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <NotificationProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/blog" element={<BlogListPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/staff" element={<App entryMode="staff" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      </NotificationProvider>
    </ThemeProvider>
  </StrictMode>,
);
