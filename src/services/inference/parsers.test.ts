import { describe, expect, it } from 'vitest';

import { parseDiagnosisResponse } from '@/services/inference/parsers';

const CROP_DATA_URI = 'data:image/jpeg;base64,QUJD';

/** Contract diagnosis-2026.07.4: diseases carry no confidence, only { disease }. */
function suspectFish(index: number, overrides: Record<string, unknown> = {}) {
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
        bboxNormalized: [0.071, 0.2, 0.353, 0.667],
      },
    ],
    diseases: [{ disease: 'streptococcosis' }, { disease: 'emaciation' }],
    grade: 'suspect',
    cropDataUri: CROP_DATA_URI,
    cropPath: `00000000-0000-0000-0000-000000000001/photo/fish_${index}.jpg`,
    ...overrides,
  };
}

function normalFish(index: number, overrides: Record<string, unknown> = {}) {
  return {
    index,
    bbox: [200, 40, 360, 150],
    segClass: 'Healthy',
    segConfidence: 0.9,
    detections: [],
    diseases: [],
    grade: 'normal',
    cropDataUri: CROP_DATA_URI,
    cropPath: `00000000-0000-0000-0000-000000000001/photo/fish_${index}.jpg`,
    ...overrides,
  };
}

function diagnosisPayload(overrides: Record<string, unknown> = {}) {
  return {
    aiResultId: '5a3736f7-0000-4000-8000-000000000000',
    fishCount: 2,
    suspectCount: 1,
    normalCount: 1,
    affectedRatio: 0.5,
    overallGrade: 'warning',
    diseaseSummary: ['streptococcosis', 'emaciation'],
    fish: [suspectFish(0), normalFish(1)],
    inferenceMs: 2118.1,
    modelVersion: 'roboflow-seg+yolov8+vgg16-2026.07',
    ...overrides,
  };
}

describe('parseDiagnosisResponse — 질병 confidence 제거 (계약 2026.07.4)', () => {
  it('질병에 confidence가 없어도 파싱된다 (치명 버그 회귀)', () => {
    const result = parseDiagnosisResponse(diagnosisPayload(), { requireCropFields: true });
    expect(result.fish[0].diseases).toEqual([
      { disease: 'streptococcosis' },
      { disease: 'emaciation' },
    ]);
  });

  it('레거시 이력처럼 질병에 confidence가 있어도 무시하고 파싱한다', () => {
    const payload = diagnosisPayload({
      fish: [
        suspectFish(0, {
          diseases: [
            { disease: 'streptococcosis', confidence: 0.8 },
            { disease: 'emaciation', confidence: 0.6 },
          ],
        }),
        normalFish(1),
      ],
    });
    const result = parseDiagnosisResponse(payload);
    expect(result.fish[0].diseases).toEqual([
      { disease: 'streptococcosis' },
      { disease: 'emaciation' },
    ]);
  });
});

describe('parseDiagnosisResponse — cropPath', () => {
  it('cropPath는 계약상 optional — requireCropFields여도 없으면 null (schema fish.required 제외)', () => {
    const payload = diagnosisPayload({
      fish: [suspectFish(0, { cropPath: null }), normalFish(1)],
    });
    const result = parseDiagnosisResponse(payload, { requireCropFields: true });
    expect(result.fish[0].cropPath).toBeNull();
  });

  it('cropPath 문자열을 보존한다', () => {
    const result = parseDiagnosisResponse(diagnosisPayload(), { requireCropFields: true });
    expect(result.fish[0].cropPath).toBe(
      '00000000-0000-0000-0000-000000000001/photo/fish_0.jpg'
    );
    expect(result.fish[1].cropPath).toBe(
      '00000000-0000-0000-0000-000000000001/photo/fish_1.jpg'
    );
  });

  it('이력/detect처럼 cropPath가 없으면 null로 채운다', () => {
    const payload = diagnosisPayload({
      fish: [
        suspectFish(0, { cropDataUri: undefined, cropPath: undefined }),
        normalFish(1, { cropDataUri: undefined, cropPath: undefined }),
      ],
    });
    const result = parseDiagnosisResponse(payload);
    expect(result.fish[0].cropPath).toBeNull();
  });
});

describe('parseDiagnosisResponse — normalCount', () => {
  it('제공되고 일치하면 그대로 사용한다', () => {
    const result = parseDiagnosisResponse(diagnosisPayload(), { requireCropFields: true });
    expect(result.normalCount).toBe(1);
  });

  it('제공됐지만 fishCount-suspectCount와 다르면 오류', () => {
    const payload = diagnosisPayload({ normalCount: 5 });
    expect(() => parseDiagnosisResponse(payload)).toThrow();
  });

  it('없으면 fishCount-suspectCount로 파생한다', () => {
    const payload = diagnosisPayload({ normalCount: undefined });
    const result = parseDiagnosisResponse(payload);
    expect(result.normalCount).toBe(1);
  });
});

describe('parseDiagnosisResponse — diseaseSummary', () => {
  it('제공되면 순서를 보존해 사용한다', () => {
    const payload = diagnosisPayload({ diseaseSummary: ['emaciation', 'streptococcosis'] });
    const result = parseDiagnosisResponse(payload);
    expect(result.diseaseSummary).toEqual(['emaciation', 'streptococcosis']);
  });

  it('중복이 있으면 오류 (계약: 중복 없음)', () => {
    const payload = diagnosisPayload({
      diseaseSummary: ['streptococcosis', 'streptococcosis'],
    });
    expect(() => parseDiagnosisResponse(payload)).toThrow();
  });

  it('없으면 개체 질병에서 다발순으로 파생한다', () => {
    const payload = diagnosisPayload({
      diseaseSummary: undefined,
      suspectCount: 2,
      normalCount: 0,
      fishCount: 2,
      affectedRatio: 1,
      overallGrade: 'warning',
      fish: [
        suspectFish(0, { diseases: [{ disease: 'emaciation' }] }),
        suspectFish(1, {
          diseases: [{ disease: 'streptococcosis' }, { disease: 'emaciation' }],
        }),
      ],
    });
    const result = parseDiagnosisResponse(payload);
    // emaciation 2회(다발) → 먼저, streptococcosis 1회 → 나중
    expect(result.diseaseSummary).toEqual(['emaciation', 'streptococcosis']);
  });
});

describe('parseDiagnosisResponse — 기존 계약 검증 유지', () => {
  it('핸드오프 예시 응답이 온전히 파싱된다', () => {
    const result = parseDiagnosisResponse(diagnosisPayload(), { requireCropFields: true });
    expect(result.fishCount).toBe(2);
    expect(result.suspectCount).toBe(1);
    expect(result.overallGrade).toBe('warning');
    expect(result.fish).toHaveLength(2);
    expect(result.fish[0].detections[0].confidence).toBe(0.72);
  });

  it('fish.length가 fishCount와 다르면 오류', () => {
    const payload = diagnosisPayload({ fishCount: 3 });
    expect(() => parseDiagnosisResponse(payload)).toThrow();
  });
});
