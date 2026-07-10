import { File as ExpoFile } from 'expo-file-system';

import { ImageUploadError } from './errors';
import type { PreparedImage } from './types';

export type ImageFormDataFields = Record<string, string | number | boolean | null | undefined>;

/**
 * 이미지 파트를 FormData에 추가한다. fetch 요청 시 multipart Content-Type 헤더는 직접 지정하지 않는다.
 */
export function appendPreparedImage(
  formData: FormData,
  image: PreparedImage,
  fieldName = 'image'
): FormData {
  if (image.platform === 'web') {
    formData.append(fieldName, image.formDataValue, image.fileName);
  } else {
    const file = new ExpoFile(image.uri);
    if (!file.exists) {
      throw new ImageUploadError('FILE_NOT_FOUND', '선택한 이미지 파일을 읽을 수 없습니다.');
    }
    formData.append(fieldName, file, image.fileName);
  }
  return formData;
}

/**
 * 텍스트 필드와 준비된 이미지를 포함한 요청 본문을 만든다.
 * 반환값을 fetch의 body로 그대로 전달하고 Content-Type 헤더는 생략해야 한다.
 */
export function createImageFormData(
  image: PreparedImage,
  fields: ImageFormDataFields = {},
  fieldName = 'image'
): FormData {
  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    if (value !== null && value !== undefined) formData.append(name, String(value));
  }
  return appendPreparedImage(formData, image, fieldName);
}
