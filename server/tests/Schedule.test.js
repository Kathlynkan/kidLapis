import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findClash, overlaps } from '../utils/schedule.js'

const children = [
  { id: 'c_1', name: 'Ethan Wong', schedule: [{ volunteerId: 'u_vol1', day: 'Mon', time: '16:00' }] },
  { id: 'c_4', name: 'Chloe Lee', schedule: [{ volunteerId: 'u_vol1', day: 'Wed', time: '16:00' }] },
  { id: 'c_6', name: 'Sofia Ong', schedule: [] },
]
const booking = (extra) => ({ childId: 'c_6', volunteerId: 'u_vol1', volunteerName: 'Aisha', day: 'Mon', ...extra })

test('overlaps: one-hour sessions less than an hour apart clash', () => {
  assert.equal(overlaps('16:00', '16:30'), true)
  assert.equal(overlaps('16:00', '17:00'), false)
  assert.equal(overlaps('15:30', '16:00'), true)
})

test('volunteer cannot be double-booked', () => {
  assert.match(findClash(children, booking({ time: '16:30' })), /Aisha already has Ethan Wong on Mon at 16:00/)
})

test('a free time, or the same time on another day, is fine', () => {
  assert.equal(findClash(children, booking({ time: '17:00' })), null)
  assert.equal(findClash(children, booking({ day: 'Tue', time: '16:00' })), null)
})

test('a child cannot have two sessions at once', () => {
  const clash = findClash(children, { childId: 'c_1', volunteerId: 'u_vol2', volunteerName: 'Daniel', day: 'Mon', time: '16:00' })
  assert.match(clash, /Ethan Wong already has another session/)
})

test('changing the time of an existing slot does not clash with itself', () => {
  assert.equal(findClash(children, { childId: 'c_1', volunteerId: 'u_vol1', day: 'Mon', time: '16:30' }), null)
})

test('no time chosen means nothing to check', () => {
  assert.equal(findClash(children, booking({ time: undefined })), null)
})