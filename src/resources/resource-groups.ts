import type {ApiClient} from '../http.js'
import type {ResourceGroupDto, CreateResourceGroupRequest, UpdateResourceGroupRequest, AddResourceGroupMemberRequest, Page} from '../types.js'
import {ResourceGroupDtoSchema, CreateResourceGroupRequestSchema, UpdateResourceGroupRequestSchema, AddResourceGroupMemberRequestSchema} from '../schemas.js'
import {apiPost, fetchAllPages, fetchPage, fetchSingle, fetchVoid} from '../http.js'
import {validateRequest} from '../validation.js'

export class ResourceGroups {
  constructor(private readonly client: ApiClient) {}

  /** List all resource groups (auto-paginates). */
  async list(): Promise<ResourceGroupDto[]> {
    return fetchAllPages(this.client, '/api/v1/resource-groups', ResourceGroupDtoSchema)
  }

  /** List resource groups with manual page control. */
  async listPage(page: number, size: number): Promise<Page<ResourceGroupDto>> {
    return fetchPage(this.client, '/api/v1/resource-groups', ResourceGroupDtoSchema, page, size)
  }

  /** Get a single resource group by ID. */
  async get(id: string | number): Promise<ResourceGroupDto> {
    return fetchSingle(this.client, 'GET', `/api/v1/resource-groups/${id}`, ResourceGroupDtoSchema)
  }

  /** Create a new resource group. */
  async create(body: CreateResourceGroupRequest): Promise<ResourceGroupDto> {
    validateRequest(CreateResourceGroupRequestSchema, body, 'resourceGroups.create')
    return fetchSingle(this.client, 'POST', '/api/v1/resource-groups', ResourceGroupDtoSchema, body)
  }

  /** Update an existing resource group. */
  async update(id: string | number, body: UpdateResourceGroupRequest): Promise<ResourceGroupDto> {
    validateRequest(UpdateResourceGroupRequestSchema, body, 'resourceGroups.update')
    return fetchSingle(this.client, 'PUT', `/api/v1/resource-groups/${id}`, ResourceGroupDtoSchema, body)
  }

  /** Delete a resource group. */
  async delete(id: string | number): Promise<void> {
    return fetchVoid(this.client, `/api/v1/resource-groups/${id}`)
  }

  /** Add a member (monitor or service) to a resource group. */
  async addMember(groupId: string | number, body: AddResourceGroupMemberRequest): Promise<void> {
    validateRequest(AddResourceGroupMemberRequestSchema, body, 'resourceGroups.addMember')
    await apiPost(this.client, `/api/v1/resource-groups/${groupId}/members`, body)
  }

  /** Remove a member from a resource group. */
  async removeMember(groupId: string | number, memberId: string | number): Promise<void> {
    return fetchVoid(this.client, `/api/v1/resource-groups/${groupId}/members/${memberId}`)
  }
}
