import type { Json, TableRow } from '@/services/supabase/database.types';

export type FarmRecord = TableRow<'farms'>;
export type TankGroupRecord = TableRow<'tank_groups'>;
export type TankRecord = {
  active: boolean;
  code: string;
  created_at: string;
  farm_id: string;
  id: string;
  stocked_at: string | null;
  stocked_info: string | null;
  tank_group_id: string;
};
export type PhotoRecord = {
  captured_at: string;
  farm_id: string;
  id: string;
  storage_path: string;
  tank_id: string;
};
export type AiResultRecord = {
  affected_ratio: number;
  created_at: string;
  farm_id: string;
  fish: Json;
  fish_count: number;
  grade: 'normal' | 'suspect' | 'warning';
  id: string;
  model_version: string;
  photo_id: string;
  request_id: string;
  suspect_count: number;
  tank_id: string;
};

export type FarmOverview = {
  farm: FarmRecord;
  groups: TankGroupRecord[];
  tanks: TankRecord[];
};

export type CreateTankInput = {
  active?: boolean;
  code: string;
  groupName: string;
  stockedAt?: string | null;
  stockedInfo?: string | null;
};

export type UpdateTankInput = {
  active?: boolean;
  code?: string;
  groupName?: string;
  stockedAt?: string | null;
  stockedInfo?: string | null;
};

export type ListTanksOptions = {
  includeInactive?: boolean;
};

export type AiResultListOptions = {
  before?: string;
  limit?: number;
};

export type AiResultWithPhoto = AiResultRecord & {
  photo: PhotoRecord | null;
  photoUrl: string | null;
};
