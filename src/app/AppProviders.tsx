import type { PropsWithChildren } from 'react';
import { ReactFlowProvider } from '@xyflow/react';

export function AppProviders({ children }: PropsWithChildren) {
  return <ReactFlowProvider>{children}</ReactFlowProvider>;
}
