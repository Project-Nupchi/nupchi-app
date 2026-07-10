export type TankId = string;
export type InspectionId = string;

export type TankStatus = 'normal' | 'caution' | 'suspicious';
export type InspectionStatus = 'pending' | 'completed' | 'failed';
export type ObjectInspectionStatus = Extract<TankStatus, 'normal' | 'suspicious'>;

export type LesionBox = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
};

export type Tank = {
  id: TankId;
  groupId: string;
  stockedInfo: string;
  createdAt: string;
  active: boolean;
};

export type InspectionObject = {
  id: string;
  grade: ObjectInspectionStatus;
  photoUri?: string;
  bodyParts: string[];
  diseases: string[];
  evidenceSummary: string;
  lesions: LesionBox[];
};

export type InspectionResult = {
  id: InspectionId;
  tankId: TankId;
  capturedAt: string;
  status: InspectionStatus;
  grade: TankStatus;
  photoUri?: string;
  clues: string[];
  bodyParts: string[];
  diseases: string[];
  evidenceSummary: string;
  lesions: LesionBox[];
  objects?: InspectionObject[];
};

export type UserSession = {
  isLoggedIn: boolean;
  farmName: string;
  userId?: string;
};

export type LoginInput = {
  farmName: string;
};

export type LoginResponse = {
  session: UserSession;
  accessToken?: string;
};

export type CreateTankInput = Pick<Tank, 'id' | 'groupId' | 'stockedInfo'>;
export type UpdateTankInput = Pick<Tank, 'groupId' | 'stockedInfo' | 'active'>;

export type CreateInspectionInput = {
  tankId: TankId;
  photoUri?: string;
  clues: string[];
};

export type AquacultureSnapshot = {
  tanks: Tank[];
  results: InspectionResult[];
  preferences: {
    ackedAlertIds: InspectionId[];
    reminderEnabled: boolean;
  };
};

export type MutationResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : T))
  | { ok: false; message: string };
