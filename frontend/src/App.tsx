import React, { useState, useEffect, Suspense } from 'react';
import { Bell } from 'lucide-react';
import LandingPage from './components/LandingPage';
import TrackingPortal from './components/TrackingPortal';
import PromoPopupModal from './components/PromoPopupModal';
// Lazy-loaded — the 1107-product catalog it pulls in is heavy, and most
// visitors (landing page, order tracking) never open the marketplace.
const ProductMarketplace = React.lazy(() => import('./components/ProductMarketplace'));
import { HeroContent, PortfolioItem, PromoPopup, BlogPost } from '@shared/types';
import { fetchHeroContent, fetchPortfolioItems, fetchPromoPopup, fetchPublishedBlogPosts } from '@shared/db';
import { trackPageView } from '@shared/analytics';

type CurrentView = 'landing' | 'tracking' | 'marketplace';

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-gray-400 text-sm">
      Memuat...
    </div>
  );
}

export default function App() {
  const [heroContent, setHeroContent] = useState<HeroContent | null>(null);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [promoPopup, setPromoPopup] = useState<PromoPopup | null>(null);
  const [recentBlogPosts, setRecentBlogPosts] = useState<BlogPost[]>([]);
  // `?track=<no HP>` — dipakai link WA yang dikirim ke customer (lihat
  // shared/src/whatsapp.ts buildTrackingLink) biar langsung ke halaman
  // tracking dengan no HP udah keisi, bukan nyuruh customer ketik ulang
  // dari landing page.
  const [currentView, setCurrentView] = useState<CurrentView>(() =>
    new URLSearchParams(window.location.search).get('track') ? 'tracking' : 'landing'
  );
  const [trackingQuery] = useState(() => new URLSearchParams(window.location.search).get('track') || '');
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    trackPageView(currentView);
  }, [currentView]);

  useEffect(() => {
    fetchHeroContent().then(setHeroContent).catch(err => console.error('Failed to load hero content:', err));
    fetchPortfolioItems().then(setPortfolioItems).catch(err => console.error('Failed to load portfolio items:', err));
    fetchPromoPopup().then(setPromoPopup).catch(err => console.error('Failed to load promo popup:', err));
    fetchPublishedBlogPosts().then(setRecentBlogPosts).catch(err => console.error('Failed to load blog posts:', err));
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div className="min-h-screen bg-white">
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-gray-200 p-4 rounded-xl shadow-lg max-w-sm flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
          <Bell className="w-5 h-5 text-black shrink-0 mt-0.5" />
          <p className="text-gray-800 text-sm leading-snug">{notification}</p>
        </div>
      )}

      {currentView === 'landing' && (
        <>
          <LandingPage
            onCheckOrder={() => setCurrentView('tracking')}
            onOpenMarketplace={() => setCurrentView('marketplace')}
            heroContent={heroContent}
            portfolioItems={portfolioItems}
            recentBlogPosts={recentBlogPosts}
          />
          <PromoPopupModal promo={promoPopup} />
        </>
      )}

      {currentView === 'marketplace' && (
        <Suspense fallback={<LoadingFallback />}>
          <ProductMarketplace />
        </Suspense>
      )}

      {currentView === 'tracking' && (
        <TrackingPortal
          orders={[]}
          onBack={() => setCurrentView('landing')}
          onApproveServiceItem={() => {}}
          onRejectServiceItem={() => {}}
          onNotify={showNotification}
          initialSearchQuery={trackingQuery}
        />
      )}
    </div>
  );
}
