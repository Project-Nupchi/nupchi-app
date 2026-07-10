import { InferenceClient } from '@/services/inference/inference-client';

export { InferenceApiError } from '@/services/inference/errors';
export {
  INFERENCE_TIMEOUTS,
  InferenceClient,
  type InferenceClientOptions,
} from '@/services/inference/inference-client';
export {
  parseDiagnosisResponse,
  parseGuideResponse,
  parseHealthResponse,
  type DiagnosisParserOptions,
} from '@/services/inference/parsers';
export {
  overallGradeFromMetrics,
  WARNING_AFFECTED_RATIO,
} from '@/services/inference/grading';
export type {
  BoundingBox,
  DiagnoseInput,
  DiagnosisResponse,
  DiseasePrediction,
  FishDetection,
  FishDiagnosisGrade,
  FishDiagnosis,
  GuideAction,
  GuideEvidence,
  GuideReport,
  GuideResponse,
  HealthResponse,
  InferenceApi,
  InferenceImage,
  JsonPrimitive,
  JsonValue,
  NormalizedBoundingBox,
  OverallDiagnosisGrade,
} from '@/services/inference/types';

export const inferenceClient = new InferenceClient();
