export class FabricResponseDto {
  id!: number;
  name!: string;
  description?: string;
  pictureUrl?: string;
  isFavourite?: boolean;
  userId!: number;
  createdAt!: string;
  tags!: string[];
}
