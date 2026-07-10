import type { OverallDiagnosisGrade } from '@/services/inference/types';

export const WARNING_AFFECTED_RATIO = 0.3;

export function overallGradeFromMetrics(
  suspectCount: number,
  affectedRatio: number
): OverallDiagnosisGrade {
  if (suspectCount === 0) return 'normal';
  return affectedRatio >= WARNING_AFFECTED_RATIO ? 'warning' : 'suspect';
}
