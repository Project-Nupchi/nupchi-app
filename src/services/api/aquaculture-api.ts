import type {
  AquacultureSnapshot,
  CreateInspectionInput,
  CreateTankInput,
  InspectionResult,
  LoginInput,
  LoginResponse,
  Tank,
  UpdateTankInput,
} from '@/models/aquaculture';

export interface AquacultureApi {
  login(input: LoginInput): Promise<LoginResponse>;
  logout(): Promise<void>;
  getSnapshot(): Promise<AquacultureSnapshot>;
  createTank(input: CreateTankInput): Promise<Tank>;
  updateTank(tankId: string, input: UpdateTankInput): Promise<Tank>;
  createInspection(input: CreateInspectionInput): Promise<InspectionResult>;
  analyzeInspection(resultId: string): Promise<InspectionResult>;
  acknowledgeAlert(resultId: string, acknowledged: boolean): Promise<void>;
  setReminderEnabled(enabled: boolean): Promise<void>;
}
