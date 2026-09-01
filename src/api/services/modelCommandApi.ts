import { httpClient, type HttpClient } from '../client/httpClient';
import type {
  GeneralizationDraftDto,
  DeleteCommandRequestDto,
  DeleteImpactDto,
  MutationCommandRequestDto,
  MutationResultDto,
  AssociationClassAggregateDto,
  RedefinitionDraftDto,
  UmlClassDto,
  UmlAssociationDto,
  UmlModelImportDto,
  UmlPackageDto,
  UmlOperationDto,
  UmlAttributeDto,
  UmlDataTypeDto,
  UmlEnumerationDto,
  UmlInvariantDto,
  OclDefinitionElementDto,
} from '../dtos';

export function createModelCommandApi(client: HttpClient = httpClient) {
  const classPath = (projectId: string, classId: string) =>
    `/projects/${encodeURIComponent(projectId)}/commands/classes/${encodeURIComponent(classId)}`;

  return {
    createInvariant: (
      projectId: string,
      request: MutationCommandRequestDto<UmlInvariantDto>,
    ) => client.post<MutationResultDto<BackendInvariantDto>, MutationCommandRequestDto<BackendInvariantDto>>(
      `/projects/${encodeURIComponent(projectId)}/commands/invariants`,
      toInvariantCommand(request),
    ).then(normalizeInvariantResult),
    updateInvariant: (
      projectId: string,
      invariantId: string,
      request: MutationCommandRequestDto<UmlInvariantDto>,
    ) => client.put<MutationResultDto<BackendInvariantDto>, MutationCommandRequestDto<BackendInvariantDto>>(
      `/projects/${encodeURIComponent(projectId)}/commands/invariants/${encodeURIComponent(invariantId)}`,
      toInvariantCommand(request),
    ).then(normalizeInvariantResult),
    createAssociation: (
      projectId: string,
      request: MutationCommandRequestDto<UmlAssociationDto>,
    ) => client.post<MutationResultDto<UmlAssociationDto>, typeof request>(
      `/projects/${encodeURIComponent(projectId)}/commands/associations`,
      request,
    ),
    updateAssociation: (
      projectId: string,
      associationId: string,
      request: MutationCommandRequestDto<UmlAssociationDto>,
    ) => client.put<MutationResultDto<UmlAssociationDto>, typeof request>(
      `/projects/${encodeURIComponent(projectId)}/commands/associations/${encodeURIComponent(associationId)}`,
      request,
    ),
    createAssociationClass: (
      projectId: string,
      associationId: string,
      request: MutationCommandRequestDto<UmlClassDto>,
    ) => client.post<MutationResultDto<AssociationClassAggregateDto>, typeof request>(
      `/projects/${encodeURIComponent(projectId)}/commands/associations/${encodeURIComponent(associationId)}/association-class`,
      request,
    ),
    createPackage: (
      projectId: string,
      request: MutationCommandRequestDto<UmlPackageDto>,
    ) => client.post<MutationResultDto<UmlPackageDto>, typeof request>(
      `/projects/${encodeURIComponent(projectId)}/commands/packages`,
      request,
    ),
    updatePackage: (
      projectId: string,
      packageId: string,
      request: MutationCommandRequestDto<UmlPackageDto>,
    ) => client.put<MutationResultDto<UmlPackageDto>, typeof request>(
      `/projects/${encodeURIComponent(projectId)}/commands/packages/${encodeURIComponent(packageId)}`,
      request,
    ),
    createImport: (
      projectId: string,
      request: MutationCommandRequestDto<UmlModelImportDto>,
    ) => client.post<MutationResultDto<UmlModelImportDto>, typeof request>(
      `/projects/${encodeURIComponent(projectId)}/commands/imports`,
      request,
    ),
    updateImport: (
      projectId: string,
      importId: string,
      request: MutationCommandRequestDto<UmlModelImportDto>,
    ) => client.put<MutationResultDto<UmlModelImportDto>, typeof request>(
      `/projects/${encodeURIComponent(projectId)}/commands/imports/${encodeURIComponent(importId)}`,
      request,
    ),
    getDeleteImpact: (projectId: string, elementType: string, elementId: string) =>
      client.get<DeleteImpactDto>(
        `/projects/${encodeURIComponent(projectId)}/commands/delete-impact/${encodeURIComponent(elementType)}/${encodeURIComponent(elementId)}`,
      ),
    deleteElement: (
      projectId: string,
      elementType: string,
      elementId: string,
      request: DeleteCommandRequestDto,
    ) => client.delete<MutationResultDto, DeleteCommandRequestDto>(
      `/projects/${encodeURIComponent(projectId)}/commands/${encodeURIComponent(elementType)}/${encodeURIComponent(elementId)}`,
      request,
    ),
    updateClass: (
      projectId: string,
      classId: string,
      request: MutationCommandRequestDto<UmlClassDto | Record<string, unknown>>,
    ) => client.put<MutationResultDto, typeof request>(classPath(projectId, classId), request),
    setGeneralizations: (
      projectId: string,
      classId: string,
      request: MutationCommandRequestDto<GeneralizationDraftDto>,
    ) =>
      client.put<MutationResultDto, typeof request>(
        `${classPath(projectId, classId)}/generalizations`,
        request,
      ),
    setRedefinition: (
      projectId: string,
      classId: string,
      request: MutationCommandRequestDto<RedefinitionDraftDto>,
    ) =>
      client.put<MutationResultDto, typeof request>(
        `${classPath(projectId, classId)}/redefinitions`,
        request,
      ),
    createOperation: (
      projectId: string,
      classId: string,
      request: MutationCommandRequestDto<UmlOperationDto>,
    ) => client.post<MutationResultDto<UmlOperationDto>, typeof request>(
      `${classPath(projectId, classId)}/operations`,
      request,
    ),
    updateOperation: (
      projectId: string,
      classId: string,
      operationId: string,
      request: MutationCommandRequestDto<UmlOperationDto>,
    ) => client.put<MutationResultDto<UmlOperationDto>, typeof request>(
      `${classPath(projectId, classId)}/operations/${encodeURIComponent(operationId)}`,
      request,
    ),
    createAttribute: (
      projectId: string,
      classId: string,
      request: MutationCommandRequestDto<UmlAttributeDto>,
    ) => client.post<MutationResultDto<UmlAttributeDto>, typeof request>(
      `${classPath(projectId, classId)}/attributes`,
      request,
    ),
    updateAttribute: (
      projectId: string,
      classId: string,
      attributeId: string,
      request: MutationCommandRequestDto<UmlAttributeDto>,
    ) => client.put<MutationResultDto<UmlAttributeDto>, typeof request>(
      `${classPath(projectId, classId)}/attributes/${encodeURIComponent(attributeId)}`,
      request,
    ),
    createEnumeration: (projectId: string, request: MutationCommandRequestDto<UmlEnumerationDto>) =>
      client.post<MutationResultDto<UmlEnumerationDto>, typeof request>(`/projects/${encodeURIComponent(projectId)}/commands/enumerations`, request),
    updateEnumeration: (projectId: string, enumerationId: string, request: MutationCommandRequestDto<UmlEnumerationDto>) =>
      client.put<MutationResultDto<UmlEnumerationDto>, typeof request>(`/projects/${encodeURIComponent(projectId)}/commands/enumerations/${encodeURIComponent(enumerationId)}`, request),
    createDataType: (projectId: string, request: MutationCommandRequestDto<UmlDataTypeDto>) =>
      client.post<MutationResultDto<UmlDataTypeDto>, typeof request>(`/projects/${encodeURIComponent(projectId)}/commands/datatypes`, request),
    updateDataType: (projectId: string, dataTypeId: string, request: MutationCommandRequestDto<UmlDataTypeDto>) =>
      client.put<MutationResultDto<UmlDataTypeDto>, typeof request>(`/projects/${encodeURIComponent(projectId)}/commands/datatypes/${encodeURIComponent(dataTypeId)}`, request),
    getDataTypePropertyDeleteImpact: (
      projectId: string,
      dataTypeId: string,
      propertyId: string,
    ) => client.get<DeleteImpactDto>(
      `/projects/${encodeURIComponent(projectId)}/commands/datatypes/${encodeURIComponent(dataTypeId)}/properties/${encodeURIComponent(propertyId)}/delete-impact`,
    ),
    deleteDataTypeProperty: (
      projectId: string,
      dataTypeId: string,
      propertyId: string,
      request: DeleteCommandRequestDto,
    ) => client.delete<MutationResultDto<UmlDataTypeDto>, DeleteCommandRequestDto>(
      `/projects/${encodeURIComponent(projectId)}/commands/datatypes/${encodeURIComponent(dataTypeId)}/properties/${encodeURIComponent(propertyId)}`,
      request,
    ),
    listDefinitions: (projectId: string) => client.get<OclDefinitionElementDto[]>(
      `/projects/${encodeURIComponent(projectId)}/commands/definitions`,
    ),
    createDefinition: (
      projectId: string,
      request: MutationCommandRequestDto<OclDefinitionElementDto>,
    ) => client.post<MutationResultDto<OclDefinitionElementDto>, typeof request>(
      `/projects/${encodeURIComponent(projectId)}/commands/definitions`,
      request,
    ),
    updateDefinition: (
      projectId: string,
      definitionId: string,
      request: MutationCommandRequestDto<OclDefinitionElementDto>,
    ) => client.put<MutationResultDto<OclDefinitionElementDto>, typeof request>(
      `/projects/${encodeURIComponent(projectId)}/commands/definitions/${encodeURIComponent(definitionId)}`,
      request,
    ),
  };
}

export const modelCommandApi = createModelCommandApi();

type BackendInvariantDto = Omit<UmlInvariantDto, 'expression'> & {
  expression: { id: string; text: string; language: 'OCL'; languageVersion: '2.4' };
};

function toInvariantCommand(request: MutationCommandRequestDto<UmlInvariantDto>): MutationCommandRequestDto<BackendInvariantDto> {
  return {
    expectedRevision: request.expectedRevision,
    draft: {
      ...request.draft,
      expression: {
        id: `expr-${request.draft.id}`,
        text: request.draft.expression,
        language: 'OCL',
        languageVersion: '2.4',
      },
    },
  };
}

function normalizeInvariantResult(result: MutationResultDto<BackendInvariantDto>): MutationResultDto<UmlInvariantDto> {
  return {
    ...result,
    result: result.result ? { ...result.result, expression: result.result.expression.text } : result.result,
  } as MutationResultDto<UmlInvariantDto>;
}
