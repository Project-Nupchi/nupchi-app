import React, { PropsWithChildren, createContext, useCallback, useMemo, useState } from 'react';

import {
  InspectionResult,
  Tank,
  initialResults,
  initialTanks,
} from '@/domain/aquaculture';

type CreateInspectionInput = {
  tankId: string;
  photoUri?: string;
  clues: string[];
};

type AquacultureStore = {
  tanks: Tank[];
  results: InspectionResult[];
  addTank: (id: string, groupId: string, stockedInfo: string) => { ok: true } | { ok: false; message: string };
  createInspection: (input: CreateInspectionInput) => string;
  applyInspectionVerdict: (verdict: InspectionResult) => void;
  failInspection: (resultId: string) => void;
  retryInspection: (resultId: string) => void;
};

const AquacultureContext = createContext<AquacultureStore | null>(null);

export function AquacultureProvider({ children }: PropsWithChildren) {
  const [tanks, setTanks] = useState<Tank[]>(initialTanks);
  const [results, setResults] = useState<InspectionResult[]>(initialResults);

  const addTank = useCallback<AquacultureStore['addTank']>(
    (id, groupId, stockedInfo) => {
      const normalizedId = id.trim().toUpperCase();
      const normalizedGroupId = groupId.trim() || '미지정 계통';
      if (!normalizedId) {
        return { ok: false, message: '수조 ID를 입력하세요.' };
      }
      if (tanks.some((tank) => tank.id.toUpperCase() === normalizedId)) {
        return { ok: false, message: '이미 등록된 수조 ID입니다.' };
      }

      setTanks((current) => [
        {
          id: normalizedId,
          groupId: normalizedGroupId,
          stockedInfo: stockedInfo.trim() || '광어 입식 정보 미입력',
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);
      return { ok: true };
    },
    [tanks]
  );

  const createInspection = useCallback((input: CreateInspectionInput) => {
    const id = `R-${Date.now()}`;
    const pendingResult: InspectionResult = {
      id,
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
    setResults((current) => [pendingResult, ...current]);
    return id;
  }, []);

  const applyInspectionVerdict = useCallback((verdict: InspectionResult) => {
    setResults((current) =>
      current.map((result) => (result.id === verdict.id ? verdict : result))
    );
  }, []);

  const failInspection = useCallback((resultId: string) => {
    setResults((current) =>
      current.map((result) =>
        result.id === resultId
          ? {
              ...result,
              status: 'failed',
              evidenceSummary: '서버 판정 요청이 완료되지 않았습니다. 네트워크 상태를 확인한 뒤 재시도하세요.',
            }
          : result
      )
    );
  }, []);

  const retryInspection = useCallback((resultId: string) => {
    setResults((current) =>
      current.map((result) =>
        result.id === resultId
          ? {
              ...result,
              status: 'pending',
              evidenceSummary: '',
            }
          : result
      )
    );
  }, []);

  const value = useMemo(
    () => ({
      tanks,
      results,
      addTank,
      createInspection,
      applyInspectionVerdict,
      failInspection,
      retryInspection,
    }),
    [addTank, applyInspectionVerdict, createInspection, failInspection, results, retryInspection, tanks]
  );

  return <AquacultureContext value={value}>{children}</AquacultureContext>;
}

export function useAquaculture() {
  const value = React.use(AquacultureContext);
  if (!value) {
    throw new Error('useAquaculture must be used inside AquacultureProvider');
  }
  return value;
}
