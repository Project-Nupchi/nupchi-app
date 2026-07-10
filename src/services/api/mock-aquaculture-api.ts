import sampleAquaculture from '@/data/sample-aquaculture.json';
import { AppCopy } from '@/constants/copy';
import type { AquacultureApi } from '@/services/api/aquaculture-api';
import { buildPrototypeInspectionVerdict } from '@/services/inspection-server';
import type {
  AquacultureSnapshot,
  CreateInspectionInput,
  CreateTankInput,
  InspectionResult,
  LoginInput,
  Tank,
  UpdateTankInput,
} from '@/models/aquaculture';

type SampleData = {
  initialTanks: Tank[];
  initialResults: InspectionResult[];
};

const sample = sampleAquaculture as SampleData;

export class MockAquacultureApi implements AquacultureApi {
  private tanks = clone(sample.initialTanks);
  private results = clone(sample.initialResults);
  private ackedAlertIds: string[] = [];
  private reminderEnabled = true;

  async login(input: LoginInput) {
    await delay();
    return {
      session: {
        isLoggedIn: true,
        farmName: input.farmName.trim() || AppCopy.login.defaultFarmFallback,
        userId: 'mock-user',
      },
      accessToken: 'mock-access-token',
    };
  }

  async logout() {
    await delay(80);
  }

  async getSnapshot(): Promise<AquacultureSnapshot> {
    await delay();
    return clone({
      tanks: this.tanks,
      results: this.results,
      preferences: {
        ackedAlertIds: this.ackedAlertIds,
        reminderEnabled: this.reminderEnabled,
      },
    });
  }

  async createTank(input: CreateTankInput) {
    await delay();
    const tank: Tank = { ...input, createdAt: new Date().toISOString(), active: true };
    this.tanks = [tank, ...this.tanks];
    return clone(tank);
  }

  async updateTank(tankId: string, input: UpdateTankInput) {
    await delay();
    const current = this.tanks.find((tank) => tank.id === tankId);
    if (!current) throw new Error(AppCopy.validation.tankNotFound);
    const updated = { ...current, ...input };
    this.tanks = this.tanks.map((tank) => (tank.id === tankId ? updated : tank));
    return clone(updated);
  }

  async createInspection(input: CreateInspectionInput) {
    await delay();
    const result: InspectionResult = {
      id: `R-${Date.now()}`,
      tankId: input.tankId,
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

  async acknowledgeAlert(resultId: string, acknowledged: boolean) {
    await delay(80);
    this.ackedAlertIds = acknowledged
      ? [...new Set([...this.ackedAlertIds, resultId])]
      : this.ackedAlertIds.filter((id) => id !== resultId);
  }

  async setReminderEnabled(enabled: boolean) {
    await delay(80);
    this.reminderEnabled = enabled;
  }
}

function delay(ms = 180) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
