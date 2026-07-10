import React, { PropsWithChildren, createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AppCopy } from '@/constants/copy';
import type {
  CreateInspectionInput,
  InspectionResult,
  MutationResult,
  Tank,
  UserSession,
} from '@/models/aquaculture';
import { apiMode, aquacultureApi } from '@/services/api';

type AquacultureStore = {
  session: UserSession;
  apiMode: 'mock' | 'remote';
  isHydrating: boolean;
  isMutating: boolean;
  error: string | null;
  login: (farmName: string) => Promise<MutationResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<MutationResult>;
  tanks: Tank[];
  results: InspectionResult[];
  ackedAlertIds: string[];
  acknowledgeAlert: (resultId: string) => Promise<void>;
  reminderEnabled: boolean;
  setReminderEnabled: (enabled: boolean) => Promise<void>;
  addTank: (id: string, groupId: string, stockedInfo: string) => Promise<MutationResult>;
  updateTank: (id: string, groupId: string, stockedInfo: string, active?: boolean) => Promise<MutationResult>;
  setTankActive: (id: string, active: boolean) => Promise<MutationResult>;
  createInspection: (input: CreateInspectionInput) => Promise<MutationResult<{ id: string }>>;
  analyzeInspection: (resultId: string) => Promise<void>;
  applyInspectionVerdict: (verdict: InspectionResult) => void;
  retryInspection: (resultId: string) => void;
};

const emptySession: UserSession = { isLoggedIn: false, farmName: '' };
const initialSession: UserSession = { isLoggedIn: false, farmName: AppCopy.login.defaultFarmName };
const AquacultureContext = createContext<AquacultureStore | null>(null);

