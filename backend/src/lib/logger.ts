export interface LogContext {
  requestId: string
  action: string
  userId?: string
  orgId?: string
  durationMs?: number
  statusCode?: number
}

export function log(context: LogContext): void {
  const entry: Record<string, unknown> = {
    requestId: context.requestId,
    action: context.action,
  }

  if (context.userId !== undefined) entry.userId = context.userId
  if (context.orgId !== undefined) entry.orgId = context.orgId
  if (context.durationMs !== undefined) entry.durationMs = context.durationMs
  if (context.statusCode !== undefined) entry.statusCode = context.statusCode

  console.log(JSON.stringify(entry))
}
