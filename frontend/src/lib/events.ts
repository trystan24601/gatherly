/**
 * Typed API client functions for organisation event endpoints.
 */
import { apiClient } from './api'

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface CreateEventPayload {
  title: string
  eventTypeId: string
  eventDate: string
  startTime: string
  endTime: string
  venueName: string
  venueAddress: string
  city: string
  postcode: string
  description?: string
  maxVolunteers?: number
}

export interface EventRole {
  roleId: string
  eventId: string
  name: string
  capacity: number
  filledCount: number
}

export interface EventDetail {
  eventId: string
  orgId: string
  title: string
  eventTypeId: string
  eventDate: string
  startTime: string
  endTime: string
  venueName: string
  venueAddress: string
  city: string
  postcode: string
  description?: string
  maxVolunteers?: number
  status: 'DRAFT' | 'PUBLISHED' | 'ACTIVE' | 'CANCELLED' | 'COMPLETED'
  createdAt: string
  publishedAt?: string
  cancelledAt?: string
  completedAt?: string
  roles: EventRole[]
  pendingRegistrationCount?: number
}

export interface EventSummary {
  eventId: string
  title: string
  eventDate: string
  status: 'DRAFT' | 'PUBLISHED' | 'ACTIVE' | 'CANCELLED' | 'COMPLETED'
  totalRoles: number
  totalHeadcount: number
  filledCount: number
  fillRate: number
}

export interface EventListResponse {
  events: EventSummary[]
  cursor: string | null
}

export interface ListOrgEventsParams {
  limit?: number
  cursor?: string
}

// --------------------------------------------------------------------------
// API functions
// --------------------------------------------------------------------------

export function createEvent(payload: CreateEventPayload): Promise<EventDetail> {
  return apiClient.post<EventDetail>('/organisation/events', payload)
}

export function updateEvent(
  eventId: string,
  patch: Partial<CreateEventPayload>
): Promise<EventDetail> {
  return apiClient.patch<EventDetail>(`/organisation/events/${eventId}`, patch)
}

export function getEvent(eventId: string): Promise<EventDetail> {
  return apiClient.get<EventDetail>(`/organisation/events/${eventId}`)
}

export function listOrgEvents(params?: ListOrgEventsParams): Promise<EventListResponse> {
  const limit = params?.limit ?? 20
  const searchParams = new URLSearchParams({ limit: String(limit) })
  if (params?.cursor) searchParams.set('cursor', params.cursor)
  return apiClient.get<EventListResponse>(`/organisation/events?${searchParams.toString()}`)
}

export function publishEvent(eventId: string): Promise<EventDetail> {
  return apiClient.post<EventDetail>(`/organisation/events/${eventId}/publish`, undefined)
}

export function cancelEvent(eventId: string): Promise<EventDetail> {
  return apiClient.post<EventDetail>(`/organisation/events/${eventId}/cancel`, undefined)
}
