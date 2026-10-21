export interface FabricListItem {
    id: number
    name: string
    pictureURL: string
    isFavourite: boolean
    area: number
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