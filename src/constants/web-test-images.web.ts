import type { WebTestImage } from './web-test-images';

// 웹 번들에만 포함되는 실제 데모 샘플 사진(.web.ts 라 Metro가 웹에서만 해석).
// 웹은 카메라 촬영이 불가능하므로 미리 준비한 사진을 선택해 분석 흐름에 태운다.
// 이미지 원본은 nupchi-app/webTestImg/*.
export const WEB_TEST_IMAGES: WebTestImage[] = [
  { id: 'sample-1', label: '샘플 1', source: require('../../webTestImg/1.jpeg'), mimeType: 'image/jpeg' },
  { id: 'sample-2', label: '샘플 2', source: require('../../webTestImg/2.jpeg'), mimeType: 'image/jpeg' },
  { id: 'sample-3', label: '샘플 3', source: require('../../webTestImg/3.png'), mimeType: 'image/png' },
  { id: 'sample-4', label: '샘플 4', source: require('../../webTestImg/4.png'), mimeType: 'image/png' },
  { id: 'sample-5', label: '샘플 5', source: require('../../webTestImg/5.png'), mimeType: 'image/png' },
];
