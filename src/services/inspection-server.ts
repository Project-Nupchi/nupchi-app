import sampleAquaculture from '@/data/sample-aquaculture.json';
import { InspectionResult, buildCompletedInspection } from '@/domain/aquaculture';

const demoVerdicts = (sampleAquaculture as { demoVerdicts: Partial<InspectionResult>[] }).demoVerdicts;

export function buildPrototypeInspectionVerdict(result: InspectionResult) {
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
    objects: sample.objects ?? [],
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
