import { test, describe } from 'vitest'
import assert from 'node:assert/strict'

// The late-penalty formula used in PUT /homework/:id/verify (routes/homework.js).
// Isolated here so the rule is tested without a DB or HTTP server.
// Route uses Math.ceil so a child always earns at least 1 star for a late submission.
function pointsAwarded(hw) {
  const isLate = hw.completedAt && hw.dueDate && hw.completedAt > hw.dueDate
  return isLate ? Math.ceil(hw.points / 2) : hw.points
}

describe('homework late-penalty formula', () => {
  test('on-time submission earns full points', () => {
    assert.equal(pointsAwarded({ points: 10, dueDate: '2026-06-10', completedAt: '2026-06-09' }), 10)
  })

  test('same-day submission (completedAt === dueDate) earns full points', () => {
    assert.equal(pointsAwarded({ points: 10, dueDate: '2026-06-10', completedAt: '2026-06-10' }), 10)
  })

  test('late submission earns ceil(points / 2)', () => {
    assert.equal(pointsAwarded({ points: 10, dueDate: '2026-06-10', completedAt: '2026-06-11' }), 5)
  })

  test('ceil division: odd points late rounds up (child gets the benefit of the doubt)', () => {
    assert.equal(pointsAwarded({ points: 15, dueDate: '2026-06-10', completedAt: '2026-06-11' }), 8)
  })

  test('null completedAt (not yet submitted) earns full points', () => {
    assert.equal(pointsAwarded({ points: 10, dueDate: '2026-06-10', completedAt: null }), 10)
  })

  test('null dueDate (no deadline) earns full points', () => {
    assert.equal(pointsAwarded({ points: 10, dueDate: null, completedAt: '2026-06-11' }), 10)
  })

  test('1-point quest late still earns 1 star (ceil of 0.5)', () => {
    assert.equal(pointsAwarded({ points: 1, dueDate: '2026-06-10', completedAt: '2026-06-11' }), 1)
  })
})

// ── Leaderboard weekly ranking logic ──────────────────────────────────────────
// Extracted from GET /homework/leaderboard?period=week in routes/homework.js.
// Tested as a pure function so the ranking rules are verified without a DB or server.
function weeklyRanking(homeworkList, children) {
  const weekPoints = {}
  for (const hw of homeworkList) {
    weekPoints[hw.childId] = (weekPoints[hw.childId] || 0) + (hw.pointsAwarded ?? hw.points)
  }
  if (Object.keys(weekPoints).length === 0) return []
  return children
    .filter((c) => weekPoints[c.id] !== undefined)
    .map((c) => ({ childId: c.id, name: c.name, points: weekPoints[c.id] }))
    .sort((a, b) => b.points - a.points)
}

describe('leaderboard weekly ranking', () => {
  test('ranks children in descending order by total weekly points', () => {
    const hw = [
      { childId: 'c_1', points: 10, pointsAwarded: 10 },
      { childId: 'c_2', points: 20, pointsAwarded: 20 },
      { childId: 'c_1', points: 15, pointsAwarded: 15 }, // second verified quest for same child
    ]
    const children = [{ id: 'c_1', name: 'Alice' }, { id: 'c_2', name: 'Bob' }]
    const ranking = weeklyRanking(hw, children)
    assert.equal(ranking[0].childId, 'c_1')  // 25 total
    assert.equal(ranking[0].points,  25)
    assert.equal(ranking[1].childId, 'c_2')  // 20 total
    assert.equal(ranking[1].points,  20)
  })

  test('uses pointsAwarded when set, falling back to points when not', () => {
    // pointsAwarded is written at verify time and may differ from points (e.g. late penalty)
    const hw = [
      { childId: 'c_1', points: 10, pointsAwarded: 5 },        // late: half awarded
      { childId: 'c_2', points: 10, pointsAwarded: undefined }, // no override: use points
    ]
    const children = [{ id: 'c_1', name: 'Alice' }, { id: 'c_2', name: 'Bob' }]
    const ranking = weeklyRanking(hw, children)
    assert.equal(ranking[0].childId, 'c_2')  // 10 (no penalty)
    assert.equal(ranking[1].childId, 'c_1')  // 5  (late penalty)
  })

  test('excludes children who have no verified homework this week', () => {
    const hw = [{ childId: 'c_1', points: 10, pointsAwarded: 10 }]
    const children = [{ id: 'c_1', name: 'Alice' }, { id: 'c_2', name: 'Bob' }]
    const ranking = weeklyRanking(hw, children)
    assert.equal(ranking.length, 1)
    assert.equal(ranking[0].childId, 'c_1')
  })

  test('returns empty array when no homework was verified this week', () => {
    const ranking = weeklyRanking([], [{ id: 'c_1', name: 'Alice' }])
    assert.deepEqual(ranking, [])
  })
})
