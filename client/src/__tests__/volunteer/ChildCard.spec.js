// Owner: Yuqi

import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ChildCard from '@/components/ChildCard.vue'

// a child and their last session (example of what the server sends)
const ethan = { id: 'c_1', name: 'Ethan Wong', level: 'P4', school: 'Riverside Primary', avatar: '' }
const lastSession = { date: '2026-10-29', subject: 'Math', topic: 'Fractions', correct: 4, attempted: 5 }

// childCard is the card for one child on the volunteer home page (with props -> child)
describe('TestSuite: ChildCard', () => {
  // if the child is Ethan, the card should show Ethan's name, level and school
  it('Test1: shows who the child is', () => {
    const wrapper = mount(ChildCard, { props: { child: ethan } })

    expect(wrapper.text()).toContain('Ethan Wong')
    expect(wrapper.text()).toContain('P4')
    expect(wrapper.text()).toContain('Riverside Primary')
  })

  // show the last topic and last result of ethan
  it('Test2: shows the last topic and the score as a percentage', () => {
    const wrapper = mount(ChildCard, { props: { child: ethan, lastSession: lastSession } })

    expect(wrapper.text()).toContain('Fractions')
    expect(wrapper.text()).toContain('4/5 (80%)') 
  })

  // when theres no sessions recorded for ethan at all
  it('Test3: says when there are no sessions yet', () => {
    const wrapper = mount(ChildCard, { props: { child: ethan } })

    expect(wrapper.text()).toContain('No sessions recorded yet.')
    expect(wrapper.text()).not.toContain('Last result')
  })

 // show the badge only when the volunteer page gives one (e.g. 'Starts Mon, 9 Nov') and hide it when there is none
  it('Test4: shows the badge only when there is one', () => {
    const withBadge = mount(ChildCard, { props: { child: ethan, badge: 'Starts Mon, 9 Nov' } })
    const withoutBadge = mount(ChildCard, { props: { child: ethan } })

    expect(withBadge.text()).toContain('Starts Mon, 9 Nov')
    expect(withBadge.find('[data-test="child-badge"]').exists()).toBeTruthy()
    expect(withoutBadge.find('[data-test="child-badge"]').exists()).toBeFalsy()
  })

// when the volunteer clicks Ethan's card, it sends 'open' with his id so the volunteer page can open his profile
  it('Test5: clicking the card sends the child id', async () => {
    const wrapper = mount(ChildCard, { props: { child: ethan, lastSession: lastSession } })

    await wrapper.find('[data-test="child-card"]').trigger('click')

    expect(wrapper.emitted('open')).toEqual([['c_1']])
  })
})