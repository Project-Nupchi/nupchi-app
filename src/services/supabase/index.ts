export { createSupabaseClient, getSupabaseClient } from '@/services/supabase/client';
export type { NupchiSupabaseClient } from '@/services/supabase/client';
export {
  getSupabaseConfig,
  isUuid,
  PHOTO_BUCKET,
  SupabaseConfigurationError,
} from '@/services/supabase/config';
export type { SupabaseConfig } from '@/services/supabase/config';
export type { Database, Json, TableInsert, TableName, TableRow, TableUpdate } from '@/services/supabase/database.types';
export { mapSupabaseError, SupabaseDataError } from '@/services/supabase/errors';
export type { SupabaseDataErrorCode } from '@/services/supabase/errors';
export { getSupabaseRepository, SupabaseRepository } from '@/services/supabase/repository';
export type {
  AiResultListOptions,
  AiResultRecord,
  AiResultWithPhoto,
  CreateTankInput,
  FarmOverview,
  FarmRecord,
  ListTanksOptions,
  PhotoRecord,
  TankGroupRecord,
  TankRecord,
  UpdateTankInput,
} from '@/services/supabase/types';
