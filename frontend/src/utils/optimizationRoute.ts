export const optimizationRoute = (item: { id: number; memberIds: number[] }) =>
  item.memberIds.length > 1
    ? { name: 'OptimizationGroup', query: { ids: item.memberIds.join(',') } }
    : { name: 'OptimizationDetails', params: { id: item.id } }