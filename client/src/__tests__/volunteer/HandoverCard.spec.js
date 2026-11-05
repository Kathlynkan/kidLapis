// Owner: Yuqi

import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import { createPinia } from 'pinia'
import HandoverCard from '@/components/HandoverCard.vue'
import { useAuthStore } from '@/stores/auth'

// Draw the HandoverCard as if someone with this role is logged in
// role = 'volunteer' or 'parent', props = { handover, loading }
function mountAs(role, props) {
  // make a new, empty login store (Pinia) just for this test
  const pinia = createPinia()

  // pretend someone with this role is logged in
  const auth = useAuthStore(pinia)
  auth.user = { id: 'u_test', name: 'Test User', role: role }

  // draw the card with its props, and give it the login store (like app.use(pinia) in main.js)
  return mount(HandoverCard, { props: props, global: { plugins: [pinia] } })
}

// a pretend volunteer handover (same as what server sends)
const volunteerHandover = {
  nextStep: 'Practise adding fractions with the same bottom number.',
  struggle: 'Common denominators came up in 3 of the last 5 sessions.',
  lastResult: 'Got 4/5 on Fractions last session.',
  whatWorked: 'Pizza drawings help him see the parts.',
  watchFor: '', // empty, so the Mood row should not show
  source: 'ai',
}

// a pretend parent weekly summary
// Ethan has sessions in 3 weeks (newest first), and the card is showing the middle week (26 Oct)
const parentSummary = {
  headline: 'Ethan had a happy week with us.',
  learning: 'He got 4 out of 5 right in fractions.',
  friends: 'He played chess with Arjun.',
  celebrate: 'He helped tidy up the games corner.',
  atHome: 'Ask Ethan to show you his pizza drawings.',
  source: 'ai',
  weekTitle: 'Last week',
  periodLabel: 'Mon 26 Oct to Fri 30 Oct',
  weeks: ['2026-11-02', '2026-10-26', '2026-10-19'],
  weekStart: '2026-10-26',
}

describe('TestSuite: HandoverCard (volunteer)', () => {
  // check that a volunteer sees the "Handover Notes" title and the notes from the handover
  it('Test1: shows the handover notes', () => {
    const wrapper = mountAs('volunteer', { handover: volunteerHandover, loading: false })
    expect(wrapper.text()).toContain('Handover Notes')
    expect(wrapper.text()).toContain('Practise adding fractions with the same bottom number.')
    expect(wrapper.text()).toContain('Got 4/5 on Fractions last session.')
  })

  // check that the rows come in the order a volunteer reads them before a session
  it('Test2: shows the rows in the order a volunteer reads them', () => {
    const wrapper = mountAs('volunteer', { handover: volunteerHandover, loading: false })

    // "dt" is the label of each row, e.g. 'Teach Next'
    const labels = []
    for (const label of wrapper.findAll('dt')) {
      labels.push(label.text())
    }
    expect(labels).toEqual(['Teach Next', 'Why', 'Progress', 'What Helps'])
  })

  // check that a row with nothing to say is left out (watchFor is empty, so no Mood row)
  it('Test3: leaves out a row with nothing to say', () => {
    const wrapper = mountAs('volunteer', { handover: volunteerHandover, loading: false })
    expect(wrapper.text()).not.toContain('Mood')
  })

  // check that a loading message shows while the summary is generating
  it('Test4: shows a loading message while waiting for the summary', () => {
    const wrapper = mountAs('volunteer', { handover: null, loading: true })
    expect(wrapper.text()).toContain('Preparing handover...')
  })
})


describe('TestSuite: HandoverCard (parent)', () => {
  // check that a parent sees the weekly summary title and dates, not the volunteer's handover
  it('Test5: shows the weekly summary title and dates', () => {
    const wrapper = mountAs('parent', { handover: parentSummary, loading: false })
    expect(wrapper.text()).toContain('Last week at Student Care')
    expect(wrapper.text()).toContain('Mon 26 Oct to Fri 30 Oct')
    expect(wrapper.text()).not.toContain('Handover Notes')
  })

  // check that clicking "Previous Week" sends the week before (19 Oct) to the page
  it('Test6: "Previous Week" asks the page for the week before', async () => {
    const wrapper = mountAs('parent', { handover: parentSummary, loading: false })
    await wrapper.find('[data-test="week-earlier"]').trigger('click')

    // emitted('change-week') = a list of everything the card sent with 'change-week'
    expect(wrapper.emitted('change-week')).toEqual([['2026-10-19']])
  })

  // check that on the newest week (2 Nov), "Next Week" cannot be clicked but "Previous Week" can
  it('Test7: "Next Week" is disabled on the newest week', () => {
    // a pretend summary that is showing the newest week
    const newestWeek = {
      headline: 'Ethan had a happy week with us.',
      weeks: ['2026-11-02', '2026-10-26', '2026-10-19'],
      weekStart: '2026-11-02', // the newest week in the list
    }
    const wrapper = mountAs('parent', { handover: newestWeek, loading: false })
    expect(wrapper.find('[data-test="week-later"]').element.disabled).toBe(true)
    expect(wrapper.find('[data-test="week-earlier"]').element.disabled).toBe(false)
  })
})