import { ref } from 'vue'
import { api } from '@/api/client'

export interface ResourceStat {
  total: number
  thisWeek: number
}

export interface UserStatistics {
  optimizations: ResourceStat
  fabrics: ResourceStat
  patterns: ResourceStat
}

export function useDashboardStatistics() {
  const statistics = ref<UserStatistics | null>(null)
  const isLoadingStats = ref(true)
  const statsLoadFailed = ref(false)

  const loadStatistics = async () => {
    isLoadingStats.value = true
    statsLoadFailed.value = false
    try {
      statistics.value = await api<UserStatistics>('/statistics')
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err)
      statsLoadFailed.value = true
    } finally {
      isLoadingStats.value = false
    }
  }

  return {
    statistics,
    isLoadingStats,
    statsLoadFailed,
    loadStatistics,
  }
}
