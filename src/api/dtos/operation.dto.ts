import type { SlotValueDto } from './object-model.dto';
import type { OclDiagnosticDto } from './ocl.dto';

export interface OperationArgumentDto {
  parameterId: string;
  value: SlotValueDto;
}

export interface OperationInvocationRequestDto {
  receiverObjectId: string;
  operationId: string;
  arguments: OperationArgumentDto[];
  expectedRevision: number;
}

export interface NamedElementReferenceDto {
  id: string;
  name: string;
  typeName: string;
}

export interface NamedOperationValueDto {
  parameterId: string;
  parameterName: string;
  value: SlotValueDto;
}

export interface OperationLifecycleDiffDto {
  createdObjects: NamedElementReferenceDto[];
  changedObjects: NamedElementReferenceDto[];
  deletedObjects: NamedElementReferenceDto[];
}

export interface OperationContractResultDto {
  contractId: string;
  contractName: string;
  kind: string;
  status: string;
  diagnostics: OclDiagnosticDto[];
}

export interface OperationInvocationResultDto {
  invocationId: string;
  status: 'SUCCEEDED' | 'ROLLED_BACK' | 'BLOCKED' | string;
  receiver: NamedElementReferenceDto;
  requestedOperationId: string;
  resolvedOperationId: string;
  resolvedOperationName: string;
  resolvedOwnerClassId: string;
  result: SlotValueDto | null;
  outValues: NamedOperationValueDto[];
  lifecycle: OperationLifecycleDiffDto;
  beforeSnapshotId: string;
  afterSnapshotId: string | null;
  candidateAfterSnapshotId: string | null;
  revision: number;
  diagnostics: string[];
  contractResults: OperationContractResultDto[];
}
