import { InspectionResult, buildCompletedInspection } from '@/domain/aquaculture';

export async function requestInspectionVerdict(result: InspectionResult) {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  if (result.clues.includes('유영') && result.clues.includes('부상')) {
    throw new Error('inspection-server-unavailable');
  }

  return buildCompletedInspection(result);
}
