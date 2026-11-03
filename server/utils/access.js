// Who is allowed to see which child? (shared helper - owner: Kai Sen)
//   coordinator -> every child
//   volunteer   -> children assigned to them (child.volunteerIds)
//   parent      -> their own children (child.parentId)
//   child       -> only themselves (user.childId)
import { Child } from '../models/index.js'

// For ONE child document you already loaded
export function canAccessChild(user, child) {
  if (!child) return false
  switch (user.role) {
    case 'coordinator':
      return true
    case 'volunteer':
      return child.volunteerIds.includes(user.id)
    case 'parent':
      return child.parentId === user.id
    case 'child':
      return user.childId === child.id
    default:
      return false
  }
}

// The same rule written as a MongoDB filter, for Child.find(...)
export function childFilterFor(user) {
  switch (user.role) {
    case 'coordinator':
      return {}
    case 'volunteer':
      return { volunteerIds: user.id } // matches if the array contains user.id
    case 'parent':
      return { parentId: user.id }
    case 'child':
      return { _id: user.childId }
    default:
      return { _id: null }
  }
}

// Ids of every child this user can see -> use with { childId: { $in: ids } }
export async function visibleChildIds(user) {
  const children = await Child.find(childFilterFor(user)).select('_id')
  return children.map((c) => c.id)
}
