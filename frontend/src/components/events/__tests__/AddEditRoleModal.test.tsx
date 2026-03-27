/**
 * FE-TEST-03: Component tests for <AddEditRoleModal>
 *
 * Written in the Red phase — all tests must fail before the component exists.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AddEditRoleModal } from '../AddEditRoleModal'
import type { EventRole } from '../../../lib/events'

beforeEach(() => {
  vi.clearAllMocks()
})

const noop = () => undefined
const noopAsync = async () => undefined

describe('AddEditRoleModal — create mode', () => {
  it('renders a name field and description field', () => {
    render(
      <AddEditRoleModal
        onSave={noopAsync}
        onClose={noop}
      />
    )
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
  })

  it('renders Save and Cancel buttons', () => {
    render(
      <AddEditRoleModal
        onSave={noopAsync}
        onClose={noop}
      />
    )
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('shows inline validation error when name is empty on submit', async () => {
    render(
      <AddEditRoleModal
        onSave={noopAsync}
        onClose={noop}
      />
    )
    const saveBtn = screen.getByRole('button', { name: /save/i })
    await userEvent.click(saveBtn)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('calls onSave with correct payload when valid name is submitted', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <AddEditRoleModal
        onSave={onSave}
        onClose={noop}
      />
    )
    const nameInput = screen.getByLabelText(/name/i)
    await userEvent.type(nameInput, 'Marshal')

    const saveBtn = screen.getByRole('button', { name: /save/i })
    await userEvent.click(saveBtn)

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Marshal' })
      )
    })
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    render(
      <AddEditRoleModal
        onSave={noopAsync}
        onClose={onClose}
      />
    )
    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    await userEvent.click(cancelBtn)

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('AddEditRoleModal — edit mode', () => {
  const existingRole: EventRole = {
    roleId: 'role-1',
    name: 'Old Name',
    description: 'Old description',
    skillIds: [],
    slots: [],
  }

  it('pre-fills name and description from existing role', () => {
    render(
      <AddEditRoleModal
        role={existingRole}
        onSave={noopAsync}
        onClose={noop}
      />
    )
    expect(screen.getByDisplayValue('Old Name')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Old description')).toBeInTheDocument()
  })

  it('calls onSave with updated values', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <AddEditRoleModal
        role={existingRole}
        onSave={onSave}
        onClose={noop}
      />
    )
    const nameInput = screen.getByLabelText(/name/i)
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'New Name')

    const saveBtn = screen.getByRole('button', { name: /save/i })
    await userEvent.click(saveBtn)

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Name' })
      )
    })
  })
})
