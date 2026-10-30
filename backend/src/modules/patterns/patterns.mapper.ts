import { PatternTagDto } from './dto/pattern-tag.dto.js';

interface PatternTag {
  id: number;
  name: string;
}

export class PatternsMapper {
  static toTagDtos(tags: PatternTag[]): PatternTagDto[] {
    return tags.map((tag) =>
      Object.assign(new PatternTagDto(), { id: tag.id, name: tag.name }),
    );
  }
}
