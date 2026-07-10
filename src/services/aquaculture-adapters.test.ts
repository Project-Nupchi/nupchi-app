import { describe, expect, it } from 'vitest';

import type { DiagnosisResponse, FishDiagnosis } from '@/services/inference/types';
import type { AiResultWithPhoto } from '@/services/supabase';
import {
  applyCropUrls,
  diagnosisToInspection,
  storedAiResultToInspection,
} from '@/services/aquaculture-adapters';

function suspectFish(index: number, overrides: Partial<FishDiagnosis> = {}): FishDiagnosis {
  return {
    index,
    bbox: [10, 20, 180, 140],
    segClass: 'Healthy',
    segConfidence: 0.94,
    detections: [
      {
        symptom: 'ulcer',
        confidence: 0.72,
        bbox: [12, 24, 60, 80],
        bboxNormalized: [0.07, 0.2, 0.35, 0.66],
      },
    ],
    diseases: [{ disease: 'streptococcosis' }],
    grade: 'suspect',
    cropDataUri: 'data:image/jpeg;base64,QUJD',
    cropPath: `farm/photo/fish_${index}.jpg`,
    ...overrides,
  };
}

function diagnosis(overrides: Partial<DiagnosisResponse> = {}): DiagnosisResponse {
  return {
    aiResultId: 'result-1',
    fishCount: 2,
    suspectCount: 2,
    normalCount: 0,
    affectedRatio: 1,
    overallGrade: 'warning',
    diseaseSummary: ['emaciation', 'streptococcosis'],
    fish: [
      suspectFish(0, { diseases: [{ disease: 'streptococcosis' }] }),
      suspectFish(1, {
        diseases: [{ disease: 'emaciation' }, { disease: 'streptococcosis' }],
      }),
    ],
    inferenceMs: 100,
    modelVersion: 'test',
    ...overrides,
  };
}

describe('diagnosisToInspection', () => {
  it('수조 질병 요약은 개체 집계가 아니라 diagnosis.diseaseSummary 순서를 따른다', () => {
    // 개체별 flatMap 순서는 [연쇄구균증, 여윔병]이지만, diseaseSummary는 [여윔병, 연쇄구균증]
    const result = diagnosisToInspection(diagnosis(), { tankId: 'tank-1' });
    expect(result.diseases).toEqual(['여윔병', '연쇄구균증']);
  });

  it('질병 근거에는 confidence가 없고, 증상 근거에는 confidence가 유지된다', () => {
    const result = diagnosisToInspection(diagnosis(), { tankId: 'tank-1' });
    const object = result.objects?.[0];
    expect(object?.diseaseEvidence?.[0]).toEqual({
      code: 'streptococcosis',
      label: '연쇄구균증',
    });
    expect(object?.symptomEvidence?.[0].confidence).toBe(0.72);
  });

  it('개체에 cropPath를 전달한다', () => {
    const result = diagnosisToInspection(diagnosis(), { tankId: 'tank-1' });
    expect(result.objects?.[0].cropPath).toBe('farm/photo/fish_0.jpg');
  });
});

describe('storedAiResultToInspection', () => {
  it('레거시 이력(질병 confidence 포함, normalCount/diseaseSummary/cropPath 없음)을 오류 없이 복원한다', () => {
    const stored: AiResultWithPhoto = {
      affected_ratio: 0.5,
      created_at: '2026-07-10T00:00:00Z',
      farm_id: 'farm-1',
      fish: [
        {
          index: 0,
          bbox: [10, 20, 180, 140],
          segClass: 'Healthy',
          segConfidence: 0.9,
          detections: [],
          diseases: [{ disease: 'emaciation', confidence: 0.6 }],
          grade: 'suspect',
        },
        {
          index: 1,
          bbox: [200, 40, 360, 150],
          segClass: 'Healthy',
          segConfidence: 0.9,
          detections: [],
          diseases: [],
          grade: 'normal',
        },
      ],
      fish_count: 2,
      grade: 'warning',
      id: 'result-1',
      model_version: 'legacy',
      photo_id: 'photo-1',
      request_id: 'req-1',
      suspect_count: 1,
      tank_id: 'tank-1',
      photo: null,
      photoUrl: null,
    };

    const result = storedAiResultToInspection(stored);
    expect(result.tankId).toBe('tank-1');
    expect(result.diseases).toEqual(['여윔병']);
    expect(result.objects).toHaveLength(2);
  });
});

