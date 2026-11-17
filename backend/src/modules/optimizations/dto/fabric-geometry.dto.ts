export class FabricGeometryDto {
  id!: number;
  name!: string;
  createdAt!: string;
  widthMm!: number;
  lengthMm!: number;
  grainline!: number;
  boundary!: [number, number][];
}
