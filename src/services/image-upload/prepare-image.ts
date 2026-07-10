import { File as ExpoFile } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Platform } from 'react-native';

import { getMaxUploadBytes } from './config';
import { ImageUploadError } from './errors';
import type {
  ImageInputSource,
  PrepareImageOptions,
  PreparedImage,
  PreparedNativeImage,
  PreparedWebImage,
  SupportedImageMimeType,
} from './types';

const JPEG_COMPRESSION = 0.82;
const HEIC_MIME_TYPES = new Set([
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
]);

export async function prepareImageForUpload(
  asset: ImagePickerAsset,
  options: PrepareImageOptions
): Promise<PreparedImage> {
  assertImageAsset(asset);
  const maxBytes = getMaxUploadBytes(options.maxBytes);

  if (Platform.OS === 'web') {
    return prepareWebImage(asset, options.source, maxBytes);
  }

  return prepareNativeImage(asset, options.source, maxBytes);
}

async function prepareWebImage(
  asset: ImagePickerAsset,
  source: ImageInputSource,
  maxBytes: number
): Promise<PreparedWebImage> {
  const file = asset.file;
  if (!file) {
    throw new ImageUploadError(
      'WEB_FILE_REQUIRED',
      '웹 이미지 업로드에는 ImagePickerAsset.file이 필요합니다.'
    );
  }

  const mimeType = resolveMimeType([file.type, asset.mimeType], [file.name, asset.fileName, asset.uri], true);
  validateFileSize(file.size, maxBytes);

  return {
    platform: 'web',
    source,
    originalUri: asset.uri,
    uri: asset.uri,
    fileName: buildFileName(file.name || asset.fileName, mimeType),
    mimeType,
    size: file.size,
    width: asset.width,
    height: asset.height,
    wasReencoded: false,
    formDataValue: file,
  };
}

async function prepareNativeImage(
  asset: ImagePickerAsset,
  source: ImageInputSource,
  maxBytes: number
): Promise<PreparedNativeImage> {
  if (Platform.OS === 'ios' && source === 'library') {
    return reencodeIosLibraryImage(asset, source, maxBytes);
  }

  const file = new ExpoFile(asset.uri);
  assertReadableFile(file);
  const mimeType = resolveMimeType([asset.mimeType, file.type], [asset.fileName, asset.uri], false);
  validateFileSize(file.size, maxBytes);
  const fileName = buildFileName(asset.fileName || file.name, mimeType);

  return {
    platform: 'native',
    source,
    originalUri: asset.uri,
    uri: file.uri,
    fileName,
    mimeType,
    size: file.size,
    width: asset.width,
    height: asset.height,
    wasReencoded: false,
    formDataValue: { uri: file.uri, name: fileName, type: mimeType },
  };
}

async function reencodeIosLibraryImage(
  asset: ImagePickerAsset,
  source: ImageInputSource,
  maxBytes: number
): Promise<PreparedNativeImage> {
  const context = ImageManipulator.manipulate(asset.uri);
  let renderedImage: Awaited<ReturnType<typeof context.renderAsync>> | undefined;

  try {
    renderedImage = await context.renderAsync();
    const result = await renderedImage.saveAsync({
      format: SaveFormat.JPEG,
      compress: JPEG_COMPRESSION,
    });
    const file = new ExpoFile(result.uri);
    assertReadableFile(file);
    validateFileSize(file.size, maxBytes);
    const fileName = buildFileName(asset.fileName, 'image/jpeg');

    return {
      platform: 'native',
      source,
      originalUri: asset.uri,
      uri: file.uri,
      fileName,
      mimeType: 'image/jpeg',
      size: file.size,
      width: result.width,
      height: result.height,
      wasReencoded: true,
      formDataValue: { uri: file.uri, name: fileName, type: 'image/jpeg' },
    };
  } catch (error) {
    if (error instanceof ImageUploadError) throw error;
    throw new ImageUploadError(
      'IMAGE_REENCODE_FAILED',
      '선택한 이미지를 JPEG로 변환하지 못했습니다.'
    );
  } finally {
    renderedImage?.release();
    context.release();
  }
}

function assertImageAsset(asset: ImagePickerAsset) {
  if (!asset.uri || asset.type === 'video' || asset.type === 'pairedVideo') {
    throw new ImageUploadError('INVALID_IMAGE_ASSET', '업로드할 수 있는 이미지가 아닙니다.');
  }
}

function assertReadableFile(file: ExpoFile) {
  if (!file.exists) {
    throw new ImageUploadError('FILE_NOT_FOUND', '선택한 이미지 파일을 읽을 수 없습니다.');
  }
}

function validateFileSize(actualBytes: number, maxBytes: number) {
  if (!Number.isFinite(actualBytes) || actualBytes <= 0) {
    throw new ImageUploadError('EMPTY_FILE', '비어 있거나 읽을 수 없는 이미지 파일입니다.', {
      actualBytes,
    });
  }
  if (actualBytes > maxBytes) {
    throw new ImageUploadError('FILE_TOO_LARGE', '이미지 파일의 용량이 업로드 제한을 초과했습니다.', {
      actualBytes,
      maxBytes,
    });
  }
}

function resolveMimeType(
  mimeCandidates: (string | null | undefined)[],
  nameCandidates: (string | null | undefined)[],
  isWeb: boolean
): SupportedImageMimeType {
  const normalizedMimes = mimeCandidates
    .filter((candidate): candidate is string => Boolean(candidate))
    .map(normalizeMimeType);
  const extensions = nameCandidates
    .filter((candidate): candidate is string => Boolean(candidate))
    .map(fileExtension)
    .filter(Boolean);

  if (
    normalizedMimes.some((mimeType) => HEIC_MIME_TYPES.has(mimeType)) ||
    extensions.some((extension) => extension === 'heic' || extension === 'heif')
  ) {
    if (isWeb) {
      throw new ImageUploadError(
        'HEIC_NOT_SUPPORTED_ON_WEB',
        '웹에서는 HEIC/HEIF 이미지를 업로드할 수 없습니다. JPEG 또는 PNG 파일을 선택해 주세요.'
      );
    }
    throw unsupportedTypeError(normalizedMimes[0]);
  }

  for (const mimeType of normalizedMimes) {
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'image/jpeg';
    if (mimeType === 'image/png') return 'image/png';
  }
  for (const extension of extensions) {
    if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
    if (extension === 'png') return 'image/png';
  }

  throw unsupportedTypeError(normalizedMimes[0]);
}

function normalizeMimeType(value: string) {
  return value.split(';', 1)[0].trim().toLowerCase();
}

function fileExtension(value: string) {
  const cleanValue = value.split(/[?#]/, 1)[0];
  const match = cleanValue.match(/\.([^.\/\\]+)$/);
  return match?.[1].toLowerCase() ?? '';
}

function unsupportedTypeError(mimeType?: string) {
  return new ImageUploadError(
    'UNSUPPORTED_IMAGE_TYPE',
    'JPEG 또는 PNG 이미지만 업로드할 수 있습니다.',
    mimeType ? { mimeType } : {}
  );
}

function buildFileName(originalName: string | null | undefined, mimeType: SupportedImageMimeType) {
  const extension = mimeType === 'image/png' ? 'png' : 'jpg';
  const originalLeaf = originalName?.split(/[/\\]/).pop()?.replace(/\.[^.]*$/, '');
  const safeStem = originalLeaf
    ?.replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${safeStem || `nupchi-${Date.now()}`}.${extension}`;
}
