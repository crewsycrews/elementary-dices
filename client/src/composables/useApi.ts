import { api } from '@elementary-dices/shared/api'
import { useUIStore } from '@/stores/ui'

/**
 * Composable for making API calls with automatic loading/error handling
 * Wraps Eden Treaty API client
 */
export function useApi() {
  const uiStore = useUIStore()

  /**
   * Wrapper function for API calls that handles loading states and errors
   * @param call - Promise from Eden Treaty API call
   * @param options - Configuration options
   * @returns The API response data
   */
  async function apiCall<T>(
    call: Promise<T>,
    options?: {
      silent?: boolean // Don't show loading indicator
      errorMessage?: string // Custom error message
      successMessage?: string // Show success toast
    }
  ): Promise<T> {
    try {
      if (!options?.silent) {
        uiStore.setLoading(true)
      }

      const result = await call

      if (options?.successMessage) {
        uiStore.showToast(options.successMessage, 'success')
      }

      return result
    } catch (error) {
      const errorMessage = options?.errorMessage ||
        (error instanceof Error ? error.message : 'An error occurred')

      uiStore.showError(errorMessage)
      uiStore.showToast(errorMessage, 'error')

      throw error
    } finally {
      if (!options?.silent) {
        uiStore.setLoading(false)
      }
    }
  }

  return {
    api,
    apiCall,
  }
}
