import 'express'

declare module 'express' {
  interface Request {
    /**
     * Attached by the `requireAuth` middleware after a valid session is
     * validated. Undefined on unauthenticated routes.
     */
    session?: {
      sessionId: string
      userId: string
      role: string
      orgId?: string
      createdAt: string
      expiresAt: number
    }
  }
}
