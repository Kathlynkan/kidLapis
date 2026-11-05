import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HomeworkQuestCard from '@/components/HomeworkQuestCard.vue'

const baseHw = {
  id: 'hw1',
  title: 'Count to 10',
  subject: 'Math',
  dueDate: '2099-12-31',
  points: 15,
  details: 'Count from 1 to 10 out loud.',
  status: 'assigned',
}

const mountCard = (homework, mode = 'child', extra = {}) =>
  mount(HomeworkQuestCard, {
    props: { homework, mode, ...extra },
    global: { stubs: { Teleport: true } },
  })

describe('HomeworkQuestCard — child mode', () => {
  it('renders the quest title', () => {
    const wrapper = mountCard(baseHw)
    expect(wrapper.find('[data-test="homework-card"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Count to 10')
  })

  it('shows the submit button when status is assigned', () => {
    const wrapper = mountCard(baseHw)
    expect(wrapper.find('[data-test="submit-quest-btn"]').exists()).toBe(true)
  })

  it('emits submit with the homework id when the submit button is clicked', async () => {
    const wrapper = mountCard(baseHw)
    await wrapper.find('[data-test="submit-quest-btn"]').trigger('click')
    expect(wrapper.emitted('submit')?.[0]).toEqual(['hw1'])
  })

  it('hides the submit button once the quest is submitted', () => {
    const wrapper = mountCard({ ...baseHw, status: 'submitted' })
    expect(wrapper.find('[data-test="submit-quest-btn"]').exists()).toBe(false)
  })
})

describe('HomeworkQuestCard — volunteer mode', () => {
  it('shows the verify button when a quest is waiting to be checked', () => {
    const wrapper = mountCard({ ...baseHw, status: 'submitted' }, 'volunteer')
    expect(wrapper.find('[data-test="verify-homework-btn"]').exists()).toBe(true)
  })

  it('emits verify with the homework id when the verify button is clicked', async () => {
    const wrapper = mountCard({ ...baseHw, status: 'submitted' }, 'volunteer')
    await wrapper.find('[data-test="verify-homework-btn"]').trigger('click')
    expect(wrapper.emitted('verify')?.[0]).toEqual(['hw1'])
  })

  it('shows edit and delete buttons when a quest is still assigned', () => {
    const wrapper = mountCard(baseHw, 'volunteer')
    expect(wrapper.find('[data-test="edit-homework-btn"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="delete-homework-btn"]').exists()).toBe(true)
  })

  it('disables the verify button and shows spinner when busy', () => {
    const wrapper = mountCard({ ...baseHw, status: 'submitted' }, 'volunteer', { busy: true })
    const btn = wrapper.find('[data-test="verify-homework-btn"]')
    expect(btn.attributes('disabled')).toBeDefined()
    expect(btn.find('.spinner-border').exists()).toBe(true)
  })

  it('does not disable the verify button when not busy', () => {
    const wrapper = mountCard({ ...baseHw, status: 'submitted' }, 'volunteer', { busy: false })
    const btn = wrapper.find('[data-test="verify-homework-btn"]')
    expect(btn.attributes('disabled')).toBeUndefined()
  })
})

describe('HomeworkQuestCard — undo', () => {
  it('shows the undo button when status is submitted in child mode', () => {
    const wrapper = mountCard({ ...baseHw, status: 'submitted' })
    expect(wrapper.find('[data-test="undo-quest-btn"]').exists()).toBe(true)
  })

  it('emits unsubmit with the homework id when the undo button is clicked', async () => {
    const wrapper = mountCard({ ...baseHw, status: 'submitted' })
    await wrapper.find('[data-test="undo-quest-btn"]').trigger('click')
    expect(wrapper.emitted('unsubmit')?.[0]).toEqual(['hw1'])
  })

  it('does not show the undo button when status is verified', () => {
    const wrapper = mountCard({ ...baseHw, status: 'verified' })
    expect(wrapper.find('[data-test="undo-quest-btn"]').exists()).toBe(false)
  })

  it('does not show the undo button in volunteer mode', () => {
    const wrapper = mountCard({ ...baseHw, status: 'submitted' }, 'volunteer')
    expect(wrapper.find('[data-test="undo-quest-btn"]').exists()).toBe(false)
  })
})
