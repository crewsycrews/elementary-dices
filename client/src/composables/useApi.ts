import { api } from "@elementary-dices/shared/api";
import { useUIStore } from "@/stores/ui";
import type { EdenResponse } from "@elementary-dices/shared";

/**
 * Wrapper function for API calls that handles loading states and errors
 * @param call - Promise from Eden Treaty API call
 * @param options - Configuration options
 * @returns The Eden Treaty response (includes .data, .error, .status)
 *
 * @example
 * const response = await apiCall(
 *   api.api.users.get()
 * )
 * console.log(response.data.users) // Fully typed!
 */
async function apiCall<T extends Promise<any>>(
  call: T,
  options?: {
    silent?: boolean; // Don't show loading indicator
    errorMessage?: string; // Custom error message
    successMessage?: string; // Show success toast
  },
): Promise<Awaited<T>> {
  const uiStore = useUIStore();

  try {
    if (!options?.silent) {
      uiStore.setLoading(true);
    }

    const result = await call;

    // Handle Eden Treaty error responses
    if (result.error) {
      console.error("API error response:", result.error);
      throw new Error(result.error.value.error || "API request failed");
    }

    if (options?.successMessage) {
      uiStore.showToast(options.successMessage, "success");
    }

    return result;
  } catch (error) {
    const errorMessage =
      options?.errorMessage ||
      (error instanceof Error ? error.message : "An error occurred");

    uiStore.showError(errorMessage);
    uiStore.showToast(errorMessage, "error");

    throw error;
  } finally {
    if (!options?.silent) {
      uiStore.setLoading(false);
    }
  }
}

/**
 * Composable for making API calls with automatic loading/error handling
 * Wraps Eden Treaty API client
 */
export function useApi(): {
  api: typeof api;
  apiCall: typeof apiCall;
} {
  return {
    api,
    apiCall,
  };
}
