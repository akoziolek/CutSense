export const ENGINE_ALGORITHM_IDS: Record<string, number> = {
  'Bottom-Left Decreasing': 1,
  'Bottom-Left Fill with Rotation': 2,
};
export const AVAILABLE_ALGORITHMS: string[] = Object.keys(ENGINE_ALGORITHM_IDS);

export const DEFAULT_SEAM_ALLOWANCE_MM = 5;
export const DEFAULT_CUTTING_ALLOWANCE_MM = 20;

export const MAX_SEAM_ALLOWANCE_MM = 200;
export const MAX_CUTTING_ALLOWANCE_MM = 500;
export const MAX_FABRIC_SIDE_MM = 100_000;
export const MAX_PIECE_COPIES = 99;
export const MAX_TOTAL_COPIES = 500;
