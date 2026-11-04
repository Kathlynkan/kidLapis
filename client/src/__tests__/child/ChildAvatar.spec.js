import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChildAvatar from '@/components/ChildAvatar.vue'

describe('ChildAvatar', () => {
  it('renders an img when avatar is a file path starting with /', () => {
    const wrapper = mount(ChildAvatar, { props: { avatar: '/photos/mia.webp' } })
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('/photos/mia.webp')
  })

  it('renders text (emoji) when avatar does not start with /', () => {
    const wrapper = mount(ChildAvatar, { props: { avatar: '🌟' } })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('🌟')
  })

  it('renders nothing visible when avatar is an empty string', () => {
    const wrapper = mount(ChildAvatar, { props: { avatar: '' } })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })
})
