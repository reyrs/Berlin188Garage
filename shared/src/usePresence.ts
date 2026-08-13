import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

export function usePresence(userId: string | undefined): Set<string> {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!supabase || !userId) {
      setOnlineIds(new Set());
      return;
    }

    if (subscribedRef.current) return;

    const channel = supabase.channel('staff-presence', {
      config: { presence: { key: userId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        setOnlineIds(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    subscribedRef.current = true;

    return () => {
      subscribedRef.current = false;
      channel.untrack();
      channel.unsubscribe();
    };
  }, [userId]);

  return onlineIds;
}
