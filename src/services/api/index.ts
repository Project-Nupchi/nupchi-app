import type { AquacultureApi } from '@/services/api/aquaculture-api';
import { MockAquacultureApi } from '@/services/api/mock-aquaculture-api';
import { RemoteAquacultureApi } from '@/services/api/remote-aquaculture-api';

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const forceMock = process.env.EXPO_PUBLIC_USE_MOCK_API === 'true';

export const apiMode = apiBaseUrl && !forceMock ? 'remote' : 'mock';

export const aquacultureApi: AquacultureApi =
  apiMode === 'remote' ? new RemoteAquacultureApi(apiBaseUrl!) : new MockAquacultureApi();

export type { AquacultureApi } from '@/services/api/aquaculture-api';
export { ApiError } from '@/services/api/http-client';
