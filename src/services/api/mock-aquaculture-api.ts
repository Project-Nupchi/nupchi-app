import sampleAquaculture from '@/data/sample-aquaculture.json';
import { AppCopy } from '@/constants/copy';
import type { AquacultureApi } from '@/services/api/aquaculture-api';
import { buildPrototypeInspectionVerdict } from '@/services/inspection-server';
import type {
  AquacultureSnapshot,
  CreateInspectionInput,
  CreateTankInput,
  InspectionResult,
  Tank,
  UpdateTankInput,
} from '@/models/aquaculture';

type LegacySampleTank = {
  id: string;
  groupId: string;
  stockedInfo: string;
  createdAt: string;
  active: boolean;
};

type SampleData = {
  initialTanks: LegacySampleTank[];
  initialResults: InspectionResult[];
};

const MOCK_FARM_ID = '00000000-0000-4000-8000-000000000001';
const sample = sampleAquaculture as unknown as SampleData;
let createdTankSequence = 0;

export class MockAquacultureApi implements AquacultureApi {
  private tanks: Tank[];
  private results: InspectionResult[];

  constructor() {
    const normalized = normalizeSample(sample);
    this.tanks = normalized.tanks;
    this.results = normalized.results;
  }

  async getSnapshot(): Promise<AquacultureSnapshot> {
    await delay();
    return clone({
      tanks: this.tanks,
      results: this.results,
    });
  }

  async createTank(input: CreateTankInput) {
    await delay();
    const groupName = normalizeGroupName(input.groupName);
    const tank: Tank = {
      id: stableMockUuid('tank', `${Date.now()}-${++createdTankSequence}-${input.code}`),
      farmId: MOCK_FARM_ID,
      code: input.code,
      groupId: stableMockUuid('group', groupName),
      groupName,
      stockedInfo: input.stockedInfo,
      createdAt: new Date().toISOString(),
      active: true,
    };
    this.tanks = [tank, ...this.tanks];
    return clone(tank);
  }

  async updateTank(tankId: string, input: UpdateTankInput) {
    await delay();
    const current = this.tanks.find((tank) => tank.id === tankId);
    if (!current) throw new Error(AppCopy.validation.tankNotFound);
    const groupName = normalizeGroupName(input.groupName);
    const updated: Tank = {
      ...current,
      ...input,
      groupId: stableMockUuid('group', groupName),
      groupName,
    };
    this.tanks = this.tanks.map((tank) => (tank.id === tankId ? updated : tank));
    return clone(updated);
  }

  async createInspection(input: CreateInspectionInput) {
    await delay();
    const tankId = this.resolveTankId(input.tankId);
    const result: InspectionResult = {
      id: stableMockUuid('result', `${Date.now()}-${tankId}`),
      tankId,
      capturedAt: new Date().toISOString(),
      status: 'pending',
      grade: 'normal',
      photoUri: input.photoUri,
      clues: input.clues,
      bodyParts: [],
      diseases: [],
      evidenceSummary: '',
      lesions: [],
    };
    this.results = [result, ...this.results];
    return clone(result);
  }

  async analyzeInspection(resultId: string) {
    await delay(1_200);
    const result = this.results.find((item) => item.id === resultId);
    if (!result) throw new Error(AppCopy.result.notFound);
    const verdict = buildPrototypeInspectionVerdict(result);
    this.results = this.results.map((item) => (item.id === verdict.id ? verdict : item));
    return clone(verdict);
  }

  private resolveTankId(value: string) {
    const tank = this.tanks.find((item) => item.id === value || item.code === value);
    if (!tank) throw new Error(AppCopy.validation.tankNotFound);
    return tank.id;
  }
}

function normalizeSample(value: SampleData): { tanks: Tank[]; results: InspectionResult[] } {
  const tankIdByLegacyId = new Map<string, string>();
  const tanks = value.initialTanks.map((legacyTank) => {
    const id = stableMockUuid('tank', legacyTank.id);
    const groupName = normalizeGroupName(legacyTank.groupId);
    tankIdByLegacyId.set(legacyTank.id, id);
    return {
      id,
      farmId: MOCK_FARM_ID,
      code: legacyTank.id,
      groupId: stableMockUuid('group', groupName),
      groupName,
      stockedInfo: legacyTank.stockedInfo,
      createdAt: legacyTank.createdAt,
      active: legacyTank.active,
    };
  });
  const results = value.initialResults.map((result) => ({
    ...clone(result),
    grade: result.grade === 'normal' ? 'normal' as const : 'caution' as const,
    tankId: tankIdByLegacyId.get(result.tankId) ?? stableMockUuid('tank', result.tankId),
  }));
  return { tanks, results };
}

function normalizeGroupName(value: string) {
  return value.trim() || AppCopy.common.unknownGroup;
}

function stableMockUuid(scope: string, value: string) {
  const source = `${scope}:${value}`;
  const hex = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35]
    .map((seed) => hash32(source, seed).toString(16).padStart(8, '0'))
    .join('')
    .split('');
  hex[12] = '4';
  hex[16] = '8';
  const compact = hex.join('');
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}

function hash32(value: string, seed: number) {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

function delay(ms = 180) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
