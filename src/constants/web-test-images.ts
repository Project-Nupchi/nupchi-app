import type { SupportedImageMimeType } from '@/services/image-upload';

// 웹에서는 카메라 촬영이 불가능하므로, MVP 데모용으로 미리 준비한 샘플 사진 5장을
// 선택해 분석 흐름에 태운다. 이미지 원본은 nupchi-app/webTestImg/* 에 있다.
// source는 require()가 반환하는 로컬 에셋 모듈(Expo 관례상 number)로, expo-image의
// Image source와 expo-asset의 Asset.fromModule 모두에 그대로 전달된다.
export type WebTestImage = {
  id: string;
  label: string;
  source: number;
  mimeType: SupportedImageMimeType;
};

export const WEB_TEST_IMAGES: WebTestImage[] = [
  { id: 'sample-1', label: '샘플 1', source: require('../../webTestImg/1.jpeg'), mimeType: 'image/jpeg' },
  { id: 'sample-2', label: '샘플 2', source: require('../../webTestImg/2.jpeg'), mimeType: 'image/jpeg' },
  { id: 'sample-3', label: '샘플 3', source: require('../../webTestImg/3.png'), mimeType: 'image/png' },
  { id: 'sample-4', label: '샘플 4', source: require('../../webTestImg/4.png'), mimeType: 'image/png' },
  { id: 'sample-5', label: '샘플 5', source: require('../../webTestImg/5.png'), mimeType: 'image/png' },
];
