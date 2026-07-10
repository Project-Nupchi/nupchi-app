import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { AppCopy } from '@/constants/copy';
import type { InspectionResult, MutationResult, Tank } from '@/models/aquaculture';
import { MockAquacultureApi } from '@/services/api/mock-aquaculture-api';
import {
  diagnosisToInspection,
  storedAiResultToInspection,
  tankRecordToModel,
} from '@/services/aquaculture-adapters';
import type { PreparedImage } from '@/services/image-upload';
import { inferenceClient } from '@/services/inference';
import { getSupabaseConfig, getSupabaseRepository } from '@/services/supabase';

type ApiMode = 'mock' | 'remote';

type NewInspectionInput = {
  image: PreparedImage;
  tankId: string;
};

type PendingInspection = {
  image: PreparedImage;
  result: InspectionResult;
};

type AquacultureStore = {
  farmName: string;
  apiMode: ApiMode;
  isHydrating: boolean;
  isMutating: boolean;
  error: string | null;
  refresh: () => Promise<MutationResult>;
  tanks: Tank[];
  results: InspectionResult[];
  addTank: (code: string, groupName: string, stockedInfo: string) => Promise<MutationResult>;
  updateTank: (
    id: string,
    groupName: string,
    stockedInfo: string,
    active?: boolean
  ) => Promise<MutationResult>;
  setTankActive: (id: string, active: boolean) => Promise<MutationResult>;
  createInspection: (input: NewInspectionInput) => Promise<MutationResult<{ id: string }>>;
  analyzeInspection: (resultId: string) => Promise<void>;
  applyInspectionVerdict: (verdict: InspectionResult) => void;
  retryInspection: (resultId: string) => void;
};

const forceMock = process.env.EXPO_PUBLIC_USE_MOCK_API === 'true';
const hasSupabaseConfig = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() &&
    (
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim()
    )
);
const apiMode: ApiMode = !forceMock && hasSupabaseConfig ? 'remote' : 'mock';
const mockApi = new MockAquacultureApi();
const AquacultureContext = createContext<AquacultureStore | null>(null);

