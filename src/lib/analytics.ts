// Google Analytics 4 — no-op until VITE_GA_MEASUREMENT_ID is set (dev, or
// a deploy that hasn't been configured yet), so this is always safe to call.
const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

let initialized = false;

export function initAnalytics() {
  if (!GA_ID || initialized) return;
  initialized = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) { window.dataLayer.push(args); }
  (window as unknown as { gtag: typeof gtag }).gtag = gtag;
  gtag('js', new Date());
  // Sends the first page_view itself — later screen changes go through
  // trackPageView() below since this is an SPA with client-side view
  // switches that don't trigger new gtag.js page loads.
  gtag('config', GA_ID);
}

// Call on every meaningful in-app screen change (marketplace opened, order
// tracking opened, etc.) — GA4's automatic page_view only fires once, on
// the initial script load, and won't see client-side view switches that
// don't touch the URL.
export function trackPageView(screenName: string) {
  if (!GA_ID) return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  gtag?.('event', 'page_view', { page_title: screenName, page_path: `/${screenName}` });
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (!GA_ID) return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  gtag?.('event', name, params);
}
