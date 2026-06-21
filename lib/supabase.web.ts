import "react-native-url-polyfill/auto";

import type { WebSocketLikeConstructor } from "@supabase/realtime-js";
import { createClient, processLock } from "@supabase/supabase-js";
import NodeWebSocket from "ws";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const realtimeTransport = (
  typeof window === "undefined" ? NodeWebSocket : globalThis.WebSocket
) as WebSocketLikeConstructor;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock
      },
      realtime: {
        transport: realtimeTransport
      }
    })
  : null;
