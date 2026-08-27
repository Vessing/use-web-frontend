import type { DiagramValidationState } from './types';
import type { ValidationMarker } from '../../state';

export interface DiagramValidationSummary {
  validationState: DiagramValidationState;
  validationIssueCount: number;
}

export function summarizeValidationMarkers(
  markers: ValidationMarker[] | undefined,
): DiagramValidationSummary {
  if (!markers || markers.length === 0) {
    return {
      validationState: 'none',
      validationIssueCount: 0,
    };
  }

  const validationState = markers.some((marker) => marker.severity === 'ERROR')
    ? 'error'
    : markers.some((marker) => marker.severity === 'WARNING')
      ? 'warning'
      : 'none';

  return {
    validationState,
    validationIssueCount: new Set(markers.map((marker) => marker.errorId)).size,
  };
}
