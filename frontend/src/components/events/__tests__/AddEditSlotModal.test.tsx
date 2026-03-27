/**
 * FE-TEST-04: Component tests for <AddEditSlotModal>
 *
 * Written in the Red phase — all tests must fail before the component exists.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AddEditSlotModal } from '../AddEditSlotModal'
import type { EventSlot } from '../../../lib/events'

beforeEach(() => {
  vi.clearAllMocks()
})

const noop = () => undefined
const noopAsync = async () => undefined

describe('AddEditSlotModal — create mode', () => {
  it('renders location, shiftStart, shiftEnd, and headcount fields', () => {
    render(
      <AddEditSlotModal
        roleName="Marshal"
        onSave={noopAsync}
        onClose={noop}
      />
    )
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/shift start/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/shift end/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/headcount/i)).toBeInTheDocument()
  })

  it('renders Save and Cancel buttons', () => {
    render(
      <AddEditSlotModal
        roleName="Marshal"
        onSave={noopAsync}
        onClose={noop}
      />
    )
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('shows error when shiftStart is missing on submit', async () => {
    render(
      <AddEditSlotModal
        roleName="Marshal"
        onSave={noopAsync}
        onClose={noop}
      />
    )
    const shiftEndInput = screen.getByLabelText(/shift end/i)
    await userEvent.type(shiftEndInput, '13:00')

    const headcountInput = screen.getByLabelText(/headcount/i)
    await userEvent.type(headcountInput, '5')

    const saveBtn = screen.getByRole('button', { name: /save/i })
    await userEvent.click(saveBtn)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('shows error when shiftEnd is missing on submit', async () => {
    render(
      <AddEditSlotModal
        roleName="Marshal"
        onSave={noopAsync}
        onClose={noop}
      />
    )
    const shiftStartInput = screen.getByLabelText(/shift start/i)
    await userEvent.type(shiftStartInput, '09:00')

    const headcountInput = screen.getByLabelText(/headcount/i)
    await userEvent.type(headcountInput, '5')

    const saveBtn = screen.getByRole('button', { name: /save/i })
    await userEvent.click(saveBtn)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('shows error when shiftEnd is not after shiftStart', async () => {
    render(
      <AddEditSlotModal
        roleName="Marshal"
        onSave={noopAsync}
        onClose={noop}
      />
    )
    const shiftStartInput = screen.getByLabelText(/shift start/i)
    await userEvent.type(shiftStartInput, '13:00')

    const shiftEndInput = screen.getByLabelText(/shift end/i)
    await userEvent.type(shiftEndInput, '09:00')

    const headcountInput = screen.getByLabelText(/headcount/i)
    await userEvent.type(headcountInput, '5')

    const saveBtn = screen.getByRole('button', { name: /save/i })
    await userEvent.click(saveBtn)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('shows error when headcount is less than 1', async () => {
    render(
      <AddEditSlotModal
        roleName="Marshal"
        onSave={noopAsync}
        onClose={noop}
      />
    )
    const shiftStartInput = screen.getByLabelText(/shift start/i)
    await userEvent.type(shiftStartInput, '09:00')

    const shiftEndInput = screen.getByLabelText(/shift end/i)
    await userEvent.type(shiftEndInput, '13:00')

    const headcountInput = screen.getByLabelText(/headcount/i)
    await userEvent.type(headcountInput, '0')

    const saveBtn = screen.getByRole('button', { name: /save/i })
    await userEvent.click(saveBtn)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('shows error when headcount exceeds 500', async () => {
    render(
      <AddEditSlotModal
        roleName="Marshal"
        onSave={noopAsync}
        onClose={noop}
      />
    )
    const shiftStartInput = screen.getByLabelText(/shift start/i)
    await userEvent.type(shiftStartInput, '09:00')

    const shiftEndInput = screen.getByLabelText(/shift end/i)
    await userEvent.type(shiftEndInput, '13:00')

    const headcountInput = screen.getByLabelText(/headcount/i)
    await userEvent.type(headcountInput, '501')

    const saveBtn = screen.getByRole('button', { name: /save/i })
    await userEvent.click(saveBtn)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('calls onSave with correct payload on valid submit', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <AddEditSlotModal
        roleName="Marshal"
        onSave={onSave}
        onClose={noop}
      />
    )
    await userEvent.type(screen.getByLabelText(/shift start/i), '09:00')
    await userEvent.type(screen.getByLabelText(/shift end/i), '13:00')
    await userEvent.type(screen.getByLabelText(/headcount/i), '5')

    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ shiftStart: '09:00', shiftEnd: '13:00', headcount: 5 })
      )
    })
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    render(
      <AddEditSlotModal
        roleName="Marshal"
        onSave={noopAsync}
        onClose={onClose}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('AddEditSlotModal — edit mode', () => {
  const existingSlot: EventSlot = {
    slotId: 'slot-1',
    roleId: 'role-1',
    shiftStart: '09:00',
    shiftEnd: '13:00',
    headcount: 5,
    filledCount: 2,
    status: 'OPEN',
    location: 'Start line',
  }

  it('pre-fills fields from existing slot', () => {
    render(
      <AddEditSlotModal
        roleName="Marshal"
        slot={existingSlot}
        onSave={noopAsync}
        onClose={noop}
      />
    )
    expect(screen.getByDisplayValue('Start line')).toBeInTheDocument()
    expect(screen.getByDisplayValue('09:00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('13:00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('5')).toBeInTheDocument()
  })

  it('calls onSave with updated values', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <AddEditSlotModal
        roleName="Marshal"
        slot={existingSlot}
        onSave={onSave}
        onClose={noop}
      />
    )
    const headcountInput = screen.getByLabelText(/headcount/i)
    await userEvent.clear(headcountInput)
    await userEvent.type(headcountInput, '10')

    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ headcount: 10 })
      )
    })
  })
})
