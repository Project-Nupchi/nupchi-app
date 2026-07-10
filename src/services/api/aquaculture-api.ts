import type {
  AquacultureSnapshot,
  CreateInspectionInput,
  CreateTankInput,
  InspectionResult,
  Tank,
  UpdateTankInput,
} from '@/models/aquaculture';

export interface AquacultureApi {
  getSnapshot(): Promise<AquacultureSnapshot>;
  createTank(input: CreateTankInput): Promise<Tank>;
  updateTank(tankId: string, input: UpdateTankInput): Promise<Tank>;
  createInspection(input: CreateInspectionInput): Promise<InspectionResult>;
  analyzeInspection(resultId: string): Promise<InspectionResult>;
}
