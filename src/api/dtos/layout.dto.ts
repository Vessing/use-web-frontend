import type { Id } from './common.dto';

export interface LayoutDto {
  classDiagram: DiagramLayoutDto;
  objectDiagram: DiagramLayoutDto;
  updatedAt?: string;
}

export interface DiagramLayoutDto {
  nodes: NodeLayoutDto[];
  edges?: EdgeLayoutDto[];
  viewport?: ViewportDto;
}

export interface NodeLayoutDto {
  elementId: Id;
  x: number;
  y: number;
  width?: number;
  height?: number;
  collapsed?: boolean;
}

export interface EdgeLayoutDto {
  elementId: Id;
  bendPoints?: Array<{ x: number; y: number }>;
  labelPosition?: { x: number; y: number };
}

export interface ViewportDto {
  x: number;
  y: number;
  zoom: number;
}
