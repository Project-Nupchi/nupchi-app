import { invalidInferenceResponse } from '@/services/inference/errors';
import { overallGradeFromMetrics } from '@/services/inference/grading';
import type {
  BoundingBox,
  DiagnosisResponse,
  DiseasePrediction,
  FishDetection,
  FishDiagnosisGrade,
  FishDiagnosis,
  GuideAction,
  GuideEvidence,
  GuideResponse,
  HealthResponse,
  NormalizedBoundingBox,
  OverallDiagnosisGrade,
} from '@/services/inference/types';

const fishDiagnosisGrades = new Set<FishDiagnosisGrade>(['normal', 'suspect']);
const overallDiagnosisGrades = new Set<OverallDiagnosisGrade>(['normal', 'suspect', 'warning']);

export type DiagnosisParserOptions = {
  /** Immediate /diagnose responses must include crop images and normalized symptom boxes. */
  requireCropFields?: boolean;
};

export function parseHealthResponse(value: unknown): HealthResponse {
  const data = record(value, 'health');
  if (data.status !== 'ok') invalid('health.status');
  return {
    status: 'ok',
    serviceVersion: optionalString(data.serviceVersion, 'health.serviceVersion'),
    contractVersion: optionalString(data.contractVersion, 'health.contractVersion'),
  };
}

export function parseDiagnosisResponse(
  value: unknown,
  options: DiagnosisParserOptions = {}
): DiagnosisResponse {
  const data = record(value, 'diagnosis');
  const fish = array(data.fish, 'diagnosis.fish').map((item, index) =>
    parseFishDiagnosis(item, index, options)
  );
  const fishCount = nonNegativeInteger(data.fishCount, 'diagnosis.fishCount');
  const suspectCount = nonNegativeInteger(data.suspectCount, 'diagnosis.suspectCount');
  const affectedRatio = rangedNumber(data.affectedRatio, 0, 1, 'diagnosis.affectedRatio');
  const overallGrade = enumValue(
    data.overallGrade,
    overallDiagnosisGrades,
    'diagnosis.overallGrade'
  );

  if (fish.length !== fishCount) invalid('diagnosis.fishCount');
  if (suspectCount > fishCount) invalid('diagnosis.suspectCount');
  if (fish.filter((item) => item.grade === 'suspect').length !== suspectCount) {
    invalid('diagnosis.suspectCount');
  }
  if (overallGradeFromMetrics(suspectCount, affectedRatio) !== overallGrade) {
    invalid('diagnosis.overallGrade');
  }

  return {
    aiResultId: nonEmptyString(data.aiResultId, 'diagnosis.aiResultId'),
    fishCount,
    suspectCount,
    normalCount: resolveNormalCount(data.normalCount, fishCount, suspectCount),
    affectedRatio,
    overallGrade,
    diseaseSummary: resolveDiseaseSummary(data.diseaseSummary, fish),
    fish,
    inferenceMs: nonNegativeNumber(data.inferenceMs, 'diagnosis.inferenceMs'),
    modelVersion: nonEmptyString(data.modelVersion, 'diagnosis.modelVersion'),
  };
}

export function parseGuideResponse(value: unknown): GuideResponse {
  const data = record(value, 'guide');
  const report = record(data.report, 'guide.report');
  return {
    aiResultId: nonEmptyString(data.aiResultId, 'guide.aiResultId'),
    report: {
      situation: nonEmptyString(report.situation, 'guide.report.situation'),
      riskLevel: nonEmptyString(report.riskLevel, 'guide.report.riskLevel'),
      actions: array(report.actions, 'guide.report.actions').map(parseGuideAction),
      evidence: array(report.evidence, 'guide.report.evidence').map(parseGuideEvidence),
    },
    disclaimer: nonEmptyString(data.disclaimer, 'guide.disclaimer'),
  };
}

function parseFishDiagnosis(
  value: unknown,
  arrayIndex: number,
  options: DiagnosisParserOptions
): FishDiagnosis {
  const path = `diagnosis.fish[${arrayIndex}]`;
  const data = record(value, path);
  const cropDataUri = optionalJpegDataUri(data.cropDataUri, `${path}.cropDataUri`);
  if (options.requireCropFields && !cropDataUri) invalid(`${path}.cropDataUri`);

  return {
    index: nonNegativeInteger(data.index, `${path}.index`),
    bbox: boundingBox(data.bbox, `${path}.bbox`),
    segClass: nonEmptyString(data.segClass, `${path}.segClass`),
    segConfidence: rangedNumber(data.segConfidence, 0, 1, `${path}.segConfidence`),
    detections: array(data.detections, `${path}.detections`).map((item, index) =>
      parseDetection(item, `${path}.detections[${index}]`, options)
    ),
    diseases: array(data.diseases, `${path}.diseases`).map((item, index) =>
      parseDiseasePrediction(item, `${path}.diseases[${index}]`)
    ),
    grade: enumValue(data.grade, fishDiagnosisGrades, `${path}.grade`),
    cropDataUri,
    cropPath: cropPath(data.cropPath, `${path}.cropPath`),
  };
}

function parseDetection(
  value: unknown,
  path: string,
  options: DiagnosisParserOptions
): FishDetection {
  const data = record(value, path);
  const bboxNormalized = optionalNormalizedBoundingBox(
    data.bboxNormalized,
    `${path}.bboxNormalized`
  );
  if (options.requireCropFields && !bboxNormalized) invalid(`${path}.bboxNormalized`);

  return {
    symptom: nonEmptyString(data.symptom, `${path}.symptom`),
    confidence: rangedNumber(data.confidence, 0, 1, `${path}.confidence`),
    bbox: boundingBox(data.bbox, `${path}.bbox`),
    bboxNormalized,
  };
}

