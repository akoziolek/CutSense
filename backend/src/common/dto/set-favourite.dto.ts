import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetFavouriteDto {
    @ApiProperty({ description: 'Whether the item should be a favourite', example: true })
    @IsBoolean()
    isFavourite!: boolean;
}