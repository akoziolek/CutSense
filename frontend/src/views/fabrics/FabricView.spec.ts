import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, type PropType } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from '@/api/client'
import type { MetaItem } from '@/components/common/DetailsCard.vue'
import type { NameTag } from '@/types/fabric'
import FabricView from './FabricView.vue'

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

const ImagePreviewStub = defineComponent({
  props: {
    src: String,
    alt: String,
    points: { type: Array as PropType<{ pctX: number; pctY: number }[]>, default: () => [] },
  },
  setup(props) {
    return () =>
      h('img', {
        src: props.src,
        alt: props.alt,
        'data-points': JSON.stringify(props.points),
      })
  },
})

const DetailsCardStub = defineComponent({
  props: {
    description: String,
    tags: { type: Array as PropType<NameTag[]>, default: () => [] },
    metaItems: { type: Array as PropType<MetaItem[]>, default: () => [] },
  },
  setup(props) {
    return () =>
      h('section', [
        props.description ? h('p', props.description) : null,
        ...props.tags.map((tag) => h('span', { key: tag.id }, tag.name)),
        ...props.metaItems.map((item) => h('p', `${item.label}: ${item.value}`)),
      ])
  },
})

const ErrorStateStub = defineComponent({
  props: { title: String, message: String },
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

const mountView = (id = 'fabric-1') =>
  mount(FabricView, {
    props: { id },
    global: {
      stubs: {
        GridLayout: GridLayoutStub,
        PageHeader: PageHeaderStub,
        ImagePreview: ImagePreviewStub,
        DetailsCard: DetailsCardStub,
        ErrorState: ErrorStateStub,
        Button: ButtonStub,
        RouterLink: RouterLinkStub,
        Skeleton: SkeletonStub,
      },
    },
  })

const fabric = {
  id: 1,
  name: 'Linen',
  description: 'Natural linen fabric',
  pictureUrl: 'https://example.com/linen.jpg',
  tags: [
    { id: 1, name: 'linen' },
    { id: 2, name: 'natural' },
  ],
  createdAt: '2025-02-03T00:00:00.000Z',
  area: 12.5,
  boundary: [
    { x: 10, y: 40 },
    { x: 50, y: 40 },
    { x: 50, y: 20 },
    { x: 10, y: 20 },
  ],
  imageWidthCm: 100,
  imageHeightCm: 80,
}

afterEach(() => {
  apiMock.mockReset()
  vi.useRealTimers()
})

describe('FabricView', () => {
  it('loads and displays the fabric details', async () => {
    apiMock.mockResolvedValue(fabric)

    const wrapper = mountView('fabric/one')
    await flushPromises()

    expect(apiMock).toHaveBeenCalledWith('/fabrics/fabric%2Fone')
    expect(wrapper.get('h1').text()).toBe('Linen')
    expect(wrapper.get('img').attributes()).toMatchObject({
      src: fabric.pictureUrl,
      alt: fabric.name,
    })
    expect(JSON.parse(wrapper.get('img').attributes('data-points') ?? '[]')).toEqual([
      { pctX: 10, pctY: 50 },
      { pctX: 50, pctY: 50 },
      { pctX: 50, pctY: 75 },
      { pctX: 10, pctY: 75 },
    ])
    expect(wrapper.findComponent(DetailsCardStub).props('tags')).toEqual(fabric.tags)
    expect(wrapper.text()).toContain(fabric.description)
    expect(wrapper.text()).toContain('linen')
    expect(wrapper.text()).toContain('natural')
    expect(wrapper.text()).toContain(`Added: ${new Date(fabric.createdAt).toLocaleDateString()}`)
    expect(wrapper.text()).toContain('Area: 12.50 m²')
  })

  it('shows a placeholder when the fabric has no image', async () => {
    apiMock.mockResolvedValue({ ...fabric, pictureUrl: undefined })

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('No fabric image available')
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('shows a skeleton when loading takes longer than the delay', async () => {
    let resolveFetch!: (value: typeof fabric) => void
    apiMock.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve as (value: typeof fabric) => void
      }),
    )
    vi.useFakeTimers()

    const wrapper = mountView()
    await vi.advanceTimersByTimeAsync(150)
    await flushPromises()

    expect(wrapper.find('[data-testid="skeleton"]').exists()).toBe(true)

    resolveFetch(fabric)
    await flushPromises()

    expect(wrapper.find('[data-testid="skeleton"]').exists()).toBe(false)
    expect(wrapper.get('h1').text()).toBe('Linen')
  })

  it('shows the API error and retries the request', async () => {
    apiMock
      .mockRejectedValueOnce(
        new ApiError(404, {
          statusCode: 404,
          errorCode: 'NOT_FOUND',
          message: 'Fabric not found',
        }),
      )
      .mockResolvedValueOnce(fabric)

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Unable to load fabric')
    expect(wrapper.text()).toContain('Fabric not found')
    expect(wrapper.find('a[href="/fabrics"]').exists()).toBe(true)

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(apiMock).toHaveBeenCalledTimes(2)
    expect(wrapper.get('h1').text()).toBe('Linen')
  })

  it('does not display an outdated response after the ID changes', async () => {
    let resolveFirstFetch!: (value: typeof fabric) => void
    apiMock
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirstFetch = resolve as (value: typeof fabric) => void
        }),
      )
      .mockResolvedValueOnce({ ...fabric, id: 2, name: 'Cotton' })

    const wrapper = mountView('first')
    await wrapper.setProps({ id: 'second' })
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Cotton')

    resolveFirstFetch({ ...fabric, name: 'Outdated fabric' })
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Cotton')
    expect(apiMock).toHaveBeenNthCalledWith(1, '/fabrics/first')
    expect(apiMock).toHaveBeenNthCalledWith(2, '/fabrics/second')
  })
})
