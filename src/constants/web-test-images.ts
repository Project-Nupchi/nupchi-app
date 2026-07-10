import type { SupportedImageMimeType } from '@/services/image-upload';

// 웹 데모 전용 샘플 사진 목록의 타입 + 네이티브 기본 구현.
// 실제 항목은 web-test-images.web.ts 에만 있어 Metro가 웹 번들에만 포함하고, 네이티브(iOS/Android)
// 아티팩트에는 데모 미디어(약 7.5MB)를 넣지 않으려 여기서는 빈 배열을 노출한다. 카메라 화면은
// isWeb 일 때만 이 목록을 렌더하므로 네이티브에서 비어 있어도 무방하다.
export type WebTestImage = {
  id: string;
  label: string;
  // require()가 반환하는 로컬 에셋 모듈(Expo 관례상 number). expo-image source·Asset.fromModule 공용.
  source: number;
  mimeType: SupportedImageMimeType;
};

export const WEB_TEST_IMAGES: WebTestImage[] = [];
