import { ApiProperty } from "@nestjs/swagger";

export class FavouriteStateDto {
  @ApiProperty({ example: 1 }) id!: number;
  @ApiProperty({ example: true }) isFavourite!: boolean;
}