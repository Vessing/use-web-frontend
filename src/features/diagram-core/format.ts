import type { MultiplicityDto } from '../../api/dtos';

export function formatMultiplicity(multiplicity: MultiplicityDto): string {
  if (multiplicity.raw?.trim()) {
    return multiplicity.raw;
  }

  if (multiplicity.unbounded) {
    return `${multiplicity.lower}..*`;
  }

  if (multiplicity.upper === multiplicity.lower) {
    return String(multiplicity.lower);
  }

  return `${multiplicity.lower}..${multiplicity.upper}`;
}
