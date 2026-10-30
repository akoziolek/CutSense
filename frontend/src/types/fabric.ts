export interface FabricTag {
  id: number
  name: string
}

export interface FabricBoundaryPoint {
  x: number
  y: number
}

export interface FabricResponse {
  id: number
  name: string
  description?: string
  pictureS3Key?: string
  pictureUrl?: string
  isFavourite: boolean
  areaMm2: number
  shapes: FabricBoundaryPoint[][]
  imageWidthMm?: number
  imageHeightMm?: number
  userId: number
  createdAt: string
  tags: FabricTag[]
}

export interface FabricListItem {
    id: number
    name: string
    pictureUrl: string
    isFavourite: boolean
    areaMm2: number
    createdAt: string
}

export interface FabricListResponse {
    items: FabricListItem[]
    total: number
    page: number
    limit: number
    totalPages: number
}

export type FabricSort =
  | 'name_asc'
  | 'name_desc'
  | 'date_desc'
  | 'date_asc'
  | 'area_asc'
  | 'area_desc' 