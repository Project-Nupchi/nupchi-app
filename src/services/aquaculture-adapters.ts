import { AppCopy } from '@/constants/copy';
import type {
  DiseaseEvidence,
  InspectionObject,
  InspectionResult,
  LesionBox,
  SymptomEvidence,
  Tank,
} from '@/models/aquaculture';
import { parseDiagnosisResponse } from '@/services/inference';
import type {
  DiagnosisResponse,
  FishDetection,
  FishDiagnosis,
} from '@/services/inference';
import type {
  AiResultWithPhoto,
  TankGroupRecord,
  TankRecord,
} from '@/services/supabase';

const symptomLabels: Record<string, string> = {
  corrosion: '부식',
  eye_disease: '안구 질환',
  hemorrhage: '출혈',
  tumor: '종양',
  ulcer: '궤양',
};

const diseaseLabels: Record<string, string> = {
  edwardsiellosis: '에드워드병',
  emaciation: '여윔병',
  lymphocystis: '림포시스티스병',
  scuticociliatosis: '스쿠티카병',
  streptococcosis: '연쇄구균증',
  vhs: '바이러스성 출혈성 패혈증',
  vibriosis: '비브리오병',
};

export type DiagnosisToInspectionInput = {
  capturedAt?: string;
  imageHeight?: number;
  imageWidth?: number;
  localId?: string;
  photoUri?: string;
  requestId?: string;
  tankId: string;
};

export function tankRecordToModel(
  tank: TankRecord,
  groups: Map<string, TankGroupRecord>
): Tank {
  const group = groups.get(tank.tank_group_id);
  return {
    id: tank.id,
    farmId: tank.farm_id,
    code: tank.code,
    groupId: tank.tank_group_id,
    groupName: group?.name ?? AppCopy.common.unknownGroup,
    stockedInfo: tank.stocked_info ?? formatStockedAt(tank.stocked_at),
    createdAt: tank.created_at,
    active: tank.active,
  };
}

export function diagnosisToInspection(
  diagnosis: DiagnosisResponse,
  input: DiagnosisToInspectionInput
): InspectionResult {
  const objects = diagnosis.fish.map((fish) => fishToInspectionObject(fish, input));
  const diseases = unique(objects.flatMap((object) => object.diseases));
  const bodyParts = unique(objects.flatMap((object) => object.bodyParts));
  const lesions = objects.flatMap((object) => object.lesions);

  return {
    id: input.localId ?? diagnosis.aiResultId,
    aiResultId: diagnosis.aiResultId,
    requestId: input.requestId,
    tankId: input.tankId,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    status: 'completed',
    rawGrade: diagnosis.overallGrade,
    grade:
      diagnosis.overallGrade === 'normal'
        ? 'normal'
        : diagnosis.overallGrade === 'suspect'
          ? 'caution'
          : 'suspicious',
    photoUri: input.photoUri,
    imageWidth: input.imageWidth,
    imageHeight: input.imageHeight,
    clues: [],
    bodyParts,
    diseases,
    fishCount: diagnosis.fishCount,
    suspectCount: diagnosis.suspectCount,
    affectedRatio: diagnosis.affectedRatio,
    inferenceMs: diagnosis.inferenceMs,
    modelVersion: diagnosis.modelVersion,
    evidenceSummary: buildSummary(diagnosis),
    lesions,
    objects,
  };
}

export function storedAiResultToInspection(result: AiResultWithPhoto): InspectionResult {
  const diagnosis = parseDiagnosisResponse({
    aiResultId: result.id,
    fishCount: result.fish_count,
    suspectCount: result.suspect_count,
    affectedRatio: result.affected_ratio,
    overallGrade: result.grade,
    fish: result.fish,
    inferenceMs: 0,
    modelVersion: result.model_version,
  });
  return diagnosisToInspection(diagnosis, {
    capturedAt: result.created_at,
    localId: result.id,
    photoUri: result.photoUrl ?? undefined,
    requestId: result.request_id,
    tankId: result.tank_id,
  });
}

function fishToInspectionObject(
  fish: FishDiagnosis,
  input: DiagnosisToInspectionInput
): InspectionObject {
  const diseaseEvidence: DiseaseEvidence[] = fish.diseases.map((prediction) => ({
    code: prediction.disease,
    confidence: prediction.confidence,
    label: diseaseLabel(prediction.disease),
  }));
  const symptomEvidence = fish.detections.map(detectionEvidence);
  // Normalized symptom coordinates are relative to cropDataUri, never to the original photo.
  const lesions = fish.cropDataUri
    ? fish.detections.flatMap((detection, index) =>
        detectionLesion(detection, fish.index, index)
      )
    : [];
  const evidenceSummary = buildFishSummary(fish.index, symptomEvidence, diseaseEvidence);

  return {
    id: `fish-${fish.index}`,
    index: fish.index,
    rawGrade: fish.grade,
    grade: fish.grade === 'normal' ? 'normal' : 'suspicious',
    photoUri: fish.cropDataUri ?? input.photoUri,
    bbox: fish.bbox,
    segClass: fish.segClass,
    segConfidence: fish.segConfidence,
    bodyParts: symptomEvidence.map((symptom) => symptom.label),
    diseases: diseaseEvidence.map((disease) => disease.label),
    diseaseEvidence,
    symptomEvidence,
    evidenceSummary,
    lesions,
  };
}

function detectionEvidence(detection: FishDetection): SymptomEvidence {
  return {
    code: detection.symptom,
    confidence: detection.confidence,
    label: symptomLabel(detection.symptom),
  };
}

function detectionLesion(
  detection: FishDetection,
  fishIndex: number,
  detectionIndex: number
): LesionBox[] {
  if (!detection.bboxNormalized) return [];
  const [x1, y1, x2, y2] = detection.bboxNormalized;
  return [{
    id: `fish-${fishIndex}-symptom-${detectionIndex}-${detection.symptom}`,
    x: x1 * 100,
    y: y1 * 100,
    width: (x2 - x1) * 100,
    height: (y2 - y1) * 100,
    label: symptomLabel(detection.symptom),
  }];
}

function symptomLabel(code: string) {
  return symptomLabels[code] ?? code;
}

function buildSummary(diagnosis: DiagnosisResponse) {
  if (diagnosis.fishCount === 0) return '사진에서 분석 가능한 넙치를 찾지 못했어요. 촬영 조건을 확인해 주세요.';
  if (diagnosis.suspectCount === 0) {
    return `검사한 ${diagnosis.fishCount}마리에서 뚜렷한 의심 신호가 감지되지 않았어요.`;
  }
  return `검사한 ${diagnosis.fishCount}마리 중 ${diagnosis.suspectCount}마리에서 의심 신호가 감지됐어요.`;
}

function buildFishSummary(
  index: number,
  symptoms: SymptomEvidence[],
  diseases: DiseaseEvidence[]
) {
  const findings = [...symptoms.map((item) => item.label), ...diseases.map((item) => item.label)];
  if (findings.length === 0) return `${index + 1}번 개체에서는 뚜렷한 의심 신호가 감지되지 않았어요.`;
  return `${index + 1}번 개체에서 ${unique(findings).join(', ')} 신호가 감지됐어요.`;
}

function diseaseLabel(code: string) {
  return diseaseLabels[code] ?? code;
}

function formatStockedAt(value: string | null) {
  return value ? `입식일 ${value}` : AppCopy.common.emptyStockedInfo;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}
