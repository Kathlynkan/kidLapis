import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { scoreVolunteer, rankVolunteers } from '../utils/matchmaking.js'

const seed = JSON.parse(readFileSync(new URL('../data/seed.json', import.meta.url)))
const volunteers = seed.users.filter((u) => u.role === 'volunteer')
const childNamed = (name) => seed.children.find((c) => c.name.startsWith(name))

test('score = +2 per subject, +1 per day, -1 per other child', () => {
  const child = { id: 'c_x', needs: ['Math', 'Science'], volunteerIds: [] }
  const volunteer = { id: 'v', name: 'V', skills: ['Math', 'Science', 'English'], availability: ['Mon', 'Wed'] }
  const others = [
    { id: 'c_a', volunteerIds: ['v'] },
    { id: 'c_b', volunteerIds: ['v'] },
    { id: 'c_c', volunteerIds: ['someone else'] },
  ]
  const result = scoreVolunteer(child, volunteer, [child, ...others])
  assert.deepEqual(result.breakdown, { skills: 4, days: 2, workload: -2 })
  assert.equal(result.score, 4)
  assert.deepEqual(result.matchedSkills, ['Math', 'Science'])
})

test('the child being matched does not count towards workload', () => {
  const child = { id: 'c_x', needs: [], volunteerIds: ['v'] }
  const volunteer = { id: 'v', name: 'V', skills: [], availability: [] }
  const result = scoreVolunteer(child, volunteer, [child])
  assert.equal(result.workload, 0)
  assert.equal(result.assigned, true)
})

test('seed: Priya is the top match for Sofia (Aisha matches more but is busier)', () => {
  const ranked = rankVolunteers(childNamed('Sofia'), volunteers, seed.children)
  assert.equal(ranked[0].name, 'Priya Nair')
  assert.equal(ranked[0].score, 3) // +2 English, +2 days, -1 other child
  assert.equal(ranked[1].name, 'Aisha Rahman')
  assert.equal(ranked[1].score, 2) // +4 Math & English, +2 days, -4 other children
})

test('seed: Ethan scores his two assigned volunteers with their schedule days', () => {
  const ranked = rankVolunteers(childNamed('Ethan'), volunteers, seed.children)
  const aisha = ranked.find((r) => r.name === 'Aisha Rahman')
  assert.equal(aisha.assigned, true)
  assert.deepEqual(aisha.scheduledDays, ['Mon', 'Wed'])
  // Seed slots have no status, so they count as accepted.
  assert.deepEqual(aisha.scheduledSlots, [
    { day: 'Mon', time: '16:00', status: 'accepted' },
    { day: 'Wed', time: '18:00', status: 'accepted' },
  ])
})

test('pending requests are listed with their status; declined ones are left out', () => {
  const child = {
    id: 'c_x',
    needs: [],
    volunteerIds: [],
    schedule: [
      { volunteerId: 'v', day: 'Mon', time: '16:00', status: 'pending' },
      { volunteerId: 'v', day: 'Wed', time: '16:00', status: 'declined' },
    ],
  }
  const volunteer = { id: 'v', name: 'V', skills: [], availability: ['Mon', 'Wed'] }
  const result = scoreVolunteer(child, volunteer, [child])
  assert.deepEqual(result.scheduledSlots, [{ day: 'Mon', time: '16:00', status: 'pending' }])
  assert.deepEqual(result.scheduledDays, ['Mon']) // Wed can be requested again
  assert.deepEqual(result.pendingDays, ['Mon']) // the Matchmaking page shows "waiting" for these
})