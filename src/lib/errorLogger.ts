import { supabase } from './supabase';

// Self-hosted error monitoring — writes to the `error_logs` table (see
// supabase/migrations/20260806140000_create_error_logs.sql) instead of a
// third-party service like Sentry, so it works immediately without anyone
// signing up for a new account. Owner/manager review logged errors in the
// staff dashboard's Log Aktivitas panel.

const MAX_STACK_LENGTH = 4000;

async function writeErrorLog(message: string, stack: string | undefined, source: string) {
  if (!supabase) return;
  try {
    await supabase.from('error_logs').insert({
      message: message.slice(0, 2000),
      stack: stack?.slice(0, MAX_STACK_LENGTH),
      source,
      page_url: window.location.href,
      user_agent: navigator.userAgent,
    });
  } catch {
    // Logging the logger's own failure would risk an infinite loop —
    // silently drop it. Losing one error report isn't worth that risk.
  }
}

let initialized = false;

export function initErrorLogger() {
  if (initialized) return;
  initialized = true;

  window.addEventListener('error', (event) => {
    writeErrorLog(event.message, event.error?.stack, 'window.onerror');
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    writeErrorLog(message, stack, 'unhandledrejection');
  });
}

// Called from React error boundaries (componentDidCatch), which catch
// render-time errors that window.onerror does not see.
export function logReactError(error: Error, source: string) {
  writeErrorLog(error.message, error.stack, source);
}
