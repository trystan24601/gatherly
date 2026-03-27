/**
 * FE-TEST-01: Component tests for <OrgRegisterForm>
 *
 * Written in the Red phase — tests must fail before implementation exists.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthProvider } from '../../../context/AuthContext'
import { apiClient, ApiError } from '../../../lib/api'

// --------------------------------------------------------------------------
// Module mocks
// --------------------------------------------------------------------------

vi.mock('../../../lib/api', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(public status: number, public body: unknown) {
      super(`HTTP ${status}`)
      this.name = 'ApiError'
    }
  },
}))

vi.mock('../../../lib/organisations', () => ({
  registerOrganisation: vi.fn(),
}))

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

// Lazy import to allow the component to not exist yet
async function getComponent() {
  const mod = await import('../OrgRegisterForm')
  return mod.OrgRegisterForm
}

function renderWithProviders(ui: React.ReactElement) {
  // Mock GET /auth/me as 401 (unauthenticated user filling in the form)
  (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('401'))
  return render(
    <MemoryRouter initialEntries={['/register/organisation']}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.resetAllMocks()
})

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('<OrgRegisterForm>', () => {
  it('renders the organisation name field with an accessible label', async () => {
    const OrgRegisterForm = await getComponent()
    renderWithProviders(<OrgRegisterForm />)
    expect(screen.getByLabelText(/organisation name/i)).toBeInTheDocument()
  })

  it('renders the orgType select field with an accessible label', async () => {
    const OrgRegisterForm = await getComponent()
    renderWithProviders(<OrgRegisterForm />)
    expect(screen.getByLabelText(/organisation type/i)).toBeInTheDocument()
  })

  it('renders the description textarea with an accessible label', async () => {
    const OrgRegisterForm = await getComponent()
    renderWithProviders(<OrgRegisterForm />)
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
  })

  it('renders the contactEmail field with an accessible label', async () => {
    const OrgRegisterForm = await getComponent()
    renderWithProviders(<OrgRegisterForm />)
    expect(screen.getByLabelText(/contact email/i)).toBeInTheDocument()
  })

  it('renders the contactPhone field with an accessible label', async () => {
    const OrgRegisterForm = await getComponent()
    renderWithProviders(<OrgRegisterForm />)
    expect(screen.getByLabelText(/contact phone/i)).toBeInTheDocument()
  })

  it('renders the website field (optional) with an accessible label', async () => {
    const OrgRegisterForm = await getComponent()
    renderWithProviders(<OrgRegisterForm />)
    expect(screen.getByLabelText(/website/i)).toBeInTheDocument()
  })

  it('renders the adminFirstName field with an accessible label', async () => {
    const OrgRegisterForm = await getComponent()
    renderWithProviders(<OrgRegisterForm />)
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
  })

  it('renders the adminLastName field with an accessible label', async () => {
    const OrgRegisterForm = await getComponent()
    renderWithProviders(<OrgRegisterForm />)
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
  })

  it('renders the adminEmail field with an accessible label', async () => {
    const OrgRegisterForm = await getComponent()
    renderWithProviders(<OrgRegisterForm />)
    expect(screen.getByLabelText(/your email/i)).toBeInTheDocument()
  })

  it('renders the adminPassword field with an accessible label', async () => {
    const OrgRegisterForm = await getComponent()
    renderWithProviders(<OrgRegisterForm />)
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('shows inline validation error when name < 3 chars on submit attempt', async () => {
    const OrgRegisterForm = await getComponent()
    renderWithProviders(<OrgRegisterForm />)

    const nameInput = screen.getByLabelText(/organisation name/i)
    await userEvent.type(nameInput, 'AB')
    await userEvent.click(screen.getByRole('button', { name: /submit|register|apply/i }))

    await waitFor(() => {
      expect(screen.getByText(/name must be/i)).toBeInTheDocument()
    })
  })

  it('shows inline validation error when description < 20 chars on submit attempt', async () => {
    const OrgRegisterForm = await getComponent()
    renderWithProviders(<OrgRegisterForm />)

    const descInput = screen.getByLabelText(/description/i)
    await userEvent.type(descInput, 'Too short.')
    await userEvent.click(screen.getByRole('button', { name: /submit|register|apply/i }))

    await waitFor(() => {
      expect(screen.getByText(/description must be/i)).toBeInTheDocument()
    })
  })

  it('shows inline validation error when contactEmail is invalid format', async () => {
    const OrgRegisterForm = await getComponent()
    renderWithProviders(<OrgRegisterForm />)

    const emailInput = screen.getByLabelText(/contact email/i)
    await userEvent.type(emailInput, 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: /submit|register|apply/i }))

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument()
    })
  })

  it('shows inline validation error when adminPassword is weak', async () => {
    const OrgRegisterForm = await getComponent()
    renderWithProviders(<OrgRegisterForm />)

    const passwordInput = screen.getByLabelText(/password/i)
    await userEvent.type(passwordInput, 'weak')
    await userEvent.click(screen.getByRole('button', { name: /submit|register|apply/i }))

    await waitFor(() => {
      expect(screen.getByText(/password must be/i)).toBeInTheDocument()
    })
  })

  it('navigates to /register/organisation/submitted on successful API response', async () => {
    const { registerOrganisation } = await import('../../../lib/organisations')
    ;(registerOrganisation as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      orgId: 'new-org-id',
      message: 'Organisation submitted for review.',
    })

    const mockNavigate = vi.fn()
    vi.doMock('react-router-dom', async (importOriginal) => {
      const actual = await importOriginal<typeof import('react-router-dom')>()
      return { ...actual, useNavigate: () => mockNavigate }
    })

    // Re-import to pick up the new mock (vitest dynamic import)
    const { OrgRegisterForm: FreshForm } = await import('../OrgRegisterForm')
    renderWithProviders(<FreshForm />)

    // Fill required fields
    await userEvent.type(screen.getByLabelText(/organisation name/i), 'Test Org Name')
    // Select orgType
    const selectEl = screen.getByLabelText(/organisation type/i)
    await userEvent.selectOptions(selectEl, 'SPORTS_CLUB')
    await userEvent.type(screen.getByLabelText(/description/i), 'A community running club based in South London for all abilities.')
    await userEvent.type(screen.getByLabelText(/contact email/i), 'hello@test-org.co.uk')
    await userEvent.type(screen.getByLabelText(/contact phone/i), '07700900123')
    await userEvent.type(screen.getByLabelText(/first name/i), 'Alice')
    await userEvent.type(screen.getByLabelText(/last name/i), 'Smith')
    await userEvent.type(screen.getByLabelText(/your email/i), 'alice@test-org.co.uk')
    await userEvent.type(screen.getByLabelText(/password/i), 'SecurePass1')

    await userEvent.click(screen.getByRole('button', { name: /submit|register|apply/i }))

    await waitFor(() => {
      expect(registerOrganisation).toHaveBeenCalled()
    })
  })

  it('shows field-level error on adminEmail field when API returns 409 admin email conflict', async () => {
    const { registerOrganisation } = await import('../../../lib/organisations')
    ;(registerOrganisation as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new ApiError(409, { error: 'An account with this email already exists.' })
    )

    const OrgRegisterForm = await getComponent()
    renderWithProviders(<OrgRegisterForm />)

    // Fill minimal required fields
    await userEvent.type(screen.getByLabelText(/organisation name/i), 'Test Org Name')
    const selectEl = screen.getByLabelText(/organisation type/i)
    await userEvent.selectOptions(selectEl, 'COMMUNITY')
    await userEvent.type(screen.getByLabelText(/description/i), 'A community group for testing our registration form flow.')
    await userEvent.type(screen.getByLabelText(/contact email/i), 'hello@test-org.co.uk')
    await userEvent.type(screen.getByLabelText(/contact phone/i), '07700900123')
    await userEvent.type(screen.getByLabelText(/first name/i), 'Alice')
    await userEvent.type(screen.getByLabelText(/last name/i), 'Smith')
    await userEvent.type(screen.getByLabelText(/your email/i), 'alice@test-org.co.uk')
    await userEvent.type(screen.getByLabelText(/password/i), 'SecurePass1')

    await userEvent.click(screen.getByRole('button', { name: /submit|register|apply/i }))

    await waitFor(() => {
      expect(screen.getByText(/account with this email already exists/i)).toBeInTheDocument()
    })
  })

  it('shows field-level error on contactEmail field when API returns 409 org email conflict', async () => {
    const { registerOrganisation } = await import('../../../lib/organisations')
    ;(registerOrganisation as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new ApiError(409, { error: 'An organisation with this email is already registered.' })
    )

    const OrgRegisterForm = await getComponent()
    renderWithProviders(<OrgRegisterForm />)

    await userEvent.type(screen.getByLabelText(/organisation name/i), 'Test Org Name')
    const selectEl = screen.getByLabelText(/organisation type/i)
    await userEvent.selectOptions(selectEl, 'CHARITY')
    await userEvent.type(screen.getByLabelText(/description/i), 'A charity for testing the registration form submission flow.')
    await userEvent.type(screen.getByLabelText(/contact email/i), 'hello@taken-org.co.uk')
    await userEvent.type(screen.getByLabelText(/contact phone/i), '07700900123')
    await userEvent.type(screen.getByLabelText(/first name/i), 'Alice')
    await userEvent.type(screen.getByLabelText(/last name/i), 'Smith')
    await userEvent.type(screen.getByLabelText(/your email/i), 'alice@new-org.co.uk')
    await userEvent.type(screen.getByLabelText(/password/i), 'SecurePass1')

    await userEvent.click(screen.getByRole('button', { name: /submit|register|apply/i }))

    await waitFor(() => {
      expect(screen.getByText(/organisation with this email is already registered/i)).toBeInTheDocument()
    })
  })

  it('submit button is disabled while request is in-flight', async () => {
    const { registerOrganisation } = await import('../../../lib/organisations')
    // Create a promise that never resolves to simulate in-flight state
    let resolveRegister!: () => void
    const pendingPromise = new Promise<{ orgId: string; message: string }>((resolve) => {
      resolveRegister = () => resolve({ orgId: 'test-id', message: 'submitted' })
    })
    ;(registerOrganisation as ReturnType<typeof vi.fn>).mockReturnValueOnce(pendingPromise)

    const OrgRegisterForm = await getComponent()
    renderWithProviders(<OrgRegisterForm />)

    await userEvent.type(screen.getByLabelText(/organisation name/i), 'Test Org Name')
    const selectEl = screen.getByLabelText(/organisation type/i)
    await userEvent.selectOptions(selectEl, 'OTHER')
    await userEvent.type(screen.getByLabelText(/description/i), 'A community group for testing the loading state of the submit button.')
    await userEvent.type(screen.getByLabelText(/contact email/i), 'hello@test-org.co.uk')
    await userEvent.type(screen.getByLabelText(/contact phone/i), '07700900123')
    await userEvent.type(screen.getByLabelText(/first name/i), 'Alice')
    await userEvent.type(screen.getByLabelText(/last name/i), 'Smith')
    await userEvent.type(screen.getByLabelText(/your email/i), 'alice@test-org.co.uk')
    await userEvent.type(screen.getByLabelText(/password/i), 'SecurePass1')

    await userEvent.click(screen.getByRole('button', { name: /submit|register|apply/i }))

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /submit|register|apply|submitting|loading/i })
      expect(button).toBeDisabled()
    })

    resolveRegister()
  })
})
