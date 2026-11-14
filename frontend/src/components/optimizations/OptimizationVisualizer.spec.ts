import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import OptimizationVisualizer from './OptimizationVisualizer.vue'

describe('OptimizationVisualizer', () => {
  it('renders the fabric image beneath placements in fabric coordinates', () => {
    const wrapper = mount(OptimizationVisualizer, {
      props: {
        imageUrl: 'https://example.com/fabric.jpg',
        fabricWidthMm: 100,
        fabricLengthMm: 200,
        fabricBoundary: [
          [5, 10],
          [95, 10],
          [90, 190],
          [10, 190],
        ],
        placements: [
          {
            patternPieceId: 1,
            x: 10,
            y: 20,
            polygon: [
              [10, 20],
              [30, 20],
              [30, 40],
              [10, 40],
            ],
          },
        ],
      },
    })

    const svg = wrapper.get('svg')
    const image = svg.get('image')
    const clippedGroup = svg.get('g[clip-path]')
    const placementPolygon = clippedGroup.get('polygon')
    const fabricPolygon = svg.findAll('polygon')[2]
    const layers = Array.from(clippedGroup.element.children)

    expect(image.attributes()).toMatchObject({
      href: 'https://example.com/fabric.jpg',
      x: '0',
      y: '-200',
      width: '100',
      height: '200',
      transform: 'scale(1, -1)',
      opacity: '0.55',
    })
    expect(clippedGroup.attributes('clip-path')).toMatch(/^url\(#.+\)$/)
    expect(svg.attributes('viewBox')).toBe('0.5 1 99 198')
    expect(fabricPolygon?.attributes('points')).toBe('5,10 95,10 90,190 10,190')
    expect(placementPolygon.attributes('points')).toBe('10,20 30,20 30,40 10,40')
    expect(layers.map((layer) => layer.tagName.toLowerCase())).toEqual(['image', 'polygon'])
  })

  it('keeps out-of-bounds placements from expanding the fabric viewport', () => {
    const wrapper = mount(OptimizationVisualizer, {
      props: {
        fabricWidthMm: 100,
        fabricLengthMm: 200,
        placements: [
          {
            patternPieceId: 1,
            x: 90,
            y: 180,
            polygon: [
              [90, 180],
              [120, 180],
              [120, 220],
              [90, 220],
            ],
          },
        ],
      },
    })

    expect(wrapper.get('svg').attributes('viewBox')).toBe('-5 -10 110 220')
    expect(wrapper.get('g[clip-path]').attributes('clip-path')).toMatch(/^url\(#.+\)$/)
  })

  it('shows the fabric outline even when no pieces were placed', () => {
    const wrapper = mount(OptimizationVisualizer, {
      props: {
        fabricBoundary: [
          [0, 0],
          [100, 0],
          [80, 200],
          [20, 200],
        ],
        placements: [],
      },
    })

    expect(wrapper.find('svg image').exists()).toBe(false)
    expect(wrapper.find('svg polygon').attributes('points')).toBe('0,0 100,0 80,200 20,200')
    expect(wrapper.findAll('g[clip-path] polygon')).toHaveLength(0)
  })
})