function parseDiseasePrediction(value: unknown, path: string): DiseasePrediction {
  const data = record(value, path);
  // Contract 2026.07.4 drops disease confidence; ignore any legacy confidence still stored.
  return {
    disease: nonEmptyString(data.disease, `${path}.disease`),
  };
}

/** Server sends normalCount; history omits it, so derive from fishCount - suspectCount. */
function resolveNormalCount(value: unknown, fishCount: number, suspectCount: number): number {
  const expected = fishCount - suspectCount;
  if (value === undefined || value === null) return expected;
  const parsed = nonNegativeInteger(value, 'diagnosis.normalCount');
  if (parsed !== expected) invalid('diagnosis.normalCount');
  return parsed;
}

/** Server sends deduped, prevalence-ordered summary; history omits it, so derive from fish diseases. */
function resolveDiseaseSummary(value: unknown, fish: FishDiagnosis[]): string[] {
  if (value === undefined || value === null) return deriveDiseaseSummary(fish);
  const values = array(value, 'diagnosis.diseaseSummary');
  const summary = values.map((item, index) =>
    nonEmptyString(item, `diagnosis.diseaseSummary[${index}]`)
  );
  if (new Set(summary).size !== summary.length) invalid('diagnosis.diseaseSummary');
  return summary;
}

function deriveDiseaseSummary(fish: FishDiagnosis[]): string[] {
  // Map keeps first-seen order; a stable sort by count keeps it for ties → prevalence order.
  const counts = new Map<string, number>();
  for (const item of fish) {
    for (const prediction of item.diseases) {
      counts.set(prediction.disease, (counts.get(prediction.disease) ?? 0) + 1);
    }
  }
  return [...counts.keys()].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
}

// Schema marks cropPath optional/nullable (not in fish.required): /diagnose sets it, /detect
// and mock/history omit it. Immediate display uses cropDataUri, so never fail on a missing path.
function cropPath(value: unknown, path: string): string | null {
  if (value === undefined || value === null) return null;
  return nonEmptyString(value, path);
}

function parseGuideAction(value: unknown, arrayIndex: number): GuideAction {
  const path = `guide.report.actions[${arrayIndex}]`;
  const data = record(value, path);
  return {
    title: nonEmptyString(data.title, `${path}.title`),
    detail: nonEmptyString(data.detail, `${path}.detail`),
    priority: nonNegativeInteger(data.priority, `${path}.priority`),
  };
}

function parseGuideEvidence(value: unknown, arrayIndex: number): GuideEvidence {
  const path = `guide.report.evidence[${arrayIndex}]`;
  const data = record(value, path);
  return {
    source: nonEmptyString(data.source, `${path}.source`),
    quote: nonEmptyString(data.quote, `${path}.quote`),
  };
}

function boundingBox(value: unknown, path: string): BoundingBox {
  const values = array(value, path);
  if (values.length !== 4) invalid(path);
  return [
    finiteNumber(values[0], `${path}[0]`),
    finiteNumber(values[1], `${path}[1]`),
    finiteNumber(values[2], `${path}[2]`),
    finiteNumber(values[3], `${path}[3]`),
  ];
}

function optionalNormalizedBoundingBox(
  value: unknown,
  path: string
): NormalizedBoundingBox | undefined {
  if (value === undefined || value === null) return undefined;
  const values = array(value, path);
  if (values.length !== 4) invalid(path);
  const result: NormalizedBoundingBox = [
    rangedNumber(values[0], 0, 1, `${path}[0]`),
    rangedNumber(values[1], 0, 1, `${path}[1]`),
    rangedNumber(values[2], 0, 1, `${path}[2]`),
    rangedNumber(values[3], 0, 1, `${path}[3]`),
  ];
  if (result[2] <= result[0] || result[3] <= result[1]) invalid(path);
  return result;
}

function optionalJpegDataUri(value: unknown, path: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  const parsed = nonEmptyString(value, path);
  const prefix = 'data:image/jpeg;base64,';
  if (!parsed.startsWith(prefix) || parsed.length === prefix.length) invalid(path);
  return parsed;
}

function enumValue<T extends string>(value: unknown, allowed: Set<T>, path: string): T {
  if (typeof value === 'string' && allowed.has(value as T)) return value as T;
  invalid(path);
}

function nonEmptyString(value: unknown, path: string): string {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  invalid(path);
}

function optionalString(value: unknown, path: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  return nonEmptyString(value, path);
}

function finiteNumber(value: unknown, path: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  invalid(path);
}

function nonNegativeNumber(value: unknown, path: string): number {
  const parsed = finiteNumber(value, path);
  if (parsed >= 0) return parsed;
  invalid(path);
}

function nonNegativeInteger(value: unknown, path: string): number {
  const parsed = nonNegativeNumber(value, path);
  if (Number.isInteger(parsed)) return parsed;
  invalid(path);
}

function rangedNumber(value: unknown, minimum: number, maximum: number, path: string): number {
  const parsed = finiteNumber(value, path);
  if (parsed >= minimum && parsed <= maximum) return parsed;
  invalid(path);
}

function array(value: unknown, path: string): unknown[] {
  if (Array.isArray(value)) return value;
  invalid(path);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (isRecord(value)) return value;
  invalid(path);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalid(path: string): never {
  throw invalidInferenceResponse(path);
}
