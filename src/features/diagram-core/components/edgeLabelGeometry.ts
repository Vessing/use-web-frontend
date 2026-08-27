export function edgePoint(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  ratio: number,
) {
  return {
    x: sourceX + (targetX - sourceX) * ratio,
    y: sourceY + (targetY - sourceY) * ratio,
  };
}
