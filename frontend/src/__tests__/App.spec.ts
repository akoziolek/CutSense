import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import App from '@/App.vue'

describe('App', () => {
  it('renders properly with AuthModal and RouterView', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          AuthModal: true,
          RouterView: true,
        },
      },
    })

    expect(wrapper.find('main').exists()).toBe(true)

    expect(wrapper.findComponent({ name: 'AuthModal' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'RouterView' }).exists()).toBe(true)
  })
})
