import { AppCopy, StatusCopy } from '@/constants/copy';
import type { InspectionResult, Tank, TankStatus } from '@/models/aquaculture';

export type {
  AquacultureSnapshot,
  CreateInspectionInput,
  CreateTankInput,
  InspectionId,
  InspectionObject,
  InspectionResult,
  InspectionStatus,
  LesionBox,
  LoginInput,
  LoginResponse,
  MutationResult,
  ObjectInspectionStatus,
  Tank,
  TankId,
  TankStatus,
  UpdateTankInput,
  UserSession,
} from '@/models/aquaculture';

// 디자인 언어: 양호(초록) / 의심(주황) / 경고(빨강)
export const statusLabel: Record<TankStatus, string> = {
  ...StatusCopy,
};

export const statusWeight: Record<TankStatus, number> = {
  suspicious: 0,
  caution: 1,
  normal: 2,
};

export const behaviorClues = ['유영', '부상', '무리 이탈', '섭이', '체색'] as const;

export const flounderDiseaseLabels = [
  '바이러스성출혈성패혈증(VHS)',
  '림포시스티스병',
  '여윔병',
  '스쿠티카병',
  '연쇄구균증',
  '비브리오병',
  '에드워드병',
] as const;

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

export function getGroupAlertSource(tanks: Tank[], results: InspectionResult[], tank: Tank) {
  return tanks.find(
    (otherTank) =>
      otherTank.id !== tank.id &&
      otherTank.groupId === tank.groupId &&
      getCurrentStatus(results, otherTank.id) === 'suspicious'
  );
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

// 수조군 단위 요약: 그룹명, 소속 수조 수, 그룹 내 최고 경보 등급 (S2)
export type GroupSummary = {
  groupId: string;
  tankCount: number;
  topStatus: TankStatus;
};

export function getGroupSummaries(tanks: Tank[], results: InspectionResult[]): GroupSummary[] {
  const groups = new Map<string, Tank[]>();
  for (const tank of tanks) {
    const list = groups.get(tank.groupId) ?? [];
    list.push(tank);
    groups.set(tank.groupId, list);
  }

  return [...groups.entries()]
    .map(([groupId, groupTanks]) => {
      const topStatus = groupTanks.reduce<TankStatus>((worst, tank) => {
        const status = getTankGroupStatus(tanks, results, tank);
        return statusWeight[status] < statusWeight[worst] ? status : worst;
      }, 'normal');
      return { groupId, tankCount: groupTanks.length, topStatus };
    })
    .sort((a, b) => statusWeight[a.topStatus] - statusWeight[b.topStatus]);
}

// 활성 경보: 의심 등급으로 완료된 판정 (S11)
export function getActiveAlerts(results: InspectionResult[]) {
  return results
    .filter((result) => result.status === 'completed' && result.grade === 'suspicious')
    .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
}

export function isCapturedToday(value: string) {
  const target = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short' }).format(new Date(value));
  const today = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short' }).format(new Date());
  return target === today;
}

// 오늘 촬영이 완료된 수조 수 (S1 촬영 진행률)
export function countTanksCapturedToday(tanks: Tank[], results: InspectionResult[]) {
  return tanks.filter((tank) => getTankResults(results, tank.id).some((result) => isCapturedToday(result.capturedAt))).length;
}

export function gradeFromClues(clues: string[]): TankStatus {
  if (clues.includes('체색') || clues.includes('무리 이탈')) return 'suspicious';
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