describe('applyCropUrls (이력 crop을 signed URL로 표시)', () => {
  function storedWithCrops(): AiResultWithPhoto {
    return {
      affected_ratio: 0.5,
      created_at: '2026-07-10T00:00:00Z',
      farm_id: 'farm-1',
      fish: [
        {
          index: 0,
          bbox: [10, 20, 180, 140],
          segClass: 'Healthy',
          segConfidence: 0.9,
          detections: [],
          diseases: [{ disease: 'emaciation' }],
          grade: 'suspect',
          cropPath: 'farm-1/photo-1/fish_0.jpg',
        },
        {
          index: 1,
          bbox: [200, 40, 360, 150],
          segClass: 'Healthy',
          segConfidence: 0.9,
          detections: [],
          diseases: [],
          grade: 'normal',
          cropPath: 'farm-1/photo-1/fish_1.jpg',
        },
      ],
      fish_count: 2,
      grade: 'warning',
      id: 'result-1',
      model_version: 'test',
      photo_id: 'photo-1',
      request_id: 'req-1',
      suspect_count: 1,
      tank_id: 'tank-1',
      photo: null,
      photoUrl: 'https://example/full-photo.jpg',
    };
  }

  it('cropPath에 해당하는 signed URL을 개체 photoUri로 넣는다', () => {
    const result = storedAiResultToInspection(storedWithCrops());
    // 이력에는 cropDataUri가 없어 개체 photoUri는 원본 전체사진으로 fallback
    expect(result.objects?.[0].photoUri).toBe('https://example/full-photo.jpg');

    const cropUrls = new Map<string, string | null>([
      ['farm-1/photo-1/fish_0.jpg', 'https://example/crop_0.jpg'],
      ['farm-1/photo-1/fish_1.jpg', null], // 서명 실패 → fallback 유지
    ]);
    const applied = applyCropUrls(result, cropUrls);

    expect(applied.objects?.[0].photoUri).toBe('https://example/crop_0.jpg');
    expect(applied.objects?.[1].photoUri).toBe('https://example/full-photo.jpg');
  });

  it('입력 결과를 변형하지 않는다 (불변)', () => {
    const result = storedAiResultToInspection(storedWithCrops());
    const cropUrls = new Map<string, string | null>([
      ['farm-1/photo-1/fish_0.jpg', 'https://example/crop_0.jpg'],
    ]);
    applyCropUrls(result, cropUrls);
    expect(result.objects?.[0].photoUri).toBe('https://example/full-photo.jpg');
  });

  function storedWithDetection(): AiResultWithPhoto {
    return {
      ...storedWithCrops(),
      fish: [
        {
          index: 0,
          bbox: [10, 20, 180, 140],
          segClass: 'Healthy',
          segConfidence: 0.9,
          detections: [
            { symptom: 'hemorrhage', confidence: 0.8, bbox: [12, 24, 90, 70], bboxNormalized: [0.1, 0.2, 0.5, 0.6] },
          ],
          diseases: [{ disease: 'emaciation' }],
          grade: 'suspect',
          cropPath: 'farm-1/photo-1/fish_0.jpg',
        },
        {
          index: 1,
          bbox: [200, 40, 360, 150],
          segClass: 'Healthy',
          segConfidence: 0.9,
          detections: [],
          diseases: [],
          grade: 'normal',
          cropPath: 'farm-1/photo-1/fish_1.jpg',
        },
      ],
    };
  }

  it('signed URL 적용 시 crop 기준 병변 박스를 복원한다', () => {
    const result = storedAiResultToInspection(storedWithDetection());
    // 이력은 cropDataUri가 없어 crop 이미지를 표시하기 전에는 오버레이 박스를 그리지 않는다
    expect(result.objects?.[0].lesions).toHaveLength(0);

    const cropUrls = new Map<string, string | null>([
      ['farm-1/photo-1/fish_0.jpg', 'https://example/crop_0.jpg'],
    ]);
    const applied = applyCropUrls(result, cropUrls);

    // signed crop URL이 적용되면 crop 기준 박스가 복원되어 오버레이가 다시 보인다
    expect(applied.objects?.[0].lesions).toHaveLength(1);
    expect(applied.objects?.[0].lesions[0]).toMatchObject({ x: 10, y: 20, width: 40, height: 40 });
  });

  it('signed URL이 없으면(서명 실패) 병변 박스도 복원하지 않는다', () => {
    const result = storedAiResultToInspection(storedWithDetection());
    const cropUrls = new Map<string, string | null>([['farm-1/photo-1/fish_0.jpg', null]]);
    const applied = applyCropUrls(result, cropUrls);
    expect(applied.objects?.[0].lesions).toHaveLength(0);
  });
});
