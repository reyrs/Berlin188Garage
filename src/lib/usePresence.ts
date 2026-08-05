import { useEffect, useState } from 'react';
import { supabase } from './supabase';

// Real online/offline via Supabase Realtime Presence — a client is "online"
// for exactly as long as its websocket channel stays connected (tab open,
// logged in). No polling, no fake "AKTIF ONLINE" label — this is the actual
// live membership of the shared 'staff-presence' channel.
export function usePresence(userId: string | undefined): Set<string> {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!supabase || !userId) {
      setOnlineIds(new Set());
      return;
    }

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

    return () => {
      // untrack() dulu sebelum unsubscribe — kalau cuma unsubscribe/putus
      // koneksi, server Realtime nunggu heartbeat timeout buat sadar peer
      // ini beneran pergi (bisa nyangkut "online" lama setelah logout).
      // untrack() eksplisit ngirim event "leave" langsung ke semua klien
      // lain yang subscribe channel yang sama.
      channel.untrack().then(() => channel.unsubscribe());
    };
  }, [userId]);

  return onlineIds;
}
