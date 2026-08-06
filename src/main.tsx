import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './lib/theme';
import { NotificationProvider } from './lib/notifications';
import { initAnalytics } from './lib/analytics';
import { initErrorLogger } from './lib/errorLogger';
import App from './App.tsx';
import BlogListPage from './components/BlogListPage.tsx';
import BlogPostPage from './components/BlogPostPage.tsx';
import NotFoundPage from './components/NotFoundPage.tsx';
import PrivacyPolicyPage from './components/PrivacyPolicyPage.tsx';
import TermsPage from './components/TermsPage.tsx';
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
          <Route path="/staff" element={<App entryMode="staff" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      </NotificationProvider>
    </ThemeProvider>
  </StrictMode>,
);
