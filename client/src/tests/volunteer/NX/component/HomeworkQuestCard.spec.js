// Verify that HomeWorkQuestCard displays correct volunteer
// actions according to the homework status and componenet state

import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HomeworkQuestCard from '@/components/HomeworkQuestCard.vue'

const baseHomework = {
  id: 'h1',
  title: 'Fraction Worksheet',
  subject: 'Math',
  details: 'Complete questions 1-10',
  dueDate: '2026-11-10',
  points: 10
}

describe('HomeworkQuestCard', () => {

  // Test Case 1: Homework is assigned by volunteer
  test('shows Edit and Delete buttons for assigned homework', () => {
    const wrapper = mount(HomeworkQuestCard, {
      props: {
        mode: 'volunteer',
        homework: {
          ...baseHomework,
          status: 'assigned'
        }
      }
    })

    expect(wrapper.text()).toContain('Edit')
    expect(wrapper.text()).toContain('Delete')
  })

  // Test Case 2: Homework is submitted by child
  test('shows Mark as Checked and Return buttons for submitted homework', () => {
    const wrapper = mount(HomeworkQuestCard, {
      props: {
        mode: 'volunteer',
        homework: {
          ...baseHomework,
          status: 'submitted'
        }
      }
    })

    expect(wrapper.text()).toContain('Mark as Checked')
    expect(wrapper.text()).toContain('Return')
  })

  // Test Case 3: Submitted homework is verified by volunteer
  test('hides all volunteer action buttons for verified homework', () => {
    const wrapper = mount(HomeworkQuestCard, {
      props: {
        mode: 'volunteer',
        homework: {
          ...baseHomework,
          status: 'verified'
        }
      }
    })

    expect(wrapper.text()).not.toContain('Edit')
    expect(wrapper.text()).not.toContain('Delete')
    expect(wrapper.text()).not.toContain('Mark as Checked')
    expect(wrapper.text()).not.toContain('Return')
  })

  // Test Case 4: Homework is submitted and readonly is true
  test('hides volunteer action buttons when readonly is true', () => {
    const wrapper = mount(HomeworkQuestCard, {
      props: {
        mode: 'volunteer',
        readonly: true,
        homework: {
          ...baseHomework,
          status: 'submitted'
        }
      }
    })

    expect(wrapper.text()).not.toContain('Mark as Checked')
    expect(wrapper.text()).not.toContain('Return')
  })

})