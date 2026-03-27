/**
 * Organisation registration form.
 *
 * Single-page form with two fieldset sections:
 * - Organisation Details
 * - Your Admin Account
 *
 * Client-side validation mirrors backend rules. On success, navigates to
 * /register/organisation/submitted. No sid cookie is set (user not auto-logged-in).
 */
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerOrganisation } from '../../lib/organisations'
import { ApiError } from '../../lib/api'

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

interface FormErrors {
  name?: string
  orgType?: string
  description?: string
  contactEmail?: string
  contactPhone?: string
  website?: string
  adminFirstName?: string
  adminLastName?: string
  adminEmail?: string
  adminPassword?: string
  general?: string
}

// --------------------------------------------------------------------------
// Validation helpers
// --------------------------------------------------------------------------

const VALID_ORG_TYPES = ['SPORTS_CLUB', 'CHARITY', 'COMMUNITY', 'OTHER'] as const
const UK_PHONE_REGEX = /^(\+44|0)[0-9]{10}$/

function validateEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function validateUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
}

function validateForm(fields: {
  name: string
  orgType: string
  description: string
  contactEmail: string
  contactPhone: string
  website: string
  adminFirstName: string
  adminLastName: string
  adminEmail: string
  adminPassword: string
}): FormErrors {
  const errors: FormErrors = {}

  if (!fields.name) {
    errors.name = 'Organisation name is required.'
  } else if (fields.name.length < 3 || fields.name.length > 100) {
    errors.name = 'Name must be between 3 and 100 characters.'
  }

  if (!fields.orgType) {
    errors.orgType = 'Organisation type is required.'
  } else if (!VALID_ORG_TYPES.includes(fields.orgType as (typeof VALID_ORG_TYPES)[number])) {
    errors.orgType = 'Please select a valid organisation type.'
  }

  if (!fields.description) {
    errors.description = 'Description is required.'
  } else if (fields.description.length < 20 || fields.description.length > 1000) {
    errors.description = 'Description must be between 20 and 1000 characters.'
  }

  if (!fields.contactEmail) {
    errors.contactEmail = 'Contact email is required.'
  } else if (!validateEmail(fields.contactEmail)) {
    errors.contactEmail = 'Please enter a valid email address.'
  }

  if (!fields.contactPhone) {
    errors.contactPhone = 'Contact phone is required.'
  } else if (!UK_PHONE_REGEX.test(fields.contactPhone)) {
    errors.contactPhone = 'Please enter a valid UK phone number (e.g. 07700900123).'
  }

  if (fields.website && !validateUrl(fields.website)) {
    errors.website = 'Please enter a valid URL (http or https).'
  }

  if (!fields.adminFirstName) {
    errors.adminFirstName = 'First name is required.'
  }

  if (!fields.adminLastName) {
    errors.adminLastName = 'Last name is required.'
  }

  if (!fields.adminEmail) {
    errors.adminEmail = 'Your email is required.'
  } else if (!validateEmail(fields.adminEmail)) {
    errors.adminEmail = 'Please enter a valid email address.'
  }

  if (!fields.adminPassword) {
    errors.adminPassword = 'Password is required.'
  } else if (!isStrongPassword(fields.adminPassword)) {
    errors.adminPassword =
      'Password must be at least 8 characters and include an uppercase letter and a number.'
  }

  return errors
}

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------

