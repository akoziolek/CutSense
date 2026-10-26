import { ApiProperty } from "@nestjs/swagger";

export class FabricFavouriteDto {
  @ApiProperty({ example: 1 }) id!: number;
  @ApiProperty({ example: true }) isFavourite!: boolean;
}