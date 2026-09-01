import { httpClient, type HttpClient } from '../client/httpClient';
import type {
  DeleteCommandRequestDto,
  AssociationClassInstanceAggregateDto,
  AssociationClassInstanceDraftDto,
  MutationCommandRequestDto,
  MutationResultDto,
  ObjectLinkDeleteImpactDto,
  ObjectLinkDto,
  ObjectInstanceDto,
  SlotDto,
} from '../dtos';

export function createSnapshotCommandApi(client: HttpClient = httpClient) {
  const linkPath = (projectId: string, linkId?: string) =>
    `/projects/${encodeURIComponent(projectId)}/commands/object-model/links${
      linkId ? `/${encodeURIComponent(linkId)}` : ''
    }`;
  const associationClassInstancePath = (projectId: string, linkId?: string) =>
    `/projects/${encodeURIComponent(projectId)}/commands/object-model/association-class-instances${
      linkId ? `/${encodeURIComponent(linkId)}` : ''
    }`;

  return {
    createObject: (projectId: string, request: MutationCommandRequestDto<ObjectInstanceDto>) =>
      client.post<MutationResultDto<ObjectInstanceDto>, typeof request>(`/projects/${encodeURIComponent(projectId)}/commands/object-model/objects`, request),
    updateSlot: (projectId: string, objectId: string, slotId: string, request: MutationCommandRequestDto<SlotDto>) =>
      client.put<MutationResultDto<SlotDto>, typeof request>(`/projects/${encodeURIComponent(projectId)}/commands/object-model/objects/${encodeURIComponent(objectId)}/slots/${encodeURIComponent(slotId)}`, request),
    createObjectLink: (
      projectId: string,
      request: MutationCommandRequestDto<ObjectLinkDto>,
    ) => client.post<MutationResultDto<ObjectLinkDto>, typeof request>(linkPath(projectId), request),
    updateObjectLink: (
      projectId: string,
      linkId: string,
      request: MutationCommandRequestDto<ObjectLinkDto>,
    ) => client.put<MutationResultDto<ObjectLinkDto>, typeof request>(
      linkPath(projectId, linkId),
      request,
    ),
    createAssociationClassInstance: (
      projectId: string,
      request: MutationCommandRequestDto<AssociationClassInstanceDraftDto>,
    ) => client.post<MutationResultDto<AssociationClassInstanceAggregateDto>, typeof request>(
      associationClassInstancePath(projectId),
      request,
    ),
    updateAssociationClassInstance: (
      projectId: string,
      linkId: string,
      request: MutationCommandRequestDto<AssociationClassInstanceDraftDto>,
    ) => client.put<MutationResultDto<AssociationClassInstanceAggregateDto>, typeof request>(
      associationClassInstancePath(projectId, linkId),
      request,
    ),
    getObjectLinkDeleteImpact: (projectId: string, linkId: string) =>
      client.get<ObjectLinkDeleteImpactDto>(`${linkPath(projectId, linkId)}/delete-impact`),
    deleteObjectLink: (
      projectId: string,
      linkId: string,
      request: DeleteCommandRequestDto,
    ) => client.delete<MutationResultDto, DeleteCommandRequestDto>(
      linkPath(projectId, linkId),
      request,
    ),
  };
}

export const snapshotCommandApi = createSnapshotCommandApi();
