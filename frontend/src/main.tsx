import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@shared/theme';
import { NotificationProvider } from '@shared/notifications';
import { initAnalytics } from '@shared/analytics';
import { initErrorLogger } from '@shared/errorLogger';
import App from './App';
import BlogListPage from './components/BlogListPage';
import BlogPostPage from './components/BlogPostPage';
import NotFoundPage from '@shared/components/NotFoundPage';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import TermsPage from './components/TermsPage';
import './index.css';

initAnalytics();
initErrorLogger();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/blog" element={<BlogListPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/privasi" element={<PrivacyPolicyPage />} />
            <Route path="/syarat" element={<TermsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </ThemeProvider>
  </StrictMode>,
);
