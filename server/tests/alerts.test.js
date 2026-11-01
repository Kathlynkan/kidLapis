import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildAlerts,
  unassignedAlert,
  noRecentSessionAlert,
  repeatedStruggleAlerts,
  overdueHomeworkAlert,
} from '../utils/alerts.js'

const seed = JSON.parse(readFileSync(new URL('../data/seed.json', import.meta.url)))
const TODAY = seed.meta.seedAnchor // seed dates are written relative to this day
const alerts = buildAlerts({ ...seed, today: TODAY })
const find = (type, name) => alerts.find((a) => a.type === type && a.childName.startsWith(name))

test('seed: Chloe has had no session in over 7 days', () => {
  assert.ok(find('no-session', 'Chloe'))
})

test('seed: Sofia is unassigned, and not double-reported as "no session"', () => {
  assert.ok(find('unassigned', 'Sofia'))
  assert.equal(find('no-session', 'Sofia'), undefined)
})

test('seed: Ethan keeps struggling with common denominators', () => {
  assert.match(find('repeated-struggle', 'Ethan').message, /common denominators/)
})

test('seed: children seen recently get no "no-session" alert', () => {
  for (const name of ['Ethan', 'Meera', 'Arjun', 'Ryan']) {
    assert.equal(find('no-session', name), undefined, name)
  }
})

test('unassignedAlert', () => {
  assert.equal(unassignedAlert({ volunteerIds: ['u_vol1'] }), null)
  assert.equal(unassignedAlert({ volunteerIds: [] }).type, 'unassigned')
})

test('noRecentSessionAlert: exactly 7 days is fine, 8 days alerts', () => {
  const child = { volunteerIds: ['v'] }
  assert.equal(noRecentSessionAlert(child, [{ date: '2026-10-01' }], '2026-10-08'), null)
  assert.ok(noRecentSessionAlert(child, [{ date: '2026-09-30' }], '2026-10-08'))
})

test('repeatedStruggleAlerts: only counts the last 5 sessions of a subject', () => {
  const s = (date, struggles) => ({ date, subject: 'Math', struggles })
  const sessions = [
    s('2026-09-01', ['Fractions']), // 6th newest: outside the window
    s('2026-09-02', ['Fractions']),
    s('2026-09-03', ['Fractions']),
    s('2026-09-04', []),
    s('2026-09-05', []),
    s('2026-09-06', []),
  ]
  assert.equal(repeatedStruggleAlerts(sessions).length, 0) // only 2 inside the window

  sessions[3] = s('2026-09-04', ['Fractions']) // now 3 inside the window
  assert.equal(repeatedStruggleAlerts(sessions).length, 1)
})

test('overdueHomeworkAlert ignores submitted and not-yet-due work', () => {
  const today = '2026-10-06'
  assert.equal(
    overdueHomeworkAlert(
      [
        { status: 'submitted', dueDate: '2026-10-01', title: 'A' },
        { status: 'assigned', dueDate: '2026-10-07', title: 'B' },
      ],
      today,
    ),
    null,
  )
  assert.ok(overdueHomeworkAlert([{ status: 'assigned', dueDate: '2026-10-01', title: 'C' }], today))
})