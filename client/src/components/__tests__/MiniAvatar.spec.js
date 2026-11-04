// Component test: MiniAvatar (the small round picture in the timetable).   Owner: Yu Xuan
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MiniAvatar from '../MiniAvatar.vue'

describe('MiniAvatar', () => {
  it('shows a photo when the avatar is a file path', () => {
    const wrapper = mount(MiniAvatar, { props: { person: { name: 'Ethan Wong', avatar: '/photos/ethan.webp' } } })
    expect(wrapper.find('img').attributes('src')).toBe('/photos/ethan.webp')
  })

  it('shows the emoji when the avatar is an emoji', () => {
    const wrapper = mount(MiniAvatar, { props: { person: { name: 'Meera Kumar', avatar: '🐼' } } })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('🐼')
  })

  it("shows the first letter of the name when there is no avatar", () => {
    const wrapper = mount(MiniAvatar, { props: { person: { name: 'priya Nair' } } })
    expect(wrapper.text()).toBe('P')
  })

  it('uses the size it is given', () => {
    const wrapper = mount(MiniAvatar, { props: { person: { name: 'Aisha' }, size: 32 } })
    expect(wrapper.attributes('style')).toContain('width: 32px')
  })
})