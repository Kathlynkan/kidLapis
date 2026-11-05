// Verify that SessionCard displays or hides Edit and Delete buttons
// correctly based on user permissions and session status

import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SessionCard from '@/components/SessionCard.vue'

const baseSession = {
  id: 's1',
  subject: 'Math',
  topic: 'Fractions',
  date: '2026-10-20',
  volunteerName: 'Aisha Rahman',
  attempted: 5,
  correct: 4,
  struggles: [],
  mood: 'okay'
}

describe('SessionCard', () => {

  // Test Case 1: Volunteer has edit permission, parent has not viewed session
  test('shows Edit and Delete buttons when session is editable', () => {
    const wrapper = mount(SessionCard, {
      props: {
        canEdit: true,
        session: {
          ...baseSession,
          parentViewed: null
        }
      }
    })

    expect(wrapper.text()).toContain('Edit')
    expect(wrapper.text()).toContain('Delete')
  })

  // Test Case 2: Volunteer has edit permission, parent has viewed session
  test('hides Edit and Delete when parent has viewed session', () => {
    const wrapper = mount(SessionCard, {
      props: {
        canEdit: true,
        session: {
          ...baseSession,
          parentViewed: '2026-11-02'
        }
      }
    })

    expect(wrapper.text()).not.toContain('Edit')
    expect(wrapper.text()).not.toContain('Delete')
  })

  // Test Case 3: Volunteer does not have edit permission
  test('hides Edit and Delete when user lacks edit permission', () => {
    const wrapper = mount(SessionCard, {
      props: {
        canEdit: false,
        session: {
          ...baseSession,
          parentViewed: null
        }
      }
    })

    expect(wrapper.text()).not.toContain('Edit')
    expect(wrapper.text()).not.toContain('Delete')
  })

})