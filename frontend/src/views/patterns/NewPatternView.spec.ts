// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from '@/api/client'
import { useNewPattern } from '@/composables/patterns/useNewPattern.ts'
import NewPatternView from './NewPatternView.vue'

vi.mock('@/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/client')>()
  return { ...actual, api: vi.fn() }
})

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return { ...actual, useRouter: () => ({ push }) }
})

const apiMock = vi.mocked(api)

const passthrough = defineComponent({
  setup(_, { slots }) {
    return () => h('div', slots.default?.())
  },
})
const stub = (name: string) =>
  defineComponent({ setup: () => () => h('div', { 'data-testid': name }) })

const DialogStub = defineComponent({
  props: { open: Boolean, title: String, description: String },
  emits: ['update:open', 'confirm'],
  setup(props, { emit }) {
    return () =>
      props.open
        ? h('div', { 'data-dialog': props.title }, [
            h('p', props.description),
            h(
              'button',
              { 'data-close': props.title, onClick: () => emit('update:open', false) },
              'close',
            ),
            h('button', { 'data-confirm': props.title, onClick: () => emit('confirm') }, 'confirm'),
          ])
        : null
  },
})

const mountView = () =>
  mount(NewPatternView, {
    global: {
      stubs: {
        GridLayout: passthrough,
        PageHeader: defineComponent({
          props: { title: String },
          setup: (props) => () => h('h1', props.title),
        }),
        Button: defineComponent({
          setup:
            (_, { slots }) =>
            () =>
              h('button', slots.default?.()),
        }),
        StepSource: stub('step-source'),
        StepScale: stub('step-scale'),
        StepPieces: stub('step-pieces'),
        StepDetails: stub('step-details'),
        ConfirmDialog: DialogStub,
        MessageDialog: DialogStub,
      },
    },
  })

const action = (wrapper: ReturnType<typeof mountView>, label: string) =>
  wrapper.findAll('button').find((b) => b.text().startsWith(label))!

const addPhoto = () =>
  useNewPattern().draft.photos.push({
    id: 1,
    file: new File(['x'], 'a.jpg', { type: 'image/jpeg' }),
    url: 'blob:a',
    ratio: 1.5,
    widthCm: 95,
  })

const fillDetails = () =>
  Object.assign(useNewPattern().draft.details, { name: 'Shirt', size: 'M', visibility: 'PUBLIC' })

beforeEach(() => {
  URL.revokeObjectURL = vi.fn()
  useNewPattern().reset()
})

afterEach(() => {
  apiMock.mockReset()
  push.mockReset()
})

describe('NewPatternView', () => {
  it('starts on the source step with Next disabled until a photo is added', async () => {
    const wrapper = mountView()
    expect(wrapper.get('h1').text()).toBe('Pattern source')
    expect(action(wrapper, 'Next').attributes('disabled')).toBeDefined()

    addPhoto()
    await flushPromises()

    expect(action(wrapper, 'Next').attributes('disabled')).toBeUndefined()
  })

  it('walks through all four steps and generates the pieces after the scale step', async () => {
    addPhoto()
    const wrapper = mountView()

    await action(wrapper, 'Next').trigger('click') // 1 -> 2
    expect(wrapper.get('h1').text()).toBe('Pattern configuration')

    await action(wrapper, 'Next').trigger('click') // 2 -> 3
    expect(wrapper.get('h1').text()).toBe('Detected pieces')
    expect(useNewPattern().draft.pieces).toHaveLength(1)

    await action(wrapper, 'Next').trigger('click') // 3 -> 4
    expect(wrapper.get('h1').text()).toBe('Pattern details')
    expect(action(wrapper, 'Save').attributes('disabled')).toBeDefined()
  })

  it('enables Save only when name and size are filled', async () => {
    addPhoto()
    const wrapper = mountView()
    for (let i = 0; i < 3; i++) await action(wrapper, 'Next').trigger('click')

    fillDetails()
    await flushPromises()

    expect(action(wrapper, 'Save').attributes('disabled')).toBeUndefined()
  })

  it('sends the pattern, shows the success popup and opens the new pattern', async () => {
    apiMock.mockResolvedValue({ id: 42 })
    addPhoto()
    const wrapper = mountView()
    for (let i = 0; i < 3; i++) await action(wrapper, 'Next').trigger('click')
    fillDetails()
    await flushPromises()

    await action(wrapper, 'Save').trigger('click')
    await flushPromises()

    expect(apiMock).toHaveBeenCalledWith('/patterns', expect.objectContaining({ method: 'POST' }))
    const body = JSON.parse((apiMock.mock.calls[0]![1] as RequestInit).body as string)
    expect(body).toMatchObject({ name: 'Shirt', size: 'M', visibility: 'PUBLIC' })
    expect(body.pieces).toHaveLength(1)
    expect(wrapper.find('[data-dialog="Pattern saved"]').exists()).toBe(true)

    await wrapper.get('[data-close="Pattern saved"]').trigger('click')

    expect(push).toHaveBeenCalledWith('/patterns/42')
    expect(useNewPattern().draft.photos).toHaveLength(0)
  })

  it('shows the API validation message and keeps the draft when saving fails', async () => {
    apiMock.mockRejectedValue(
      new ApiError(400, {
        statusCode: 400,
        errorCode: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: ['Unknown tags: foo'],
      }),
    )
    addPhoto()
    const wrapper = mountView()
    for (let i = 0; i < 3; i++) await action(wrapper, 'Next').trigger('click')
    fillDetails()
    await flushPromises()

    await action(wrapper, 'Save').trigger('click')
    await flushPromises()

    const dialog = wrapper.get('[data-dialog="Unable to save pattern"]')
    expect(dialog.text()).toContain('Unknown tags: foo')
    expect(wrapper.find('[data-dialog="Pattern saved"]').exists()).toBe(false)
    expect(useNewPattern().draft.details.name).toBe('Shirt')
  })

  it('shows a generic message for a network error', async () => {
    apiMock.mockRejectedValue(new Error('network down'))
    addPhoto()
    const wrapper = mountView()
    for (let i = 0; i < 3; i++) await action(wrapper, 'Next').trigger('click')
    fillDetails()
    await flushPromises()

    await action(wrapper, 'Save').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-dialog="Unable to save pattern"]').text()).toContain(
      'Could not save the pattern',
    )
  })

  it('asks for confirmation on Cancel when there is data, and discards on confirm', async () => {
    addPhoto()
    const wrapper = mountView()

    await action(wrapper, 'Cancel').trigger('click')
    expect(wrapper.find('[data-dialog="Discard unsaved changes?"]').exists()).toBe(true)

    await wrapper.get('[data-confirm="Discard unsaved changes?"]').trigger('click')

    expect(push).toHaveBeenCalledWith('/patterns')
    expect(useNewPattern().draft.photos).toHaveLength(0)
  })

  it('leaves immediately on Cancel when nothing was entered', async () => {
    const wrapper = mountView()

    await action(wrapper, 'Cancel').trigger('click')

    expect(wrapper.find('[data-dialog="Discard unsaved changes?"]').exists()).toBe(false)
    expect(push).toHaveBeenCalledWith('/patterns')
  })
})
