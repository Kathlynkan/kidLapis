// Owner: Yu Xuan
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import WeekdayDots from '@/components/WeekdayDots.vue'

describe('WeekdayDots', () => {
  it('shows five red days and 0/5 when the child has no sessions', () => {
    const wrapper = mount(WeekdayDots, { props: { schedule: [] } })

    expect(wrapper.findAll('.day')).toHaveLength(5) // Mo Tu We Th Fr
    expect(wrapper.findAll('.day.is-off')).toHaveLength(5)
    expect(wrapper.text()).toContain('0/5')
    expect(wrapper.attributes('aria-label')).toBe('No volunteer on any weekday')
  })

  it('only counts ACCEPTED sessions; pending is amber, declined is ignored', () => {
    const wrapper = mount(WeekdayDots, {
      props: {
        schedule: [
          { volunteerId: 'u_vol1', day: 'Mon', time: '16:00' }, // no status = accepted (seed data)
          { volunteerId: 'u_vol1', day: 'Wed', time: '16:00', status: 'accepted' },
          { volunteerId: 'u_vol3', day: 'Fri', time: '16:00', status: 'pending' },
          { volunteerId: 'u_vol2', day: 'Tue', time: '16:00', status: 'declined' },
        ],
      },
    })
    const days = wrapper.findAll('.day')

    expect(wrapper.text()).toContain('2/5') // Mon + Wed only
    expect(days[0].classes()).toContain('is-on') // Mon
    expect(days[1].classes()).toContain('is-off') // Tue: declined doesn't count
    expect(days[2].classes()).toContain('is-on') // Wed
    expect(days[4].classes()).toContain('is-pending') // Fri: waiting for the volunteer
    expect(wrapper.attributes('aria-label')).toContain('waiting for a volunteer to accept Fri')
  })

  it('ignores weekend sessions in the weekday count', () => {
    const wrapper = mount(WeekdayDots, {
      props: { schedule: [{ volunteerId: 'u_vol1', day: 'Sat', time: '10:00' }] },
    })
    expect(wrapper.text()).toContain('0/5')
  })

  it('updates by itself when the schedule changes (reactive)', async () => {
    const wrapper = mount(WeekdayDots, { props: { schedule: [] } })
    expect(wrapper.text()).toContain('0/5')

    await wrapper.setProps({ schedule: [{ volunteerId: 'u_vol3', day: 'Thu', time: '16:00' }] })

    expect(wrapper.text()).toContain('1/5')
    expect(wrapper.findAll('.day')[3].classes()).toContain('is-on') // Thu turned green
  })
})