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
  gtag('config', GA_ID);
}

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
