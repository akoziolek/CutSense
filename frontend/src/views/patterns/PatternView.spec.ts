import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, type PropType } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from '@/api/client'
interface MetaItem {
  label?: string
  value?: string
}
import PatternView from './PatternView.vue'

vi.mock('@/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/client')>()
  return { ...actual, api: vi.fn() }
})

const apiMock = vi.mocked(api)

const PageHeaderStub = defineComponent({
  props: { title: { type: String, default: '' } },
  setup(props) {
    return () => h('h1', props.title)
  },
})

const DetailsCardStub = defineComponent({
  props: {
    description: String,
    tags: { type: Array as PropType<string[]>, default: () => [] },
    metaItems: { type: Array as PropType<MetaItem[]>, default: () => [] },
  },
  setup(props) {
    return () =>
      h('section', [
        props.description ? h('p', props.description) : null,
        ...props.tags.map((tag) => h('span', tag)),
        ...props.metaItems.map((item) => h('p', `${item.label}: ${item.value}`)),
      ])
  },
})

const PatternPiecesCarouselStub = defineComponent({
  props: { pieces: { type: Array as PropType<unknown[]>, default: () => [] } },
  setup(props) {
    return () => h('div', { 'data-testid': 'carousel', 'data-count': props.pieces.length })
  },
})

const ErrorStateStub = defineComponent({
  props: { title: String, message: String, code: String },
  setup(props, { slots }) {
    return () => h('section', [h('h2', props.title), h('p', props.message), slots.actions?.()])
  },
})

const ButtonStub = defineComponent({
  setup(_, { slots }) {
    return () => h('button', slots.default?.())
  },
})

const RouterLinkStub = defineComponent({
  props: { to: { type: [String, Object], required: true } },
  setup(props, { slots }) {
    return () =>
      h('a', { href: typeof props.to === 'string' ? props.to : undefined }, slots.default?.())
  },
})

const SkeletonStub = defineComponent({
  setup() {
    return () => h('div', { 'data-testid': 'skeleton' })
  },
})

const GridLayoutStub = defineComponent({
  setup(_, { slots }) {
    return () => h('div', slots.default?.())
  },
})

const mountView = (id = '1') =>
  mount(PatternView, {
    props: { id },
    global: {
      stubs: {
        GridLayout: GridLayoutStub,
        PageHeader: PageHeaderStub,
        DetailsCard: DetailsCardStub,
        PatternPiecesCarousel: PatternPiecesCarouselStub,
        ErrorState: ErrorStateStub,
        Button: ButtonStub,
        RouterLink: RouterLinkStub,
        Skeleton: SkeletonStub,
      },
    },
  })

const pattern = {
  id: 1,
  name: 'Flowy shirt',
  description: 'Relaxed-fit summer shirt',
  size: 'XS',
  visibility: 'PRIVATE' as const,
  starCount: 5,
  starAverage: '4.43',
  userId: 3,
  createdAt: '2026-08-10T00:00:00.000Z',
  tags: ['summer', 'tops'],
  author: { id: 3, nickname: 'Lily43' },
  pieces: [
    { id: 1, points: [[0, 0], [10, 0], [10, 5], [0, 0]] },
    { id: 2, points: [[0, 0], [4, 0], [4, 4], [0, 0]] },
  ],
}

afterEach(() => {
  apiMock.mockReset()
  vi.useRealTimers()
})

describe('PatternView', () => {
  it('loads and displays the pattern details', async () => {
    apiMock.mockResolvedValue(pattern)

    const wrapper = mountView('pattern/one')
    await flushPromises()

    expect(apiMock).toHaveBeenCalledWith('/patterns/pattern%2Fone')
    expect(wrapper.get('h1').text()).toBe('Flowy shirt')
    expect(wrapper.text()).toContain('Author: Lily43')
    expect(wrapper.text()).toContain(pattern.description)
    expect(wrapper.text()).toContain('summer')
    expect(wrapper.text()).toContain('tops')
    expect(wrapper.text()).toContain(`Added: ${new Date(pattern.createdAt).toLocaleDateString()}`)
    expect(wrapper.text()).toContain('Size: XS')
    expect(wrapper.text()).toContain('Visibility: Private')
  })

  it('passes all pattern pieces to the carousel', async () => {
    apiMock.mockResolvedValue(pattern)

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.get('[data-testid="carousel"]').attributes('data-count')).toBe('2')
  })

  it('shows public visibility for a public pattern', async () => {
    apiMock.mockResolvedValue({ ...pattern, visibility: 'PUBLIC' })

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Visibility: Public')
  })

  it('passes empty tags and no description to the details card', async () => {
    apiMock.mockResolvedValue({ ...pattern, description: undefined, tags: [] })

    const wrapper = mountView()
    await flushPromises()

    const card = wrapper.findComponent(DetailsCardStub)
    expect(card.props('tags')).toEqual([])
    expect(card.props('description')).toBeUndefined()
  })

  it('shows a skeleton when loading takes longer than the delay', async () => {
    let resolveFetch!: (value: typeof pattern) => void
    apiMock.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve as (value: typeof pattern) => void
      }),
    )
    vi.useFakeTimers()

    const wrapper = mountView()
    await vi.advanceTimersByTimeAsync(150)
    await flushPromises()

    expect(wrapper.find('[data-testid="skeleton"]').exists()).toBe(true)

    resolveFetch(pattern)
    await flushPromises()

    expect(wrapper.find('[data-testid="skeleton"]').exists()).toBe(false)
    expect(wrapper.get('h1').text()).toBe('Flowy shirt')
  })

  it('shows the API error and retries the request', async () => {
    apiMock
      .mockRejectedValueOnce(
        new ApiError(404, {
          statusCode: 404,
          errorCode: 'RESOURCE_NOT_FOUND',
          message: 'Pattern with ID 6 not found',
        }),
      )
      .mockResolvedValueOnce(pattern)

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Unable to load pattern')
    expect(wrapper.text()).toContain('Pattern with ID 6 not found')
    expect(wrapper.find('a[href="/patterns"]').exists()).toBe(true)

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(apiMock).toHaveBeenCalledTimes(2)
    expect(wrapper.get('h1').text()).toBe('Flowy shirt')
  })

  it('shows a dedicated message without retry for a private pattern of another user', async () => {
    apiMock.mockRejectedValue(
      new ApiError(403, {
        statusCode: 403,
        errorCode: 'ACCESS_DENIED',
        message: 'This pattern is private and belongs to another user.',
      }),
    )

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('This pattern is private')
    expect(wrapper.text()).toContain('This pattern is private and belongs to another user.')
    expect(wrapper.text()).not.toContain('Try again')
    expect(wrapper.find('a[href="/patterns"]').exists()).toBe(true)
  })

  it('shows a generic message for a non-API error', async () => {
    apiMock.mockRejectedValue(new Error('network down'))

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Could not load pattern. Please try again.')
  })

  it('does not display an outdated response after the ID changes', async () => {
    let resolveFirstFetch!: (value: typeof pattern) => void
    apiMock
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirstFetch = resolve as (value: typeof pattern) => void
        }),
      )
      .mockResolvedValueOnce({ ...pattern, id: 2, name: 'Wrap dress' })

    const wrapper = mountView('first')
    await wrapper.setProps({ id: 'second' })
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Wrap dress')

    resolveFirstFetch({ ...pattern, name: 'Outdated pattern' })
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Wrap dress')
    expect(apiMock).toHaveBeenNthCalledWith(1, '/patterns/first')
    expect(apiMock).toHaveBeenNthCalledWith(2, '/patterns/second')
  })
})