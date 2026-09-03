export function UmlAggregationDiamond({
  x,
  y,
  towardX,
  towardY,
  kind,
}: {
  x: number;
  y: number;
  towardX: number;
  towardY: number;
  kind?: 'NONE' | 'SHARED' | 'COMPOSITE';
}) {
  if (kind === undefined || kind === 'NONE') {
    return null;
  }

  return (
    <path
      d={getAggregationDiamondPath(x, y, towardX, towardY)}
      className={`uml-aggregation-diamond ${kind === 'COMPOSITE' ? 'uml-aggregation-diamond-composite' : ''}`}
    />
  );
}

export function getAggregationDiamondPath(
  x: number,
  y: number,
  towardX: number,
  towardY: number,
) {
  const radius = 7;
  const distance = Math.hypot(towardX - x, towardY - y) || 1;
  const centerX = x + ((towardX - x) / distance) * radius;
  const centerY = y + ((towardY - y) / distance) * radius;

  return `M ${centerX} ${centerY - radius} L ${centerX + radius} ${centerY} L ${centerX} ${centerY + radius} L ${centerX - radius} ${centerY} Z`;
}
