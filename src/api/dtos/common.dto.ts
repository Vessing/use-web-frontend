export type Id = string;

export type PrimitiveTypeDto = 'String' | 'Integer' | 'Real' | 'Boolean';

export type UmlTypeDto = PrimitiveTypeDto | string;

export type MultiplicityUpperDto = number | null;

export type SeverityDto = 'ERROR' | 'WARNING' | 'INFO';

export interface SourceRangeDto {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  offsetStart?: number;
  offsetEnd?: number;
}