export function AquacultureProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<UserSession>(initialSession);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [results, setResults] = useState<InspectionResult[]>([]);
  const [ackedAlertIds, setAckedAlertIds] = useState<string[]>([]);
  const [reminderEnabled, setReminderState] = useState(true);
  const [isHydrating, setIsHydrating] = useState(false);
  const [mutationCount, setMutationCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const analyzingIds = useRef(new Set<string>());
  const hasBootstrapped = useRef(false);

  const hydrate = useCallback(async () => {
    const snapshot = await aquacultureApi.getSnapshot();
    setTanks(snapshot.tanks);
    setResults(snapshot.results);
    setAckedAlertIds(snapshot.preferences.ackedAlertIds);
    setReminderState(snapshot.preferences.reminderEnabled);
  }, []);

  const login = useCallback(async (farmName: string): Promise<MutationResult> => {
    setIsHydrating(true);
    setError(null);
    try {
      const response = await aquacultureApi.login({ farmName });
      await hydrate();
      setSession(response.session);
      return { ok: true };
    } catch (reason) {
      const message = getErrorMessage(reason);
      setError(message);
      return { ok: false, message };
    } finally {
      setIsHydrating(false);
    }
  }, [hydrate]);

  useEffect(() => {
    if (hasBootstrapped.current) return;
    hasBootstrapped.current = true;
    void login(AppCopy.login.defaultFarmName);
  }, [login]);

  const logout = useCallback(async () => {
    try {
      await aquacultureApi.logout();
    } finally {
      setSession(emptySession);
      setTanks([]);
      setResults([]);
      setAckedAlertIds([]);
      setError(null);
    }
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

  const runMutation = useCallback(async <T,>(operation: () => Promise<MutationResult<T>>): Promise<MutationResult<T>> => {
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
  }, []);

  const addTank = useCallback<AquacultureStore['addTank']>(async (id, groupId, stockedInfo) => {
    const normalizedId = id.trim().toUpperCase();
    if (!normalizedId) return { ok: false, message: AppCopy.validation.tankIdRequired };
    if (tanks.some((tank) => tank.id.toUpperCase() === normalizedId)) {
      return { ok: false, message: AppCopy.validation.duplicateTankId };
    }

    return runMutation(async () => {
      const tank = await aquacultureApi.createTank({
        id: normalizedId,
        groupId: groupId.trim() || AppCopy.common.unknownGroup,
        stockedInfo: stockedInfo.trim() || AppCopy.common.emptyStockedInfo,
      });
      setTanks((current) => [tank, ...current]);
      return { ok: true };
    });
  }, [runMutation, tanks]);

  const updateTank = useCallback<AquacultureStore['updateTank']>(async (id, groupId, stockedInfo, active) => {
    const current = tanks.find((tank) => tank.id === id);
    if (!current) return { ok: false, message: AppCopy.validation.tankNotFound };

    return runMutation(async () => {
      const updated = await aquacultureApi.updateTank(id, {
        groupId: groupId.trim() || AppCopy.common.unknownGroup,
        stockedInfo: stockedInfo.trim() || AppCopy.common.emptyStockedInfo,
        active: active ?? current.active,
      });
      setTanks((items) => items.map((tank) => (tank.id === id ? updated : tank)));
      return { ok: true };
    });
  }, [runMutation, tanks]);

  const setTankActive = useCallback<AquacultureStore['setTankActive']>(async (id, active) => {
    const current = tanks.find((tank) => tank.id === id);
    if (!current) return { ok: false, message: AppCopy.validation.tankNotFound };

    return runMutation(async () => {
      const updated = await aquacultureApi.updateTank(id, {
        groupId: current.groupId,
        stockedInfo: current.stockedInfo,
        active,
      });
      setTanks((items) => items.map((tank) => (tank.id === id ? updated : tank)));
      return { ok: true };
    });
  }, [runMutation, tanks]);

  const createInspection = useCallback<AquacultureStore['createInspection']>(async (input) => {
    return runMutation(async () => {
      const result = await aquacultureApi.createInspection(input);
      setResults((current) => [result, ...current.filter((item) => item.id !== result.id)]);
      return { ok: true, id: result.id };
    });
  }, [runMutation]);

  const analyzeInspection = useCallback(async (resultId: string) => {
    if (analyzingIds.current.has(resultId)) return;
    analyzingIds.current.add(resultId);
    try {
      const verdict = await aquacultureApi.analyzeInspection(resultId);
      setResults((current) => current.map((result) => (result.id === verdict.id ? verdict : result)));
    } catch {
      setResults((current) =>
        current.map((result) =>
          result.id === resultId
            ? { ...result, status: 'failed', evidenceSummary: AppCopy.errors.inspectionUnavailable }
            : result
        )
      );
    } finally {
      analyzingIds.current.delete(resultId);
    }
  }, []);

  const applyInspectionVerdict = useCallback((verdict: InspectionResult) => {
    setResults((current) => current.map((result) => (result.id === verdict.id ? verdict : result)));
  }, []);

  const retryInspection = useCallback((resultId: string) => {
    setResults((current) =>
      current.map((result) =>
        result.id === resultId ? { ...result, status: 'pending', evidenceSummary: '' } : result
      )
    );
  }, []);

  const acknowledgeAlert = useCallback(async (resultId: string) => {
    const acknowledged = !ackedAlertIds.includes(resultId);
    await aquacultureApi.acknowledgeAlert(resultId, acknowledged);
    setAckedAlertIds((current) =>
      acknowledged ? [...new Set([...current, resultId])] : current.filter((id) => id !== resultId)
    );
  }, [ackedAlertIds]);

  const setReminderEnabled = useCallback(async (enabled: boolean) => {
    await aquacultureApi.setReminderEnabled(enabled);
    setReminderState(enabled);
  }, []);

  const value = useMemo<AquacultureStore>(() => ({
    session,
    apiMode,
    isHydrating,
    isMutating: mutationCount > 0,
    error,
    login,
    logout,
    refresh,
    tanks,
    results,
    ackedAlertIds,
    acknowledgeAlert,
    reminderEnabled,
    setReminderEnabled,
    addTank,
    updateTank,
    setTankActive,
    createInspection,
    analyzeInspection,
    applyInspectionVerdict,
    retryInspection,
  }), [
    session, isHydrating, mutationCount, error, login, logout, refresh, tanks, results,
    ackedAlertIds, acknowledgeAlert, reminderEnabled, setReminderEnabled, addTank,
    updateTank, setTankActive, createInspection, analyzeInspection, applyInspectionVerdict,
    retryInspection,
  ]);

  return <AquacultureContext value={value}>{children}</AquacultureContext>;
}

export function useAquaculture() {
  const value = React.use(AquacultureContext);
  if (!value) throw new Error('useAquaculture must be used inside AquacultureProvider');
  return value;
}

function getErrorMessage(reason: unknown, fallback: string = AppCopy.common.genericError) {
  return reason instanceof Error && reason.message ? reason.message : fallback;
}
