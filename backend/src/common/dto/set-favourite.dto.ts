import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetFavouriteDto {
    @ApiProperty({ description: 'Whether the fabric/pattern should be a favourite', example: true })
    @IsBoolean()
    isFavourite!: boolean;
}