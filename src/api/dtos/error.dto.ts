import type { SeverityDto } from './common.dto';

export interface ApiErrorDto {
  kind?: string;
  code: string;
  message: string;
  userMessage?: string;
  technicalMessage?: string;
  path?: string;
  timestamp: string;
  requestId?: string;
  details?: Record<string, unknown>;
  fieldErrors?: Record<string, string>;
  severity?: SeverityDto;
}
