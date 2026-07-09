import { InspectionResult, buildCompletedInspection } from '@/domain/aquaculture';

// 데모용 샘플 판정 (스쿠티카병 의심) — 카메라 빠른 촬영 흐름에서 사용
const demoVerdicts: Partial<InspectionResult>[] = [
  {
    grade: 'suspicious',
    bodyParts: ['체표', '지느러미'],
    diseases: ['스쿠티카병'],
    evidenceSummary: '체표에 붉은 반점(출혈성 병변) 후보가 감지되었습니다. 스쿠티카병 초기 신호와 유사해 같은 수조군 관찰과 전문가 확인이 필요합니다.',
    lesions: [
      { id: 'l1', x: 34, y: 30, width: 22, height: 20, label: '붉은 반점' },
      { id: 'l2', x: 60, y: 50, width: 14, height: 12, label: '지느러미 손상' },
    ],
  },
  {
    grade: 'caution',
    bodyParts: ['체표'],
    diseases: ['림포시스티스병'],
    evidenceSummary: '작은 표피 이상 후보가 있으나 경계가 약합니다. 동일 개체를 24시간 내 재촬영해 진행 여부를 확인하세요.',
    lesions: [{ id: 'l1', x: 44, y: 36, width: 14, height: 11, label: '약한 반점' }],
  },
  {
    grade: 'normal',
    bodyParts: ['체표'],
    diseases: [],
    evidenceSummary: '명확한 병변 후보가 감지되지 않았습니다. 정기 추적 촬영을 유지하세요.',
    lesions: [],
  },
];

export async function requestInspectionVerdict(result: InspectionResult) {
  await new Promise((resolve) => setTimeout(resolve, 1600));

  if (result.clues.includes('유영') && result.clues.includes('부상')) {
    throw new Error('inspection-server-unavailable');
  }

  // 단서를 고른 경우엔 단서 기반 판정, 빠른 촬영(단서 없음)은 데모 샘플을 순환
  if (result.clues.length > 0) {
    return buildCompletedInspection(result);
  }

  const sample = demoVerdicts[hashToIndex(result.id, demoVerdicts.length)];
  return {
    ...result,
    status: 'completed',
    grade: sample.grade ?? 'normal',
    bodyParts: sample.bodyParts ?? [],
    diseases: sample.diseases ?? [],
    evidenceSummary: sample.evidenceSummary ?? '',
    lesions: sample.lesions ?? [],
  } satisfies InspectionResult;
}

// result.id로 데모 샘플을 결정적으로 선택 (첫 촬영이 의심 샘플이 되도록 가중)
function hashToIndex(id: string, length: number) {
  let sum = 0;
  for (let i = 0; i < id.length; i += 1) sum += id.charCodeAt(i);
  // 60% 의심, 25% 주의, 15% 정상 느낌으로 편향
  const bucket = sum % 20;
  if (bucket < 12) return 0;
  if (bucket < 17) return 1;
  return Math.min(2, length - 1);
}
