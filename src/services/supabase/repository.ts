import type { NupchiSupabaseClient } from '@/services/supabase/client';
import { getSupabaseClient } from '@/services/supabase/client';
import { getSupabaseConfig, isUuid, PHOTO_BUCKET } from '@/services/supabase/config';
import type { Database, Json } from '@/services/supabase/database.types';
import { invalidInput, mapSupabaseError, notFound, SupabaseDataError } from '@/services/supabase/errors';
import type {
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
import { overallGradeFromMetrics } from '@/services/inference/grading';

const FARM_COLUMNS = 'id, name, created_at';
const GROUP_COLUMNS = 'id, farm_id, name, created_at';
const DESIRED_TANK_COLUMNS = 'id, farm_id, tank_group_id, code, stocked_at, stocked_info, active, created_at';
const LEGACY_TANK_COLUMNS = 'id, farm_id, tank_group_id, code, stocked_at, created_at';
const DESIRED_PHOTO_COLUMNS = 'id, farm_id, tank_id, storage_path, captured_at';
const LEGACY_PHOTO_COLUMNS = 'id, farm_id, daily_record_id, storage_path, captured_at';
const DAILY_RECORD_COLUMNS = 'id, tank_id';
const DESIRED_AI_RESULT_COLUMNS =
  'id, farm_id, tank_id, photo_id, request_id, grade, fish_count, suspect_count, affected_ratio, fish, model_version, created_at';
const LEGACY_AI_RESULT_COLUMNS =
  'id, farm_id, photo_id, grade, fish_count, suspect_count, affected_ratio, fish, model_version, created_at';
const DEFAULT_HISTORY_LIMIT = 20;
const MAX_HISTORY_LIMIT = 100;
const MAX_LEGACY_HISTORY_SCAN = 1_000;
const IN_FILTER_CHUNK_SIZE = 100;
const DEFAULT_SIGNED_URL_SECONDS = 60 * 60;
const MAX_SIGNED_URL_SECONDS = 60 * 60 * 24 * 7;

type TankUpdate = Database['public']['Tables']['tanks']['Update'];
type LegacyTankUpdate = Pick<TankUpdate, 'code' | 'stocked_at' | 'tank_group_id'>;
type TankLike = {
  active?: boolean | null;
  code: string;
  created_at: string;
  farm_id: string;
  id: string;
  stocked_at: string | null;
  stocked_info?: string | null;
  tank_group_id: string;
};
type PhotoLike = {
  captured_at: string;
  farm_id: string;
  id: string;
  storage_path: string;
  tank_id?: string | null;
};
type LegacyPhotoLike = Omit<PhotoLike, 'tank_id'> & { daily_record_id: string | null };
type AiResultLike = {
  affected_ratio: number | null;
  created_at: string;
  farm_id: string;
  fish: Json | null;
  fish_count: number | null;
  grade: string;
  id: string;
  model_version: string | null;
  photo_id: string;
  request_id?: string | null;
  suspect_count: number | null;
  tank_id?: string | null;
};

export class SupabaseRepository {
  constructor(
    private readonly client: NupchiSupabaseClient = getSupabaseClient(),
    readonly farmId: string = getSupabaseConfig().farmId
  ) {
    if (!isUuid(farmId)) throw invalidInput('SupabaseRepository', '어가 ID가 올바른 UUID가 아닙니다.');
  }

  async getFarm(): Promise<FarmRecord> {
    const operation = '어가 조회';
    try {
      const { data, error } = await this.client
        .from('farms')
        .select(FARM_COLUMNS)
        .eq('id', this.farmId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound(operation, '설정된 어가를 찾을 수 없습니다.');
      return data;
    } catch (error) {
      throw mapSupabaseError(error, operation);
    }
  }

  async listTankGroups(): Promise<TankGroupRecord[]> {
    const operation = '수조 그룹 조회';
    try {
      const { data, error } = await this.client
        .from('tank_groups')
        .select(GROUP_COLUMNS)
        .eq('farm_id', this.farmId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    } catch (error) {
      throw mapSupabaseError(error, operation);
    }
  }

  async listTanks(options: ListTanksOptions = {}): Promise<TankRecord[]> {
    const operation = '수조 목록 조회';
    try {
      return await this.listDesiredTanks(options);
    } catch (error) {
      if (!isMissingColumnError(error)) throw mapSupabaseError(error, operation);
    }

    try {
      return await this.listLegacyTanks();
    } catch (error) {
      throw mapSupabaseError(error, operation);
    }
  }

  async getFarmOverview(options: ListTanksOptions = {}): Promise<FarmOverview> {
    const [farm, groups, tanks] = await Promise.all([
      this.getFarm(),
      this.listTankGroups(),
      this.listTanks(options),
    ]);
    return { farm, groups, tanks };
  }

  async findOrCreateTankGroup(rawName: string): Promise<TankGroupRecord> {
    const operation = '수조 그룹 저장';
    const name = normalizeRequiredText(rawName, operation, '수조 그룹명을 입력해 주세요.');

    try {
      const existing = await this.findTankGroupByName(name);
      if (existing) return existing;

      const { data, error } = await this.client
        .from('tank_groups')
        .insert({ farm_id: this.farmId, name })
        .select(GROUP_COLUMNS)
        .single();

      if (!error) return data;
      if (error.code !== '23505') throw error;

      // unique(farm_id, name) 경합에서 다른 요청이 먼저 만든 행을 다시 읽는다.
      const raced = await this.findTankGroupByName(name);
      if (raced) return raced;
      throw error;
    } catch (error) {
      throw mapSupabaseError(error, operation);
    }
  }

  async createTank(input: CreateTankInput): Promise<TankRecord> {
    const operation = '수조 추가';
    const code = normalizeTankCode(input.code, operation);
    const groupName = normalizeRequiredText(input.groupName, operation, '수조 그룹명을 입력해 주세요.');
    const stockedAt = normalizeOptionalDate(input.stockedAt, operation);
    const group = await this.findOrCreateTankGroup(groupName);

    try {
      return await this.createDesiredTank(input, code, stockedAt, group.id);
    } catch (error) {
      if (!isMissingColumnError(error)) throw mapSupabaseError(error, operation);
    }

    try {
      const { data, error } = await this.client
        .from('tanks')
        .insert({
          code,
          farm_id: this.farmId,
          stocked_at: stockedAt,
          tank_group_id: group.id,
        })
        .select(LEGACY_TANK_COLUMNS)
        .single();
      if (error) throw error;
      return normalizeTank(data);
    } catch (error) {
      throw mapSupabaseError(error, operation);
    }
  }

  async updateTank(tankId: string, input: UpdateTankInput): Promise<TankRecord> {
    const operation = '수조 수정';
    assertUuid(tankId, operation, '수조 ID');
    const update = await this.buildTankUpdate(input, operation);
    if (Object.keys(update).length === 0) {
      throw invalidInput(operation, '수정할 값을 하나 이상 입력해 주세요.');
    }

    try {
      return await this.updateDesiredTank(tankId, update);
    } catch (error) {
      if (!isMissingColumnError(error)) throw mapSupabaseError(error, operation);
    }

    try {
      return await this.updateLegacyTank(tankId, update);
    } catch (error) {
      throw mapSupabaseError(error, operation);
    }
  }

  async listAllAiResults(options: AiResultListOptions = {}): Promise<AiResultRecord[]> {
    return this.queryAiResults(undefined, options);
  }

  async listAiResultsByTank(tankId: string, options: AiResultListOptions = {}): Promise<AiResultRecord[]> {
    assertUuid(tankId, '수조 진단 이력 조회', '수조 ID');
    return this.queryAiResults(tankId, options);
  }

  async listAllAiResultsWithPhotoUrls(options: AiResultListOptions = {}): Promise<AiResultWithPhoto[]> {
    return this.attachPhotos(await this.listAllAiResults(options));
  }

  async listAiResultsByTankWithPhotoUrls(
    tankId: string,
    options: AiResultListOptions = {}
  ): Promise<AiResultWithPhoto[]> {
    return this.attachPhotos(await this.listAiResultsByTank(tankId, options));
  }

  async createSignedPhotoUrl(
    storagePath: string,
    expiresInSeconds = DEFAULT_SIGNED_URL_SECONDS
  ): Promise<string> {
    const operation = '사진 URL 생성';
    const path = normalizeStoragePath(storagePath, operation);
    const expiresIn = normalizeExpiry(expiresInSeconds, operation);

    try {
      const { data, error } = await this.client.storage.from(PHOTO_BUCKET).createSignedUrl(path, expiresIn);
      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      throw mapSupabaseError(error, operation);
    }
  }

  async createSignedPhotoUrls(
    storagePaths: string[],
    expiresInSeconds = DEFAULT_SIGNED_URL_SECONDS
  ): Promise<Map<string, string | null>> {
    const operation = '사진 URL 목록 생성';
    const expiresIn = normalizeExpiry(expiresInSeconds, operation);
    const normalizedPairs = storagePaths.map((original) => ({
      normalized: normalizeStoragePath(original, operation),
      original,
    }));
    const uniquePaths = [...new Set(normalizedPairs.map(({ normalized }) => normalized))];
    if (uniquePaths.length === 0) return new Map();

    try {
      const { data, error } = await this.client.storage
        .from(PHOTO_BUCKET)
        .createSignedUrls(uniquePaths, expiresIn);
      if (error) throw error;

      const byNormalizedPath = new Map(data.map((item) => [item.path, item.error ? null : item.signedUrl]));
      return new Map(
        normalizedPairs.map(({ normalized, original }) => [original, byNormalizedPath.get(normalized) ?? null])
      );
    } catch (error) {
      throw mapSupabaseError(error, operation);
    }
  }

  private async listDesiredTanks(options: ListTanksOptions): Promise<TankRecord[]> {
    let query = this.client
      .from('tanks')
      .select(DESIRED_TANK_COLUMNS)
      .eq('farm_id', this.farmId);
    if (!options.includeInactive) query = query.eq('active', true);

    const { data, error } = await query.order('code', { ascending: true });
    if (error) throw error;
    return data.map(normalizeTank);
  }

  private async listLegacyTanks(): Promise<TankRecord[]> {
    const { data, error } = await this.client
      .from('tanks')
      .select(LEGACY_TANK_COLUMNS)
      .eq('farm_id', this.farmId)
      .order('code', { ascending: true });
    if (error) throw error;
    return data.map(normalizeTank);
  }

  private async createDesiredTank(
    input: CreateTankInput,
    code: string,
    stockedAt: string | null,
    groupId: string
  ): Promise<TankRecord> {
    const { data, error } = await this.client
      .from('tanks')
      .insert({
        active: input.active ?? true,
        code,
        farm_id: this.farmId,
        stocked_at: stockedAt,
        stocked_info: normalizeOptionalText(input.stockedInfo),
        tank_group_id: groupId,
      })
      .select(DESIRED_TANK_COLUMNS)
      .single();
    if (error) throw error;
    return normalizeTank(data);
  }

  private async buildTankUpdate(input: UpdateTankInput, operation: string): Promise<TankUpdate> {
    const update: TankUpdate = {};
    if (input.active !== undefined) update.active = input.active;
    if (input.code !== undefined) update.code = normalizeTankCode(input.code, operation);
    if (input.stockedAt !== undefined) update.stocked_at = normalizeOptionalDate(input.stockedAt, operation);
    if (input.stockedInfo !== undefined) update.stocked_info = normalizeOptionalText(input.stockedInfo);
    if (input.groupName !== undefined) {
      update.tank_group_id = (await this.findOrCreateTankGroup(input.groupName)).id;
    }
    return update;
  }

  private async updateDesiredTank(tankId: string, update: TankUpdate): Promise<TankRecord> {
    const { data, error } = await this.client
      .from('tanks')
      .update(update)
      .eq('id', tankId)
      .eq('farm_id', this.farmId)
      .select(DESIRED_TANK_COLUMNS)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound('수조 수정', '수조를 찾을 수 없습니다.');
    return normalizeTank(data);
  }

  private async updateLegacyTank(tankId: string, update: TankUpdate): Promise<TankRecord> {
    const legacyUpdate: LegacyTankUpdate = {};
    if (update.code !== undefined) legacyUpdate.code = update.code;
    if (update.stocked_at !== undefined) legacyUpdate.stocked_at = update.stocked_at;
    if (update.tank_group_id !== undefined) legacyUpdate.tank_group_id = update.tank_group_id;

    const response = Object.keys(legacyUpdate).length > 0
      ? await this.client
          .from('tanks')
          .update(legacyUpdate)
          .eq('id', tankId)
          .eq('farm_id', this.farmId)
          .select(LEGACY_TANK_COLUMNS)
          .maybeSingle()
      : await this.client
          .from('tanks')
          .select(LEGACY_TANK_COLUMNS)
          .eq('id', tankId)
          .eq('farm_id', this.farmId)
          .maybeSingle();
    const { data, error } = response;
    if (error) throw error;
    if (!data) throw notFound('수조 수정', '수조를 찾을 수 없습니다.');
    return normalizeTank(data);
  }

  private async findTankGroupByName(name: string): Promise<TankGroupRecord | null> {
    const { data, error } = await this.client
      .from('tank_groups')
      .select(GROUP_COLUMNS)
      .eq('farm_id', this.farmId)
      .eq('name', name)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  private async queryAiResults(
    tankId: string | undefined,
    options: AiResultListOptions
  ): Promise<AiResultRecord[]> {
    const operation = tankId ? '수조 진단 이력 조회' : '전체 진단 이력 조회';
    const limit = normalizeLimit(options.limit, operation);
    const before = normalizeOptionalTimestamp(options.before, operation);

    try {
      return await this.queryDesiredAiResults(tankId, before, limit);
    } catch (error) {
      if (!isMissingColumnError(error)) throw mapSupabaseError(error, operation);
    }

    try {
      return await this.queryLegacyAiResults(tankId, before, limit);
    } catch (error) {
      throw mapSupabaseError(error, operation);
    }
  }

  private async queryDesiredAiResults(
    tankId: string | undefined,
    before: string | undefined,
    limit: number
  ): Promise<AiResultRecord[]> {
    let query = this.client
      .from('ai_results')
      .select(DESIRED_AI_RESULT_COLUMNS)
      .eq('farm_id', this.farmId);
    if (tankId) query = query.eq('tank_id', tankId);
    if (before) query = query.lt('created_at', before);

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data.flatMap((row) => {
      const result = normalizeAiResult(row, row.tank_id);
      return result ? [result] : [];
    });
  }

  private async queryLegacyAiResults(
    tankId: string | undefined,
    before: string | undefined,
    limit: number
  ): Promise<AiResultRecord[]> {
    let query = this.client
      .from('ai_results')
      .select(LEGACY_AI_RESULT_COLUMNS)
      .eq('farm_id', this.farmId);
    if (before) query = query.lt('created_at', before);

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(tankId ? MAX_LEGACY_HISTORY_SCAN : limit);
    if (error) throw error;

    const photos = await this.loadLegacyPhotos(data.map(({ photo_id }) => photo_id));
    const photosById = new Map(photos.map((photo) => [photo.id, photo]));
    return data
      .flatMap((row) => {
        const result = normalizeAiResult(row, photosById.get(row.photo_id)?.tank_id);
        return result ? [result] : [];
      })
      .filter((result) => !tankId || result.tank_id === tankId)
      .slice(0, limit);
  }

  private async attachPhotos(results: AiResultRecord[]): Promise<AiResultWithPhoto[]> {
    if (results.length === 0) return [];
    const operation = '진단 사진 조회';
    const photoIds = [...new Set(results.map(({ photo_id }) => photo_id))];
    let photos: PhotoRecord[];

    try {
      photos = await this.loadDesiredPhotos(photoIds);
    } catch (error) {
      if (!isMissingColumnError(error)) throw mapSupabaseError(error, operation);
      try {
        photos = await this.loadLegacyPhotos(photoIds);
      } catch (legacyError) {
        throw mapSupabaseError(legacyError, operation);
      }
    }

    try {
      const photosById = new Map(photos.map((photo) => [photo.id, photo]));
      const urls = await this.createSignedPhotoUrls(photos.map(({ storage_path }) => storage_path));
      return results.map((result) => {
        const photo = photosById.get(result.photo_id) ?? null;
        return {
          ...result,
          photo,
          photoUrl: photo ? (urls.get(photo.storage_path) ?? null) : null,
        };
      });
    } catch (error) {
      throw mapSupabaseError(error, operation);
    }
  }

  private async loadDesiredPhotos(photoIds: string[]): Promise<PhotoRecord[]> {
    const batches = await Promise.all(
      chunks(photoIds, IN_FILTER_CHUNK_SIZE).map(async (ids) => {
        const { data, error } = await this.client
          .from('photos')
          .select(DESIRED_PHOTO_COLUMNS)
          .eq('farm_id', this.farmId)
          .in('id', ids);
        if (error) throw error;
        return data;
      })
    );
    return batches.flat().flatMap((row) => {
      const photo = normalizePhoto(row, row.tank_id);
      return photo ? [photo] : [];
    });
  }

  private async loadLegacyPhotos(photoIds: string[]): Promise<PhotoRecord[]> {
    const uniquePhotoIds = [...new Set(photoIds)];
    if (uniquePhotoIds.length === 0) return [];

    const photoBatches = await Promise.all(
      chunks(uniquePhotoIds, IN_FILTER_CHUNK_SIZE).map(async (ids) => {
        const { data, error } = await this.client
          .from('photos')
          .select(LEGACY_PHOTO_COLUMNS)
          .eq('farm_id', this.farmId)
          .in('id', ids);
        if (error) throw error;
        return data;
      })
    );
    const photos: LegacyPhotoLike[] = photoBatches.flat();
    const dailyRecordIds = [
      ...new Set(photos.map(({ daily_record_id }) => daily_record_id).filter(isString)),
    ];
    if (dailyRecordIds.length === 0) return [];

    const dailyRecordBatches = await Promise.all(
      chunks(dailyRecordIds, IN_FILTER_CHUNK_SIZE).map(async (ids) => {
        const { data, error } = await this.client
          .from('daily_records')
          .select(DAILY_RECORD_COLUMNS)
          .eq('farm_id', this.farmId)
          .in('id', ids);
        if (error) throw error;
        return data;
      })
    );
    const tankIdByDailyRecord = new Map(
      dailyRecordBatches.flat().map((record) => [record.id, record.tank_id])
    );
    return photos.flatMap((row) => {
      const tankId = row.daily_record_id ? tankIdByDailyRecord.get(row.daily_record_id) : undefined;
      const photo = normalizePhoto(row, tankId);
      return photo ? [photo] : [];
    });
  }
}

let singleton: SupabaseRepository | undefined;

export function getSupabaseRepository(): SupabaseRepository {
  singleton ??= new SupabaseRepository();
  return singleton;
}

function normalizeTank(row: TankLike): TankRecord {
  return {
    active: row.active ?? true,
    code: row.code,
    created_at: row.created_at,
    farm_id: row.farm_id,
    id: row.id,
    stocked_at: row.stocked_at,
    stocked_info: row.stocked_info ?? null,
    tank_group_id: row.tank_group_id,
  };
}

function normalizePhoto(row: PhotoLike, tankId: string | null | undefined): PhotoRecord | null {
  if (!tankId) return null;
  return {
    captured_at: row.captured_at,
    farm_id: row.farm_id,
    id: row.id,
    storage_path: row.storage_path,
    tank_id: tankId,
  };
}

function normalizeAiResult(row: AiResultLike, tankId: string | null | undefined): AiResultRecord | null {
  if (!tankId) return null;
  const fish = Array.isArray(row.fish) ? row.fish : [];
  const inferredFishCount = fish.length;
  const fishCount = normalizeCount(row.fish_count, inferredFishCount);
  const inferredSuspectCount = fish.filter((item) => isRecord(item) && item.grade === 'suspect').length;
  const suspectCount = Math.min(fishCount, normalizeCount(row.suspect_count, inferredSuspectCount));
  const inferredRatio = fishCount === 0 ? 0 : suspectCount / fishCount;
  const affectedRatio = normalizeRatio(row.affected_ratio, inferredRatio);

  return {
    affected_ratio: affectedRatio,
    created_at: row.created_at,
    farm_id: row.farm_id,
    fish,
    fish_count: fishCount,
    grade: overallGradeFromMetrics(suspectCount, affectedRatio),
    id: row.id,
    model_version: row.model_version ?? 'unknown',
    photo_id: row.photo_id,
    request_id: row.request_id ?? row.id,
    suspect_count: suspectCount,
    tank_id: tankId,
  };
}

function normalizeCount(value: number | null, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : fallback;
}

function normalizeRatio(value: number | null, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : fallback;
}

function normalizeTankCode(value: string, operation: string): string {
  return normalizeRequiredText(value, operation, '수조 코드를 입력해 주세요.').toUpperCase();
}

function normalizeRequiredText(value: string, operation: string, message: string): string {
  const normalized = value.trim();
  if (!normalized) throw invalidInput(operation, message);
  return normalized;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.trim() || null;
}

function normalizeOptionalDate(value: string | null | undefined, operation: string): string | null {
  if (value === null || value === undefined || !value.trim()) return null;
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(Date.parse(`${normalized}T00:00:00Z`))) {
    throw invalidInput(operation, '입식일은 YYYY-MM-DD 형식이어야 합니다.');
  }
  return normalized;
}

function normalizeOptionalTimestamp(value: string | undefined, operation: string): string | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim();
  if (!normalized || Number.isNaN(Date.parse(normalized))) {
    throw invalidInput(operation, '조회 기준 시각이 올바르지 않습니다.');
  }
  return normalized;
}

function normalizeLimit(value: number | undefined, operation: string): number {
  const limit = value ?? DEFAULT_HISTORY_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_HISTORY_LIMIT) {
    throw invalidInput(operation, `조회 개수는 1 이상 ${MAX_HISTORY_LIMIT} 이하여야 합니다.`);
  }
  return limit;
}

function normalizeExpiry(value: number, operation: string): number {
  if (!Number.isInteger(value) || value < 60 || value > MAX_SIGNED_URL_SECONDS) {
    throw invalidInput(operation, '사진 URL 유효 시간은 60초 이상 7일 이하여야 합니다.');
  }
  return value;
}

function normalizeStoragePath(value: string, operation: string): string {
  let normalized = normalizeRequiredText(value, operation, '사진 저장 경로가 비어 있습니다.').replace(/^\/+/, '');
  if (normalized.startsWith(`${PHOTO_BUCKET}/`)) normalized = normalized.slice(PHOTO_BUCKET.length + 1);
  if (!normalized || normalized.split('/').includes('..')) {
    throw invalidInput(operation, '사진 저장 경로가 올바르지 않습니다.');
  }
  return normalized;
}

function assertUuid(value: string, operation: string, label: string) {
  if (!isUuid(value)) throw invalidInput(operation, `${label}가 올바른 UUID가 아닙니다.`);
}

function isMissingColumnError(error: unknown): boolean {
  if (!isRecord(error)) return false;
  if (error.code === '42703' || error.code === 'PGRST204') return true;
  const message = [error.message, error.details, error.hint]
    .filter(isString)
    .join(' ')
    .toLowerCase();
  return typeof error.code === 'string'
    && error.code.startsWith('PGRST')
    && message.includes('schema cache')
    && message.includes('column');
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export { SupabaseDataError };
