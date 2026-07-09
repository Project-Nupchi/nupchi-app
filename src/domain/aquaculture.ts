export type TankStatus = 'normal' | 'caution' | 'suspicious';
export type InspectionStatus = 'pending' | 'completed' | 'failed';

export type LesionBox = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
};

export type Tank = {
  id: string;
  groupId: string;
  stockedInfo: string;
  createdAt: string;
  // 출하 완료 등으로 비활성화된 수조 (기록·이력은 보존, 목록에선 뮤트)
  active: boolean;
};

export type InspectionResult = {
  id: string;
  tankId: string;
  capturedAt: string;
  status: InspectionStatus;
  grade: TankStatus;
  photoUri?: string;
  clues: string[];
  bodyParts: string[];
  diseases: string[];
  evidenceSummary: string;
  lesions: LesionBox[];
};

export const statusLabel: Record<TankStatus, string> = {
  normal: '정상',
  caution: '주의',
  suspicious: '의심',
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

export const initialTanks: Tank[] = [
  {
    id: 'A-07',
    groupId: '1계통',
    stockedInfo: '광어 18,000미, 입식 42일차',
    createdAt: '2026-07-01T08:20:00.000Z',
    active: true,
  },
  {
    id: 'A-08',
    groupId: '1계통',
    stockedInfo: '광어 17,600미, 입식 42일차',
    createdAt: '2026-06-15T07:10:00.000Z',
    active: true,
  },
  {
    id: 'B-03',
    groupId: '2계통',
    stockedInfo: '광어 15,200미, 입식 31일차',
    createdAt: '2026-07-03T10:00:00.000Z',
    active: true,
  },
];

export const initialResults: InspectionResult[] = [
  {
    id: 'R-A07-003',
    tankId: 'A-07',
    capturedAt: '2026-07-08T08:32:00.000Z',
    status: 'completed',
    grade: 'suspicious',
    clues: ['무리 이탈', '체색'],
    bodyParts: ['체표', '지느러미 기부'],
    diseases: ['연쇄구균증', '비브리오병'],
    evidenceSummary: '체표 측면의 출혈성 병변 후보와 지느러미 기부 변색이 함께 감지되었습니다.',
    lesions: [
      { id: 'l1', x: 28, y: 33, width: 20, height: 16, label: '체표 홍반' },
      { id: 'l2', x: 58, y: 48, width: 16, height: 14, label: '기부 변색' },
    ],
  },
  {
    id: 'R-A07-002',
    tankId: 'A-07',
    capturedAt: '2026-07-07T08:10:00.000Z',
    status: 'completed',
    grade: 'caution',
    clues: ['섭이'],
    bodyParts: ['체표'],
    diseases: ['림포시스티스병'],
    evidenceSummary: '작은 표피 손상 후보가 있으나 경계가 약합니다. 동일 개체 재촬영을 권장합니다.',
    lesions: [{ id: 'l1', x: 46, y: 38, width: 12, height: 10, label: '약한 반점' }],
  },
  {
    id: 'R-B03-002',
    tankId: 'A-08',
    capturedAt: '2026-07-08T07:54:00.000Z',
    status: 'completed',
    grade: 'normal',
    clues: [],
    bodyParts: ['체표'],
    diseases: [],
    evidenceSummary: '명확한 병변 후보가 감지되지 않았습니다.',
    lesions: [],
  },
  {
    id: 'R-B03-001',
    tankId: 'B-03',
    capturedAt: '2026-07-07T16:20:00.000Z',
    status: 'completed',
    grade: 'caution',
    clues: ['부상'],
    bodyParts: ['꼬리지느러미'],
    diseases: ['스쿠티카병'],
    evidenceSummary: '꼬리지느러미 가장자리에 국소 손상 후보가 있습니다. 재촬영과 이력 관찰이 필요합니다.',
    lesions: [{ id: 'l1', x: 68, y: 42, width: 12, height: 13, label: '지느러미 손상' }],
  },
];

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function getTankResults(results: InspectionResult[], tankId: string) {
  return results
    .filter((result) => result.tankId === tankId)
    .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
}

export function getCurrentStatus(results: InspectionResult[], tankId: string): TankStatus {
  return getTankResults(results, tankId)[0]?.grade ?? 'normal';
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
      evidenceSummary: '명확한 병변 후보가 감지되지 않았습니다. 정기 추적 촬영을 유지하세요.',
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
      evidenceSummary: '작은 병변 후보가 있으나 경계가 약합니다. 동일 수조를 24시간 내 재촬영하세요.',
      lesions: [{ id: 'l1', x: 42, y: 36, width: 14, height: 11, label: '약한 병변' }],
    };
  }

  return {
    ...result,
    status: 'completed',
    grade,
    bodyParts: ['체표', '지느러미 기부'],
    diseases: ['연쇄구균증', '비브리오병'],
    evidenceSummary: '붉은 반점과 기부 변색 후보가 함께 감지되었습니다. 같은 수조군 격리 관찰과 전문가 확인이 필요합니다.',
    lesions: [
      { id: 'l1', x: 31, y: 35, width: 18, height: 15, label: '홍반 후보' },
      { id: 'l2', x: 56, y: 51, width: 17, height: 13, label: '변색 후보' },
    ],
  };
}
