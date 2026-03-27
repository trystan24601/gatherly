/**
 * Typed API client functions for organisation endpoints.
 */
import { apiClient } from './api'

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface RegisterOrgPayload {
  name: string
  orgType: string
  description: string
  contactEmail: string
  contactPhone: string
  website?: string
  adminFirstName: string
  adminLastName: string
  adminEmail: string
  adminPassword: string
}

export interface RegisterOrgResponse {
  orgId: string
  message: string
}

export interface OrgSummary {
  orgId: string
  name: string
  orgType: string
  status: string
  submittedAt: string
  description?: string
}

export interface OrgDetail extends OrgSummary {
  contactEmail: string
  contactPhone: string
  website?: string
  adminUserId: string
  approvedAt?: string
  approvedBy?: string
  rejectedAt?: string
  rejectionReason?: string
}

export interface OrgListResponse {
  items: OrgSummary[]
  cursor: string | null
}

// --------------------------------------------------------------------------
// API functions
// --------------------------------------------------------------------------

export function registerOrganisation(payload: RegisterOrgPayload): Promise<RegisterOrgResponse> {
  return apiClient.post<RegisterOrgResponse>('/organisations/register', payload)
}

export function getAdminOrgs(
  status: string = 'PENDING',
  limit: number = 20,
  cursor?: string
): Promise<OrgListResponse> {
  const params = new URLSearchParams({ status, limit: String(limit) })
  if (cursor) params.set('cursor', cursor)
  return apiClient.get<OrgListResponse>(`/admin/organisations?${params.toString()}`)
}

export function getAdminOrgDetail(orgId: string): Promise<OrgDetail> {
  return apiClient.get<OrgDetail>(`/admin/organisations/${orgId}`)
}

export function approveOrg(orgId: string): Promise<OrgDetail> {
  return apiClient.post<OrgDetail>(`/admin/organisations/${orgId}/approve`, {})
}

export function rejectOrg(orgId: string, reason: string): Promise<OrgDetail> {
  return apiClient.post<OrgDetail>(`/admin/organisations/${orgId}/reject`, { reason })
}
