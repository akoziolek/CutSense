export interface EnginePoint {
  x: number;
  y: number;
}

export interface EngineConstraint {
  rotationAngle: number;
  isMirrored: boolean;
  requiredQuantity: number;
  twoWay: boolean;
}

export interface EnginePiece {
  id: number;
  points: EnginePoint[];
  grainline: number;
  constraints: EngineConstraint[];
  seamAllowance: number;
  cuttingAllowance: number;
}

export type EngineFabric =
  | { width: number; length: number }
  | { boundary: EnginePoint[]; grainline: number };

export interface EngineInput {
  fabric: EngineFabric;
  pieces: EnginePiece[];
  algorithmId: number;
}

export interface EnginePosition {
  id: number;
  rotationAngle: number;
  isMirrored: boolean;
  isFlipped180: boolean;
  x: number;
  y: number;
}

export interface NestingStats {
  usableScrapCount: number;
  usableScrapsArea: number;
  usableScrapsPercentage: number;
  remainingFabricLength: number;
  remainingFabricArea: number;
  remainingFabricPercentage: number;
  wasteArea: number;
  wastePercentage: number;
}

export interface EngineResult {
  wasSuccessful: boolean;
  executionTime: number;
  stats?: NestingStats | null;
  positions: EnginePosition[];
}

export interface CalcMinimumInput {
  width: number;
  pieces: EnginePiece[];
}

export type ViewStats = Omit<
  NestingStats,
  'usableScrapCount' | 'remainingFabricLength'
>;

export interface CalculateStatsInput {
  fabric: EngineFabric;
  pieces: EnginePiece[];
  placements: EnginePosition[];
}

export interface OptimizerEngine {
  run(input: EngineInput): Promise<EngineResult>;
  calcMinimum(input: CalcMinimumInput): Promise<number>;
  calculateStats(input: CalculateStatsInput): Promise<NestingStats>;
}

export const OPTIMIZER_ENGINE = Symbol('OPTIMIZER_ENGINE');
