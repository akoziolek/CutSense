export const formatCardDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

export const formatAreaM2 = (areaMm2: number) =>
  `${(areaMm2 / 1_000_000).toFixed(2).replace('.', ',')} m²`