export function AquacultureProvider({ children }: PropsWithChildren) {
  const [farmName, setFarmName] = useState<string>(AppCopy.farm.defaultName);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [results, setResults] = useState<InspectionResult[]>([]);
  const [isHydrating, setIsHydrating] = useState(false);
  const [mutationCount, setMutationCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const analyzingIds = useRef(new Set<string>());
  const pendingInspections = useRef(new Map<string, PendingInspection>());
  const hasBootstrapped = useRef(false);

  const hydrate = useCallback(async () => {
    if (apiMode === 'mock') {
      const snapshot = await mockApi.getSnapshot();
      setTanks(snapshot.tanks);
      setResults(snapshot.results);
      setFarmName(AppCopy.farm.defaultName);
      return;
    }

    const repository = getSupabaseRepository();
    const [overview, history] = await Promise.all([
      repository.getFarmOverview({ includeInactive: true }),
      repository.listAllAiResultsWithPhotoUrls({ limit: 100 }),
    ]);
    const groups = new Map(overview.groups.map((group) => [group.id, group]));
    setFarmName(overview.farm.name);
    setTanks(overview.tanks.map((tank) => tankRecordToModel(tank, groups)));
    setResults(history.flatMap(toStoredInspection));
  }, []);

  const refresh = useCallback(async (): Promise<MutationResult> => {
    setIsHydrating(true);
    setError(null);
    try {
      await hydrate();
      return { ok: true };
    } catch (reason) {
      const message = getErrorMessage(reason, AppCopy.common.loadError);
      setError(message);
      return { ok: false, message };
    } finally {
      setIsHydrating(false);
    }
  }, [hydrate]);

  useEffect(() => {
    if (hasBootstrapped.current) return;
    hasBootstrapped.current = true;
    void refresh();
  }, [refresh]);

  const runMutation = useCallback(
    async <T,>(operation: () => Promise<MutationResult<T>>): Promise<MutationResult<T>> => {
      setMutationCount((count) => count + 1);
      setError(null);
      try {
        return await operation();
      } catch (reason) {
        const message = getErrorMessage(reason);
        setError(message);
        return { ok: false, message };
      } finally {
        setMutationCount((count) => Math.max(0, count - 1));
      }
    },
    []
  );

  const addTank = useCallback<AquacultureStore['addTank']>(
    async (code, groupName, stockedInfo) => {
      const normalizedCode = code.trim().toUpperCase();
      if (!normalizedCode) return { ok: false, message: AppCopy.validation.tankIdRequired };
      if (tanks.some((tank) => tank.code.toUpperCase() === normalizedCode)) {
        return { ok: false, message: AppCopy.validation.duplicateTankId };
      }

      return runMutation(async () => {
        const input = {
          code: normalizedCode,
          groupName: groupName.trim() || AppCopy.common.unknownGroup,
          stockedInfo: stockedInfo.trim() || AppCopy.common.emptyStockedInfo,
        };

        if (apiMode === 'mock') {
          const tank = await mockApi.createTank(input);
          setTanks((current) => [tank, ...current]);
        } else {
          await getSupabaseRepository().createTank(input);
          await hydrate();
        }
        return { ok: true };
      });
    },
    [hydrate, runMutation, tanks]
  );

  const updateTank = useCallback<AquacultureStore['updateTank']>(
    async (id, groupName, stockedInfo, active) => {
      const current = tanks.find((tank) => tank.id === id);
      if (!current) return { ok: false, message: AppCopy.validation.tankNotFound };

      return runMutation(async () => {
        const input = {
          groupName: groupName.trim() || AppCopy.common.unknownGroup,
          stockedInfo: stockedInfo.trim() || AppCopy.common.emptyStockedInfo,
          active: active ?? current.active,
        };

        if (apiMode === 'mock') {
          const updated = await mockApi.updateTank(id, input);
          setTanks((items) => items.map((tank) => (tank.id === id ? updated : tank)));
        } else {
          await getSupabaseRepository().updateTank(id, input);
          await hydrate();
        }
        return { ok: true };
      });
    },
    [hydrate, runMutation, tanks]
  );

  const setTankActive = useCallback<AquacultureStore['setTankActive']>(
    async (id, active) => {
      const current = tanks.find((tank) => tank.id === id);
      if (!current) return { ok: false, message: AppCopy.validation.tankNotFound };
      return updateTank(id, current.groupName, current.stockedInfo, active);
    },
    [tanks, updateTank]
  );

  const createInspection = useCallback<AquacultureStore['createInspection']>(
    async ({ image, tankId }) =>
      runMutation<{ id: string }>(async () => {
        const tank = tanks.find((item) => item.id === tankId);
        if (!tank) return { ok: false, message: AppCopy.validation.tankNotFound };

        const result =
          apiMode === 'mock'
            ? await mockApi.createInspection({ tankId, photoUri: image.uri, clues: [] })
            : createPendingInspection(tankId, image);

        pendingInspections.current.set(result.id, { image, result });
        setResults((current) => [result, ...current.filter((item) => item.id !== result.id)]);
        return { ok: true, id: result.id };
      }),
    [runMutation, tanks]
  );

  const analyzeInspection = useCallback(async (resultId: string) => {
    if (analyzingIds.current.has(resultId)) return;
    const pending = pendingInspections.current.get(resultId);
    if (!pending) return;

    analyzingIds.current.add(resultId);
    try {
      const verdict =
        apiMode === 'mock'
          ? await mockApi.analyzeInspection(resultId)
          : await requestRemoteDiagnosis(pending);
      setResults((current) =>
        current.map((result) => (result.id === resultId ? verdict : result))
      );
      pendingInspections.current.delete(resultId);
    } catch (reason) {
      const message = getErrorMessage(reason, AppCopy.errors.inspectionUnavailable);
      setResults((current) =>
        current.map((result) =>
          result.id === resultId
            ? { ...result, status: 'failed', evidenceSummary: message }
            : result
        )
      );
    } finally {
      analyzingIds.current.delete(resultId);
    }
  }, []);

  const applyInspectionVerdict = useCallback((verdict: InspectionResult) => {
    pendingInspections.current.delete(verdict.id);
    setResults((current) =>
      current.map((result) => (result.id === verdict.id ? verdict : result))
    );
  }, []);

  const retryInspection = useCallback((resultId: string) => {
    setResults((current) =>
      current.map((result) => {
        if (result.id !== resultId) return result;
        const pendingResult = { ...result, status: 'pending' as const, evidenceSummary: '' };
        const pending = pendingInspections.current.get(resultId);
        if (pending) pendingInspections.current.set(resultId, { ...pending, result: pendingResult });
        return pendingResult;
      })
    );
  }, []);

  const value = useMemo<AquacultureStore>(
    () => ({
      farmName,
      apiMode,
      isHydrating,
      isMutating: mutationCount > 0,
      error,
      refresh,
      tanks,
      results,
      addTank,
      updateTank,
      setTankActive,
      createInspection,
      analyzeInspection,
      applyInspectionVerdict,
      retryInspection,
    }),
    [
      farmName,
      isHydrating,
      mutationCount,
      error,
      refresh,
      tanks,
      results,
      addTank,
      updateTank,
      setTankActive,
      createInspection,
      analyzeInspection,
      applyInspectionVerdict,
      retryInspection,
    ]
  );

  return <AquacultureContext value={value}>{children}</AquacultureContext>;
}

export function useAquaculture() {
  const value = React.use(AquacultureContext);
  if (!value) throw new Error('useAquaculture must be used inside AquacultureProvider');
  return value;
}

function createPendingInspection(tankId: string, image: PreparedImage): InspectionResult {
  const id = createUuid();
  return {
    id,
    requestId: id,
    tankId,
    capturedAt: new Date().toISOString(),
    status: 'pending',
    grade: 'normal',
    photoUri: image.uri,
    imageWidth: image.width,
    imageHeight: image.height,
    clues: [],
    bodyParts: [],
    diseases: [],
    evidenceSummary: '',
    lesions: [],
  };
}

async function requestRemoteDiagnosis({ image, result }: PendingInspection) {
  const requestId = result.requestId ?? result.id;
  const diagnosis = await inferenceClient.diagnose({
    image: { uri: image.uri, name: image.fileName, type: image.mimeType },
    farmId: getSupabaseConfig().farmId,
    tankId: result.tankId,
    requestId,
  });
  return diagnosisToInspection(diagnosis, {
    capturedAt: result.capturedAt,
    imageHeight: image.height,
    imageWidth: image.width,
    localId: result.id,
    photoUri: image.uri,
    requestId,
    tankId: result.tankId,
  });
}

function toStoredInspection(value: Parameters<typeof storedAiResultToInspection>[0]) {
  try {
    return [storedAiResultToInspection(value)];
  } catch {
    return [];
  }
}

function createUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function getErrorMessage(reason: unknown, fallback: string = AppCopy.common.genericError) {
  return reason instanceof Error && reason.message ? reason.message : fallback;
}
