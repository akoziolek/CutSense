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
  constraints: EngineConstraint[];
  seamAllowance: number;
  cuttingAllowance: number;
}

export type EngineFabric = { width: number; length: number } | { boundary: EnginePoint[] };

export interface EngineInput {
  fabric: EngineFabric;
  pieces: EnginePiece[];
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
  minLength: number;
  stats: NestingStats;
  positions: EnginePosition[];
}

export interface OptimizerEngine {
  run(input: EngineInput): Promise<EngineResult>;
}

export const OPTIMIZER_ENGINE = Symbol('OPTIMIZER_ENGINE');