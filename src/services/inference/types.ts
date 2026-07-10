export type FishDiagnosisGrade = 'normal' | 'suspect';
export type OverallDiagnosisGrade = FishDiagnosisGrade | 'warning';

export type BoundingBox = readonly [number, number, number, number];
export type NormalizedBoundingBox = readonly [number, number, number, number];

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface FishDetection {
  symptom: string;
  confidence: number;
  bbox: BoundingBox;
  /** Coordinates relative to the individual fish crop, in the 0..1 range. */
  bboxNormalized?: NormalizedBoundingBox;
}

export interface DiseasePrediction {
  disease: string;
  confidence: number;
}

export interface FishDiagnosis {
  index: number;
  bbox: BoundingBox;
  segClass: string;
  segConfidence: number;
  detections: FishDetection[];
  diseases: DiseasePrediction[];
  grade: FishDiagnosisGrade;
  /** Present in the immediate /diagnose response, omitted from Supabase history. */
  cropDataUri?: string;
}

export interface DiagnosisResponse {
  aiResultId: string;
  fishCount: number;
  suspectCount: number;
  affectedRatio: number;
  overallGrade: OverallDiagnosisGrade;
  fish: FishDiagnosis[];
  inferenceMs: number;
  modelVersion: string;
}

export interface InferenceImage {
  uri: string;
  name?: string;
  type?: 'image/jpeg' | 'image/png';
}

export interface DiagnoseInput {
  image: InferenceImage;
  farmId: string;
  tankId: string;
  requestId: string;
}

export interface GuideAction {
  title: string;
  detail: string;
  priority: number;
}

export interface GuideEvidence {
  source: string;
  quote: string;
}

export interface GuideReport {
  situation: string;
  riskLevel: string;
  actions: GuideAction[];
  evidence: GuideEvidence[];
}

export interface GuideResponse {
  aiResultId: string;
  report: GuideReport;
  disclaimer: string;
}

export interface HealthResponse {
  status: 'ok';
  serviceVersion?: string;
  contractVersion?: string;
}

export interface InferenceApi {
  health(): Promise<HealthResponse>;
  diagnose(input: DiagnoseInput): Promise<DiagnosisResponse>;
  guide(aiResultId: string): Promise<GuideResponse>;
}
