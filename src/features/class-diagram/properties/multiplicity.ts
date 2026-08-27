import type { MultiplicityDto } from '../../../api/dtos';

export function parseMultiplicity(rawInput: string): MultiplicityDto | null {
  const raw = rawInput.trim();

  if (/^\d+$/.test(raw)) {
    const value = Number(raw);
    return { lower: value, upper: value, unbounded: false, raw };
  }

  const rangeMatch = raw.match(/^(\d+)\.\.(\d+|\*)$/);

  if (!rangeMatch) {
    return null;
  }

  const lower = Number(rangeMatch[1]);
  const upperToken = rangeMatch[2];

  if (upperToken === '*') {
    return { lower, upper: null, unbounded: true, raw };
  }

  const upper = Number(upperToken);

  if (upper < lower) {
    return null;
  }

  return { lower, upper, unbounded: false, raw };
}
