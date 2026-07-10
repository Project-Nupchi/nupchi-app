export type TankId = string;
export type InspectionId = string;
export type FishDiagnosisGrade = 'normal' | 'suspect';
export type OverallDiagnosisGrade = FishDiagnosisGrade | 'warning';

export type TankStatus = 'normal' | 'caution' | 'suspicious';
export type InspectionStatus = 'pending' | 'completed' | 'failed';
export type ObjectInspectionStatus = Extract<TankStatus, 'normal' | 'suspicious'>;

export type LesionBox = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
};

export type Tank = {
  id: TankId;
  farmId: string;
  code: string;
  groupId: string;
  groupName: string;
  stockedInfo: string;
  createdAt: string;
  active: boolean;
};

export type DiseaseEvidence = {
  code: string;
  confidence: number;
  label: string;
};

export type SymptomEvidence = {
  code: string;
  confidence?: number;
  label: string;
};

export type InspectionObject = {
  id: string;
  index?: number;
  rawGrade?: FishDiagnosisGrade;
  grade: ObjectInspectionStatus;
  photoUri?: string;
  bbox?: readonly [number, number, number, number];
  segClass?: string;
  segConfidence?: number;
  bodyParts: string[];
  diseases: string[];
  diseaseEvidence?: DiseaseEvidence[];
  symptomEvidence?: SymptomEvidence[];
  evidenceSummary: string;
  lesions: LesionBox[];
};

export type InspectionResult = {
  id: InspectionId;
  aiResultId?: string;
  requestId?: string;
  tankId: TankId;
  capturedAt: string;
  status: InspectionStatus;
  rawGrade?: OverallDiagnosisGrade;
  grade: TankStatus;
  photoUri?: string;
  imageWidth?: number;
  imageHeight?: number;
  clues: string[];
  bodyParts: string[];
  diseases: string[];
  fishCount?: number;
  suspectCount?: number;
  affectedRatio?: number;
  inferenceMs?: number;
  modelVersion?: string;
  evidenceSummary: string;
  lesions: LesionBox[];
  objects?: InspectionObject[];
};

export type CreateTankInput = Pick<Tank, 'code' | 'groupName' | 'stockedInfo'>;
export type UpdateTankInput = Pick<Tank, 'groupName' | 'stockedInfo' | 'active'>;

export type CreateInspectionInput = {
  tankId: TankId;
  photoUri?: string;
  clues: string[];
};

export type AquacultureSnapshot = {
  tanks: Tank[];
  results: InspectionResult[];
};

export type MutationResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : T))
  | { ok: false; message: string };
