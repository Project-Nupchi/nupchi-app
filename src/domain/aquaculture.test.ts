import { describe, expect, it } from 'vitest';

import { getFirstTankPhotoUri } from '@/domain/aquaculture';
import type { InspectionResult } from '@/models/aquaculture';

function inspection(
  id: string,
  capturedAt: string,
  photoUri?: string,
  tankId = 'tank-1'
): InspectionResult {
  return {
    id,
    tankId,
    capturedAt,
    status: 'completed',
    grade: 'normal',
    photoUri,
    clues: [],
    bodyParts: [],
    diseases: [],
    evidenceSummary: '',
    lesions: [],
  };
}

describe('getFirstTankPhotoUri', () => {
  it('수조 이력의 최신순 첫 사진 URL을 반환한다', () => {
    const results = [
      inspection('old', '2026-07-09T00:00:00Z', 'https://example.com/old.jpg'),
      inspection('other-tank', '2026-07-11T00:00:00Z', 'https://example.com/other.jpg', 'tank-2'),
      inspection('new', '2026-07-10T00:00:00Z', 'https://example.com/new.jpg'),
    ];

    expect(getFirstTankPhotoUri(results, 'tank-1')).toBe('https://example.com/new.jpg');
  });

  it('최신 이력에 사진이 없으면 해당 수조의 첫 유효 사진을 사용한다', () => {
    const results = [
      inspection('new-without-photo', '2026-07-10T00:00:00Z'),
      inspection('old-with-photo', '2026-07-09T00:00:00Z', 'https://example.com/old.jpg'),
    ];

    expect(getFirstTankPhotoUri(results, 'tank-1')).toBe('https://example.com/old.jpg');
  });

  it('사진이 없으면 undefined를 반환한다', () => {
    expect(getFirstTankPhotoUri([inspection('result', '2026-07-10T00:00:00Z')], 'tank-1')).toBeUndefined();
  });
});
