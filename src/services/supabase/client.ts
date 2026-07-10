import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseConfig, type SupabaseConfig } from '@/services/supabase/config';
import type { Database } from '@/services/supabase/database.types';

export type NupchiSupabaseClient = SupabaseClient<Database>;

let singleton: NupchiSupabaseClient | undefined;

export function createSupabaseClient(config: SupabaseConfig = getSupabaseConfig()): NupchiSupabaseClient {
  return createClient<Database>(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function getSupabaseClient(): NupchiSupabaseClient {
  singleton ??= createSupabaseClient();
  return singleton;
}
