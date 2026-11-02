import { test } from 'vitest'
import assert from 'node:assert/strict'
import { toJpg } from '../models/helpers.js'
import { scoreVolunteer } from '../utils/matchmaking.js'
import User from '../models/User.js'
import Session from '../models/Session.js'

test('an old .webp photo path is sent as .jpg', () => {
  assert.equal(toJpg('/photos/ethan.webp'), '/photos/ethan.jpg')
})

test('a .jpg path, an emoji and a data: photo stay the same', () => {
  assert.equal(toJpg('/photos/ethan.jpg'), '/photos/ethan.jpg')
  assert.equal(toJpg('🐼'), '🐼')
  assert.equal(toJpg('data:image/webp;base64,AAAA'), 'data:image/webp;base64,AAAA')
})

test('the avatar of a user and the photos of a session are sent as .jpg', () => {
  const user = new User({ name: 'A', email: 'a@x.sg', password: 'x', role: 'parent', avatar: '/photos/grace.webp' })
  assert.equal(user.toJSON().avatar, '/photos/grace.jpg')
  const session = new Session({ childId: 'c_1', volunteerId: 'u_1', date: '2026-10-01', photos: ['/photos/chess.webp', '/photos/a.jpg'] })
  assert.deepEqual(session.toJSON().photos, ['/photos/chess.jpg', '/photos/a.jpg'])
})

test('a matchmaking suggestion carries the volunteer photo', () => {
  const volunteer = { id: 'v', name: 'Aisha', avatar: '/photos/aisha.jpg', skills: [], availability: [] }
  const result = scoreVolunteer({ id: 'c_x', needs: [], volunteerIds: [] }, volunteer, [])
  assert.equal(result.avatar, '/photos/aisha.jpg')
})
