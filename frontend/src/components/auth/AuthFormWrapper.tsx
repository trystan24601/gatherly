import { type ReactNode } from 'react'

interface AuthFormWrapperProps {
  heading: string
  children: ReactNode
}

/**
 * Shared card layout for all auth forms.
 * Provides the Gatherly logo, a centred card, and a heading.
 */
export function AuthFormWrapper({ heading, children }: AuthFormWrapperProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Gatherly</h1>
      </div>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md">
        <h2 className="mb-6 text-xl font-semibold text-gray-800">{heading}</h2>
        {children}
      </div>
    </div>
  )
}
