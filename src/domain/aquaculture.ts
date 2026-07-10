import { AppCopy, StatusCopy } from '@/constants/copy';
import type { InspectionResult, Tank, TankStatus } from '@/models/aquaculture';

export type {
  AquacultureSnapshot,
  CreateInspectionInput,
  CreateTankInput,
  DiseaseEvidence,
  FishDiagnosisGrade,
  InspectionId,
  InspectionObject,
  InspectionResult,
  InspectionStatus,
  LesionBox,
  MutationResult,
  ObjectInspectionStatus,
  OverallDiagnosisGrade,
  Tank,
  TankId,
  TankStatus,
  SymptomEvidence,
  UpdateTankInput,
} from '@/models/aquaculture';

export function getTankCode(tank: Tank) {
  return tank.code || tank.id;
}

export function getTankGroupName(tank: Tank) {
  return tank.groupName || tank.groupId;
}

// 디자인 언어: 양호(초록) / 의심(주황) / 경고(빨강)
export const statusLabel: Record<TankStatus, string> = {
  ...StatusCopy,
};

export const statusWeight: Record<TankStatus, number> = {
  suspicious: 0,
  caution: 1,
  normal: 2,
};

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value));
}

export function getTankResults(results: InspectionResult[], tankId: string) {
  return results
    .filter((result) => result.tankId === tankId)
    .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
}

export function getCurrentStatus(results: InspectionResult[], tankId: string): TankStatus {
  return getTankResults(results, tankId).find((result) => result.status === 'completed')?.grade ?? 'normal';
}

export function getTankGroupStatus(tanks: Tank[], results: InspectionResult[], tank: Tank): TankStatus {
  const ownStatus = getCurrentStatus(results, tank.id);
  if (ownStatus !== 'normal') return ownStatus;

  const hasGroupAlert = tanks.some(
    (otherTank) =>
      otherTank.id !== tank.id &&
      otherTank.groupId === tank.groupId &&
      getCurrentStatus(results, otherTank.id) === 'suspicious'
  );

  return hasGroupAlert ? 'caution' : 'normal';
}

export function getLatestResult(results: InspectionResult[], tankId: string) {
  return getTankResults(results, tankId)[0];
}

export function sortTanksByRisk(tanks: Tank[], results: InspectionResult[]) {
  return [...tanks].sort((a, b) => {
    const statusDiff = statusWeight[getTankGroupStatus(tanks, results, a)] - statusWeight[getTankGroupStatus(tanks, results, b)];
    if (statusDiff !== 0) return statusDiff;
    const aTime = getLatestResult(results, a.id)?.capturedAt ?? a.createdAt;
    const bTime = getLatestResult(results, b.id)?.capturedAt ?? b.createdAt;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });
}

export function gradeFromClues(clues: string[]): TankStatus {
  if (clues.length > 0) return 'caution';
  return 'normal';
}

export function buildCompletedInspection(result: InspectionResult): InspectionResult {
  const grade = gradeFromClues(result.clues);

  if (grade === 'normal') {
    return {
      ...result,
      status: 'completed',
      grade,
      bodyParts: ['체표'],
      diseases: [],
      evidenceSummary: AppCopy.prototype.normalSummary,
      lesions: [],
    };
  }

  if (grade === 'caution') {
    return {
      ...result,
      status: 'completed',
      grade,
      bodyParts: ['체표'],
      diseases: ['림포시스티스병'],
      evidenceSummary: AppCopy.prototype.cautionSummary,
      lesions: [{ id: 'l1', x: 42, y: 36, width: 14, height: 11, label: AppCopy.prototype.weakLesion }],
    };
  }

  return {
    ...result,
    status: 'completed',
    grade,
    bodyParts: ['체표', '지느러미 기부'],
    diseases: ['연쇄구균증', '비브리오병'],
    evidenceSummary: AppCopy.prototype.suspiciousSummary,
    lesions: [
      { id: 'l1', x: 31, y: 35, width: 18, height: 15, label: AppCopy.prototype.erythemaCandidate },
      { id: 'l2', x: 56, y: 51, width: 17, height: 13, label: AppCopy.prototype.discolorationCandidate },
    ],
  };
}
