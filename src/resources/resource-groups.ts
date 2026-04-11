import type {ApiClient} from '../http.js'
import type {ResourceGroupDto, CreateResourceGroupRequest, UpdateResourceGroupRequest, Page} from '../types.js'
import {apiGet, apiPost, apiPut, apiDelete, fetchAllPages, fetchPage, unwrapSingle} from '../http.js'

export class ResourceGroups {
  constructor(private readonly client: ApiClient) {}

  /** List all resource groups (auto-paginates). */
  async list(): Promise<ResourceGroupDto[]> {
    return fetchAllPages<ResourceGroupDto>(this.client, '/api/v1/resource-groups')
  }

  /** List resource groups with manual page control. */
  async listPage(page: number, size: number): Promise<Page<ResourceGroupDto>> {
    return fetchPage<ResourceGroupDto>(this.client, '/api/v1/resource-groups', page, size)
  }

  /** Get a single resource group by ID. */
  async get(id: string | number): Promise<ResourceGroupDto> {
    const resp = await apiGet<{data?: ResourceGroupDto}>(this.client, `/api/v1/resource-groups/${id}`)
    return unwrapSingle(resp)
  }

  /** Create a new resource group. */
  async create(body: CreateResourceGroupRequest): Promise<ResourceGroupDto> {
    const resp = await apiPost<{data?: ResourceGroupDto}>(this.client, '/api/v1/resource-groups', body)
    return unwrapSingle(resp)
  }

  /** Update an existing resource group. */
  async update(id: string | number, body: UpdateResourceGroupRequest): Promise<ResourceGroupDto> {
    const resp = await apiPut<{data?: ResourceGroupDto}>(this.client, `/api/v1/resource-groups/${id}`, body)
    return unwrapSingle(resp)
  }

  /** Delete a resource group. */
  async delete(id: string | number): Promise<void> {
    await apiDelete(this.client, `/api/v1/resource-groups/${id}`)
  }

  /** Add a member (monitor or service) to a resource group. */
  async addMember(groupId: string | number, memberId: string | number, memberType: 'MONITOR' | 'SERVICE'): Promise<void> {
    await apiPost<unknown>(this.client, `/api/v1/resource-groups/${groupId}/members`, {memberId, memberType})
  }

  /** Remove a member from a resource group. */
  async removeMember(groupId: string | number, memberId: string | number): Promise<void> {
    await apiDelete(this.client, `/api/v1/resource-groups/${groupId}/members/${memberId}`)
  }
}
