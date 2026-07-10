import type { AquacultureApi } from '@/services/api/aquaculture-api';
import { HttpClient } from '@/services/api/http-client';
import { parseInspectionResult, parseLoginResponse, parseSnapshot, parseTank } from '@/services/api/serializers';
import { Platform } from 'react-native';
import type {
  CreateInspectionInput,
  CreateTankInput,
  LoginInput,
  UpdateTankInput,
} from '@/models/aquaculture';

export class RemoteAquacultureApi implements AquacultureApi {
  private readonly http: HttpClient;

  constructor(baseUrl: string) {
    this.http = new HttpClient(baseUrl.replace(/\/$/, ''));
  }

  async login(input: LoginInput) {
    const payload = await this.http.request<unknown>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    const response = parseLoginResponse(payload);
    this.http.setAccessToken(response.accessToken);
    return response;
  }

  async logout() {
    try {
      await this.http.request<void>('/v1/auth/logout', { method: 'POST' });
    } finally {
      this.http.setAccessToken(undefined);
    }
  }

  async getSnapshot() {
    return parseSnapshot(await this.http.request<unknown>('/v1/aquaculture/snapshot'));
  }

  async createTank(input: CreateTankInput) {
    const payload = await this.http.request<unknown>('/v1/tanks', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return parseTank(payload);
  }

  async updateTank(tankId: string, input: UpdateTankInput) {
    const payload = await this.http.request<unknown>(`/v1/tanks/${encodeURIComponent(tankId)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    return parseTank(payload);
  }

  async createInspection(input: CreateInspectionInput) {
    const body = await buildInspectionBody(input);
    return parseInspectionResult(await this.http.request<unknown>('/v1/inspections', { method: 'POST', body }));
  }

  async analyzeInspection(resultId: string) {
    const payload = await this.http.request<unknown>(`/v1/inspections/${encodeURIComponent(resultId)}/analyze`, {
      method: 'POST',
    });
    return parseInspectionResult(payload);
  }

  acknowledgeAlert(resultId: string, acknowledged: boolean) {
    return this.http.request<void>(`/v1/inspections/${encodeURIComponent(resultId)}/acknowledgement`, {
      method: 'PUT',
      body: JSON.stringify({ acknowledged }),
    });
  }

  setReminderEnabled(enabled: boolean) {
    return this.http.request<void>('/v1/preferences/reminder', {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    });
  }
}

async function buildInspectionBody(input: CreateInspectionInput): Promise<BodyInit> {
  if (!input.photoUri) return JSON.stringify(input);

  const body = new FormData();
  body.append('tankId', input.tankId);
  body.append('clues', JSON.stringify(input.clues));
  const filename = `inspection-${Date.now()}.jpg`;
  if (Platform.OS === 'web') {
    const photo = await fetch(input.photoUri).then((response) => response.blob());
    body.append('photo', photo, filename);
  } else {
    body.append('photo', { uri: input.photoUri, name: filename, type: 'image/jpeg' } as unknown as Blob);
  }
  return body;
}
