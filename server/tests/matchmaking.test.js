import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { scoreVolunteer, rankVolunteers } from '../utils/matchmaking.js'

const seed = JSON.parse(readFileSync(new URL('../data/seed.json', import.meta.url)))
const volunteers = seed.users.filter((u) => u.role === 'volunteer')
const childNamed = (name) => seed.children.find((c) => c.name.startsWith(name))

test('score = +2 per skill, +1 per day, -1 per other child', () => {
  const child = { id: 'c_x', needs: ['Fractions', 'Science'], volunteerIds: [] }
  const volunteer = { id: 'v', name: 'V', skills: ['Fractions', 'Science', 'Art'], availability: ['Mon', 'Wed'] }
  const others = [
    { id: 'c_a', volunteerIds: ['v'] },
    { id: 'c_b', volunteerIds: ['v'] },
    { id: 'c_c', volunteerIds: ['someone else'] },
  ]
  const result = scoreVolunteer(child, volunteer, [child, ...others])
  assert.deepEqual(result.breakdown, { skills: 4, days: 2, workload: -2 })
  assert.equal(result.score, 4)
  assert.deepEqual(result.matchedSkills, ['Fractions', 'Science'])
})

test('the child being matched does not count towards workload', () => {
  const child = { id: 'c_x', needs: [], volunteerIds: ['v'] }
  const volunteer = { id: 'v', name: 'V', skills: [], availability: [] }
  const result = scoreVolunteer(child, volunteer, [child])
  assert.equal(result.workload, 0)
  assert.equal(result.assigned, true)
})

test('seed: Priya is the top match for Sofia', () => {
  const ranked = rankVolunteers(childNamed('Sofia'), volunteers, seed.children)
  assert.equal(ranked[0].name, 'Priya Nair')
  assert.deepEqual(ranked[0].matchedSkills, ['English'])
})

test('seed: Ethan scores his two assigned volunteers with their schedule days', () => {
  const ranked = rankVolunteers(childNamed('Ethan'), volunteers, seed.children)
  const aisha = ranked.find((r) => r.name === 'Aisha Rahman')
  assert.equal(aisha.assigned, true)
  assert.deepEqual(aisha.scheduledDays, ['Mon'])
})