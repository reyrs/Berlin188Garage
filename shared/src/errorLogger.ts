import { supabase } from './supabase';

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

export function logReactError(error: Error, source: string) {
  writeErrorLog(error.message, error.stack, source);
}
