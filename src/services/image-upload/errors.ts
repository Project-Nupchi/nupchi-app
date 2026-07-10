export type ImageUploadErrorCode =
  | 'INVALID_IMAGE_ASSET'
  | 'WEB_FILE_REQUIRED'
  | 'HEIC_NOT_SUPPORTED_ON_WEB'
  | 'UNSUPPORTED_IMAGE_TYPE'
  | 'IMAGE_REENCODE_FAILED'
  | 'FILE_NOT_FOUND'
  | 'EMPTY_FILE'
  | 'FILE_TOO_LARGE'
  | 'INVALID_MAX_UPLOAD_BYTES';

export type ImageUploadErrorDetails = {
  actualBytes?: number;
  maxBytes?: number;
  mimeType?: string;
};

export class ImageUploadError extends Error {
  constructor(
    readonly code: ImageUploadErrorCode,
    message: string,
    readonly details: ImageUploadErrorDetails = {}
  ) {
    super(message);
    this.name = 'ImageUploadError';
  }
}
