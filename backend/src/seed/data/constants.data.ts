import type { LocalizedText } from '../../db/schema/schema.js';

export const algorithmSeeds: {
  name: LocalizedText;
  description: LocalizedText;
}[] = [
  {
    name: {
      pl: 'Szybki i prosty',
      en: 'Quick and Simple',
    },
    description: {
      pl: 'Umieszcza elementy, zaczynając od największych. Idealne, gdy potrzebujesz szybkiego sprawdzenia.',
      en: 'Places pieces starting from the largest. Ideal when you need a quick, basic check.',
    },
  },
  {
    name: {
      pl: 'Dokładny i szczegółowy',
      en: 'Deep and Thorough',
    },
    description: {
      pl: 'Sprawdza każde ułożenie i obrót dla mniejszej liczby elementów, trafnie szacuje złożone wykroje.',
      en: 'Checks every placement and rotation for fewer pieces, smartly estimates complex patterns.',
    },
  },
];

export const patternTagNames: LocalizedText[] = [
  { pl: 'zima', en: 'winter' },
  { pl: 'wiosna', en: 'spring' },
  { pl: 'lato', en: 'summer' },
  { pl: 'jesień', en: 'autumn' },
  { pl: 'sukienki', en: 'dresses' },
  { pl: 'spódnice', en: 'skirts' },
  { pl: 'spodnie', en: 'trousers' },
  { pl: 'bluzki', en: 'blouses' },
  { pl: 'koszule', en: 'shirts' },
  { pl: 'okrycia wierzchnie', en: 'outerwear' },
  { pl: 'bielizna', en: 'undergarments' },
  { pl: 'akcesoria', en: 'accessories' },
];

export const fabricTagNames: LocalizedText[] = [
  { pl: 'syntetyczne', en: 'synthetic' },
  { pl: 'naturalne', en: 'natural' },
  { pl: 'półsyntetyczne', en: 'semi-synthetic' },
  { pl: 'bawełna', en: 'cotton' },
  { pl: 'len', en: 'linen' },
  { pl: 'wełna', en: 'wool' },
  { pl: 'jedwab', en: 'silk' },
  { pl: 'wiskoza', en: 'viscose' },
  { pl: 'poliester', en: 'polyester' },
  { pl: 'dzianina', en: 'knit' },
  { pl: 'tkanina', en: 'woven' },
  { pl: 'kaszmir', en: 'cashmere' },
  { pl: 'mieszanka', en: 'blend' },
  { pl: 'skóra', en: 'leather' },
  { pl: 'elastan', en: 'elastane' },
  { pl: 'sztruks', en: 'corduroy' },
  { pl: 'aksamit', en: 'velvet' },
];
