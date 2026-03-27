/**
 * FE-TEST-02: Component tests for <RoleCard>
 *
 * Written in the Red phase — all tests must fail before the component exists.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --------------------------------------------------------------------------
// Imports (after mocks)
// --------------------------------------------------------------------------

import { RoleCard } from '../RoleCard'
import type { EventRole, EventSlot } from '../../../lib/events'

// --------------------------------------------------------------------------
// Fixtures
// --------------------------------------------------------------------------

const SLOT_1: EventSlot = {
  slotId: 'slot-1',
  roleId: 'role-1',
  shiftStart: '09:00',
  shiftEnd: '13:00',
  headcount: 5,
  filledCount: 2,
  status: 'OPEN',
  location: 'Start line',
}

const SLOT_2: EventSlot = {
  slotId: 'slot-2',
  roleId: 'role-1',
  shiftStart: '13:00',
  shiftEnd: '17:00',
  headcount: 3,
  filledCount: 0,
  status: 'OPEN',
}

const ROLE_WITH_SLOTS: EventRole = {
  roleId: 'role-1',
  name: 'Marshal',
  description: 'Keep runners on course',
  skillIds: ['first-aid'],
  slots: [SLOT_1, SLOT_2],
}

const ROLE_NO_SLOTS: EventRole = {
  roleId: 'role-2',
  name: 'Medic',
  slots: [],
}

const noop = () => undefined
const noopAsync = async () => undefined

beforeEach(() => {
  vi.clearAllMocks()
})

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('RoleCard', () => {
  describe('rendering — role info', () => {
    it('renders the role name', () => {
      render(
        <RoleCard
          role={ROLE_WITH_SLOTS}
          isDraft={true}
          onEditRole={noop}
          onDeleteRole={noopAsync}
          onAddSlot={noop}
          onEditSlot={noop}
          onDeleteSlot={noopAsync}
        />
      )
      expect(screen.getByText('Marshal')).toBeInTheDocument()
    })

    it('renders the role description when provided', () => {
      render(
        <RoleCard
          role={ROLE_WITH_SLOTS}
          isDraft={true}
          onEditRole={noop}
          onDeleteRole={noopAsync}
          onAddSlot={noop}
          onEditSlot={noop}
          onDeleteSlot={noopAsync}
        />
      )
      expect(screen.getByText('Keep runners on course')).toBeInTheDocument()
    })

    it('renders slot location and shift time range', () => {
      render(
        <RoleCard
          role={ROLE_WITH_SLOTS}
          isDraft={true}
          onEditRole={noop}
          onDeleteRole={noopAsync}
          onAddSlot={noop}
          onEditSlot={noop}
          onDeleteSlot={noopAsync}
        />
      )
      expect(screen.getByText('Start line')).toBeInTheDocument()
      expect(screen.getByText(/09:00.+13:00/)).toBeInTheDocument()
    })

    it('renders headcount and filledCount for each slot', () => {
      render(
        <RoleCard
          role={ROLE_WITH_SLOTS}
          isDraft={true}
          onEditRole={noop}
          onDeleteRole={noopAsync}
          onAddSlot={noop}
          onEditSlot={noop}
          onDeleteSlot={noopAsync}
        />
      )
      // Slot 1: 2/5, Slot 2: 0/3
      expect(screen.getByText(/2.+5/)).toBeInTheDocument()
    })
  })

  describe('rendering — DRAFT controls', () => {
    it('renders "Edit" and "Delete" buttons on the role when isDraft=true', () => {
      render(
        <RoleCard
          role={ROLE_WITH_SLOTS}
          isDraft={true}
          onEditRole={noop}
          onDeleteRole={noopAsync}
          onAddSlot={noop}
          onEditSlot={noop}
          onDeleteSlot={noopAsync}
        />
      )
      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      // At least one Edit for the role itself
      expect(editButtons.length).toBeGreaterThanOrEqual(1)
      expect(deleteButtons.length).toBeGreaterThanOrEqual(1)
    })

    it('renders "Edit" and "Delete" buttons on each slot when isDraft=true', () => {
      render(
        <RoleCard
          role={ROLE_WITH_SLOTS}
          isDraft={true}
          onEditRole={noop}
          onDeleteRole={noopAsync}
          onAddSlot={noop}
          onEditSlot={noop}
          onDeleteSlot={noopAsync}
        />
      )
      // 2 slots + 1 role = 3 edit buttons, 3 delete buttons
      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      expect(editButtons.length).toBeGreaterThanOrEqual(3)
      expect(deleteButtons.length).toBeGreaterThanOrEqual(3)
    })

    it('renders "+ Add slot" button when isDraft=true', () => {
      render(
        <RoleCard
          role={ROLE_WITH_SLOTS}
          isDraft={true}
          onEditRole={noop}
          onDeleteRole={noopAsync}
          onAddSlot={noop}
          onEditSlot={noop}
          onDeleteSlot={noopAsync}
        />
      )
      expect(screen.getByRole('button', { name: /add slot/i })).toBeInTheDocument()
    })
  })

  describe('rendering — non-DRAFT (read-only)', () => {
    it('does not render Edit/Delete/Add slot controls when isDraft=false', () => {
      render(
        <RoleCard
          role={ROLE_WITH_SLOTS}
          isDraft={false}
          onEditRole={noop}
          onDeleteRole={noopAsync}
          onAddSlot={noop}
          onEditSlot={noop}
          onDeleteSlot={noopAsync}
        />
      )
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /add slot/i })).not.toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onEditRole when role Edit button is clicked', async () => {
      const onEditRole = vi.fn()
      render(
        <RoleCard
          role={ROLE_NO_SLOTS}
          isDraft={true}
          onEditRole={onEditRole}
          onDeleteRole={noopAsync}
          onAddSlot={noop}
          onEditSlot={noop}
          onDeleteSlot={noopAsync}
        />
      )
      const editBtn = screen.getByRole('button', { name: /edit role/i })
      await userEvent.click(editBtn)
      expect(onEditRole).toHaveBeenCalledWith(ROLE_NO_SLOTS)
    })

    it('calls onDeleteRole when role Delete button is clicked', async () => {
      const onDeleteRole = vi.fn().mockResolvedValue(undefined)
      render(
        <RoleCard
          role={ROLE_NO_SLOTS}
          isDraft={true}
          onEditRole={noop}
          onDeleteRole={onDeleteRole}
          onAddSlot={noop}
          onEditSlot={noop}
          onDeleteSlot={noopAsync}
        />
      )
      const deleteBtn = screen.getByRole('button', { name: /delete role/i })
      await userEvent.click(deleteBtn)
      expect(onDeleteRole).toHaveBeenCalledWith(ROLE_NO_SLOTS.roleId)
    })

    it('calls onAddSlot when "+ Add slot" button is clicked', async () => {
      const onAddSlot = vi.fn()
      render(
        <RoleCard
          role={ROLE_NO_SLOTS}
          isDraft={true}
          onEditRole={noop}
          onDeleteRole={noopAsync}
          onAddSlot={onAddSlot}
          onEditSlot={noop}
          onDeleteSlot={noopAsync}
        />
      )
      const addSlotBtn = screen.getByRole('button', { name: /add slot/i })
      await userEvent.click(addSlotBtn)
      expect(onAddSlot).toHaveBeenCalledWith(ROLE_NO_SLOTS.roleId)
    })

    it('calls onEditSlot when a slot Edit button is clicked', async () => {
      const onEditSlot = vi.fn()
      render(
        <RoleCard
          role={ROLE_WITH_SLOTS}
          isDraft={true}
          onEditRole={noop}
          onDeleteRole={noopAsync}
          onAddSlot={noop}
          onEditSlot={onEditSlot}
          onDeleteSlot={noopAsync}
        />
      )
      const editSlotButtons = screen.getAllByRole('button', { name: /edit slot/i })
      await userEvent.click(editSlotButtons[0])
      expect(onEditSlot).toHaveBeenCalledWith(SLOT_1)
    })

    it('calls onDeleteSlot when a slot Delete button is clicked', async () => {
      const onDeleteSlot = vi.fn().mockResolvedValue(undefined)
      render(
        <RoleCard
          role={ROLE_WITH_SLOTS}
          isDraft={true}
          onEditRole={noop}
          onDeleteRole={noopAsync}
          onAddSlot={noop}
          onEditSlot={noop}
          onDeleteSlot={onDeleteSlot}
        />
      )
      const deleteSlotButtons = screen.getAllByRole('button', { name: /delete slot/i })
      await userEvent.click(deleteSlotButtons[0])
      expect(onDeleteSlot).toHaveBeenCalledWith(SLOT_1.slotId)
    })
  })
})