export function OrgRegisterForm() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [orgType, setOrgType] = useState('')
  const [description, setDescription] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [adminFirstName, setAdminFirstName] = useState('')
  const [adminLastName, setAdminLastName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const fields = {
      name,
      orgType,
      description,
      contactEmail,
      contactPhone,
      website,
      adminFirstName,
      adminLastName,
      adminEmail,
      adminPassword,
    }

    const validationErrors = validateForm(fields)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors({})
    setIsSubmitting(true)

    try {
      await registerOrganisation({
        name,
        orgType,
        description,
        contactEmail,
        contactPhone,
        ...(website ? { website } : {}),
        adminFirstName,
        adminLastName,
        adminEmail,
        adminPassword,
      })
      navigate('/register/organisation/submitted')
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const body = err.body as { error?: string }
        if (body?.error?.includes('account with this email')) {
          setErrors({ adminEmail: body.error })
        } else if (body?.error?.includes('organisation with this email')) {
          setErrors({ contactEmail: body.error })
        } else {
          setErrors({ general: body?.error ?? 'Registration failed. Please try again.' })
        }
      } else {
        setErrors({ general: 'An unexpected error occurred. Please try again.' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Register your organisation</h1>
          <p className="mt-2 text-gray-600">
            Submit your organisation for review. You&apos;ll be notified by email once approved.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          {errors.general && (
            <div role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-700">
              {errors.general}
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* Organisation Details */}
          {/* ----------------------------------------------------------------- */}
          <fieldset className="rounded-lg border border-gray-200 bg-white p-6">
            <legend className="px-2 text-lg font-semibold text-gray-900">
              Organisation Details
            </legend>

            <div className="mt-4 space-y-5">
              {/* Organisation Name */}
              <div>
                <label
                  htmlFor="org-name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Organisation name <span className="text-red-500">*</span>
                </label>
                <input
                  id="org-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-describedby={errors.name ? 'org-name-error' : undefined}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 ${
                    errors.name
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-brand-500'
                  }`}
                />
                {errors.name && (
                  <p id="org-name-error" role="alert" className="mt-1 text-sm text-red-600">
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Organisation Type */}
              <div>
                <label
                  htmlFor="org-type"
                  className="block text-sm font-medium text-gray-700"
                >
                  Organisation type <span className="text-red-500">*</span>
                </label>
                <select
                  id="org-type"
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                  aria-describedby={errors.orgType ? 'org-type-error' : undefined}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 ${
                    errors.orgType
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-brand-500'
                  }`}
                >
                  <option value="">Select a type…</option>
                  <option value="SPORTS_CLUB">Sports Club</option>
                  <option value="CHARITY">Charity</option>
                  <option value="COMMUNITY">Community Group</option>
                  <option value="OTHER">Other</option>
                </select>
                {errors.orgType && (
                  <p id="org-type-error" role="alert" className="mt-1 text-sm text-red-600">
                    {errors.orgType}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="org-description"
                  className="block text-sm font-medium text-gray-700"
                >
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="org-description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  aria-describedby={errors.description ? 'org-description-error' : undefined}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 ${
                    errors.description
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-brand-500'
                  }`}
                />
                {errors.description && (
                  <p id="org-description-error" role="alert" className="mt-1 text-sm text-red-600">
                    {errors.description}
                  </p>
                )}
              </div>

              {/* Contact Email */}
              <div>
                <label
                  htmlFor="contact-email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Contact email <span className="text-red-500">*</span>
                </label>
                <input
                  id="contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  aria-describedby={errors.contactEmail ? 'contact-email-error' : undefined}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 ${
                    errors.contactEmail
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-brand-500'
                  }`}
                />
                {errors.contactEmail && (
                  <p id="contact-email-error" role="alert" className="mt-1 text-sm text-red-600">
                    {errors.contactEmail}
                  </p>
                )}
              </div>

              {/* Contact Phone */}
              <div>
                <label
                  htmlFor="contact-phone"
                  className="block text-sm font-medium text-gray-700"
                >
                  Contact phone <span className="text-red-500">*</span>
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="07700900123"
                  aria-describedby={errors.contactPhone ? 'contact-phone-error' : undefined}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 ${
                    errors.contactPhone
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-brand-500'
                  }`}
                />
                {errors.contactPhone && (
                  <p id="contact-phone-error" role="alert" className="mt-1 text-sm text-red-600">
                    {errors.contactPhone}
                  </p>
                )}
              </div>

              {/* Website (optional) */}
              <div>
                <label
                  htmlFor="org-website"
                  className="block text-sm font-medium text-gray-700"
                >
                  Website{' '}
                  <span className="text-xs text-gray-500">(optional)</span>
                </label>
                <input
                  id="org-website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.org"
                  aria-describedby={errors.website ? 'org-website-error' : undefined}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 ${
                    errors.website
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-brand-500'
                  }`}
                />
                {errors.website && (
                  <p id="org-website-error" role="alert" className="mt-1 text-sm text-red-600">
                    {errors.website}
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          {/* ----------------------------------------------------------------- */}
          {/* Admin Account */}
          {/* ----------------------------------------------------------------- */}
          <fieldset className="rounded-lg border border-gray-200 bg-white p-6">
            <legend className="px-2 text-lg font-semibold text-gray-900">
              Your Admin Account
            </legend>

            <div className="mt-4 space-y-5">
              {/* First Name */}
              <div>
                <label
                  htmlFor="admin-first-name"
                  className="block text-sm font-medium text-gray-700"
                >
                  First name <span className="text-red-500">*</span>
                </label>
                <input
                  id="admin-first-name"
                  type="text"
                  value={adminFirstName}
                  onChange={(e) => setAdminFirstName(e.target.value)}
                  aria-describedby={errors.adminFirstName ? 'admin-first-name-error' : undefined}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 ${
                    errors.adminFirstName
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-brand-500'
                  }`}
                />
                {errors.adminFirstName && (
                  <p id="admin-first-name-error" role="alert" className="mt-1 text-sm text-red-600">
                    {errors.adminFirstName}
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label
                  htmlFor="admin-last-name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Last name <span className="text-red-500">*</span>
                </label>
                <input
                  id="admin-last-name"
                  type="text"
                  value={adminLastName}
                  onChange={(e) => setAdminLastName(e.target.value)}
                  aria-describedby={errors.adminLastName ? 'admin-last-name-error' : undefined}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 ${
                    errors.adminLastName
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-brand-500'
                  }`}
                />
                {errors.adminLastName && (
                  <p id="admin-last-name-error" role="alert" className="mt-1 text-sm text-red-600">
                    {errors.adminLastName}
                  </p>
                )}
              </div>

              {/* Admin Email */}
              <div>
                <label
                  htmlFor="admin-email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Your email <span className="text-red-500">*</span>
                </label>
                <input
                  id="admin-email"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  aria-describedby={errors.adminEmail ? 'admin-email-error' : undefined}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 ${
                    errors.adminEmail
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-brand-500'
                  }`}
                />
                {errors.adminEmail && (
                  <p id="admin-email-error" role="alert" className="mt-1 text-sm text-red-600">
                    {errors.adminEmail}
                  </p>
                )}
              </div>

              {/* Admin Password */}
              <div>
                <label
                  htmlFor="admin-password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="admin-password"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  aria-describedby={errors.adminPassword ? 'admin-password-error' : undefined}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 ${
                    errors.adminPassword
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-brand-500'
                  }`}
                />
                <p className="mt-1 text-xs text-gray-500">
                  At least 8 characters, one uppercase letter, and one number.
                </p>
                {errors.adminPassword && (
                  <p id="admin-password-error" role="alert" className="mt-1 text-sm text-red-600">
                    {errors.adminPassword}
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting…' : 'Submit application'}
          </button>
        </form>
      </div>
    </div>
  )
}
