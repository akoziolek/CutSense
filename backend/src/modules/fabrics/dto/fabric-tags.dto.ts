import { ApiProperty } from '@nestjs/swagger';

export class FabricTagDto {
  @ApiProperty({
    description: 'Unique tag ID',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: 'Tag name',
    example: 'cotton',
  })
  name!: string;
}
