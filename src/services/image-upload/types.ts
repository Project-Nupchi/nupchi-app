import type { ImagePickerAsset } from 'expo-image-picker';

export type ImageInputSource = 'camera' | 'library';
export type SupportedImageMimeType = 'image/jpeg' | 'image/png';

export type NativeImageFormDataPart = {
  uri: string;
  name: string;
  type: SupportedImageMimeType;
};

type PreparedImageBase = {
  source: ImageInputSource;
  originalUri: string;
  uri: string;
  fileName: string;
  mimeType: SupportedImageMimeType;
  size: number;
  width: number;
  height: number;
  wasReencoded: boolean;
};

export type PreparedWebImage = PreparedImageBase & {
  platform: 'web';
  formDataValue: File;
};

export type PreparedNativeImage = PreparedImageBase & {
  platform: 'native';
  formDataValue: NativeImageFormDataPart;
};

export type PreparedImage = PreparedWebImage | PreparedNativeImage;

export type PrepareImageOptions = {
  /** ImagePicker를 연 API의 출처. iOS 갤러리 이미지는 항상 JPEG로 재인코딩된다. */
  source: ImageInputSource;
  /** 지정하지 않으면 EXPO_PUBLIC_MAX_UPLOAD_BYTES 또는 기본 6 MiB를 사용한다. */
  maxBytes?: number;
};

export type ImagePickerImageAsset = ImagePickerAsset;
