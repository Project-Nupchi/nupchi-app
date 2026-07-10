import { AppCopy } from '@/constants/copy';
import type {
  AquacultureSnapshot,
  InspectionObject,
  InspectionResult,
  InspectionStatus,
  LesionBox,
  LoginResponse,
  ObjectInspectionStatus,
  Tank,
  TankStatus,
} from '@/models/aquaculture';
import { ApiError } from '@/services/api/http-client';

const tankStatuses = new Set<TankStatus>(['normal', 'caution', 'suspicious']);
const inspectionStatuses = new Set<InspectionStatus>(['pending', 'completed', 'failed']);
const objectStatuses = new Set<ObjectInspectionStatus>(['normal', 'suspicious']);

export function parseLoginResponse(value: unknown): LoginResponse {
  const data = record(value);
  const session = record(data.session);
  return {
    session: {
      isLoggedIn: boolean(session.isLoggedIn),
      farmName: string(session.farmName),
      userId: optionalString(session.userId),
    },
    accessToken: optionalString(data.accessToken),
  };
}

export function parseSnapshot(value: unknown): AquacultureSnapshot {
  const data = record(value);
  const preferences = isRecord(data.preferences) ? data.preferences : {};
  return {
    tanks: array(data.tanks).map(parseTank),
    results: array(data.results).map(parseInspectionResult),
    preferences: {
      ackedAlertIds: optionalArray(preferences.ackedAlertIds).map(string),
      reminderEnabled: typeof preferences.reminderEnabled === 'boolean' ? preferences.reminderEnabled : true,
    },
  };
}

export function parseTank(value: unknown): Tank {
  const data = record(value);
  return {
    id: string(data.id),
    groupId: string(data.groupId),
    stockedInfo: string(data.stockedInfo),
    createdAt: string(data.createdAt),
    active: boolean(data.active),
  };
}

export function parseInspectionResult(value: unknown): InspectionResult {
  const data = record(value);
  return {
    id: string(data.id),
    tankId: string(data.tankId),
    capturedAt: string(data.capturedAt),
    status: enumValue(data.status, inspectionStatuses),
    grade: enumValue(data.grade, tankStatuses),
    photoUri: optionalString(data.photoUri),
    clues: optionalArray(data.clues).map(string),
    bodyParts: optionalArray(data.bodyParts).map(string),
    diseases: optionalArray(data.diseases).map(string),
    evidenceSummary: optionalString(data.evidenceSummary) ?? '',
    lesions: optionalArray(data.lesions).map(parseLesion),
    objects: data.objects === undefined ? undefined : array(data.objects).map(parseInspectionObject),
  };
}

function parseInspectionObject(value: unknown): InspectionObject {
  const data = record(value);
  return {
    id: string(data.id),
    grade: enumValue(data.grade, objectStatuses),
    photoUri: optionalString(data.photoUri),
    bodyParts: optionalArray(data.bodyParts).map(string),
    diseases: optionalArray(data.diseases).map(string),
    evidenceSummary: optionalString(data.evidenceSummary) ?? '',
    lesions: optionalArray(data.lesions).map(parseLesion),
  };
}

function parseLesion(value: unknown): LesionBox {
  const data = record(value);
  return {
    id: string(data.id),
    x: number(data.x),
    y: number(data.y),
    width: number(data.width),
    height: number(data.height),
    label: string(data.label),
  };
}

function enumValue<T extends string>(value: unknown, allowed: Set<T>): T {
  if (typeof value === 'string' && allowed.has(value as T)) return value as T;
  invalid();
}

function string(value: unknown): string {
  if (typeof value === 'string') return value;
  invalid();
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  return string(value);
}

function number(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  invalid();
}

function boolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  invalid();
}

function array(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  invalid();
}

function optionalArray(value: unknown): unknown[] {
  return value === undefined || value === null ? [] : array(value);
}

function record(value: unknown): Record<string, unknown> {
  if (isRecord(value)) return value;
  invalid();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalid(): never {
  throw new ApiError(AppCopy.errors.invalidResponse, undefined, 'INVALID_RESPONSE');
}
