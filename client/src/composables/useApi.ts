import { api } from "@elementary-dices/shared/api";
import { useUIStore } from "@/stores/ui";

// Track if we're currently refreshing to avoid multiple refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempt to refresh the access token
 */
async function attemptTokenRefresh(): Promise<boolean> {
  // If already refreshing, wait for that promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await api.api.users.refresh.post({});
      return response.data !== null && !response.error;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Wrapper function for API calls that handles loading states, errors, and token refresh
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
    skipAuthRetry?: boolean; // Skip token refresh retry on 401
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
      // Check for 401 Unauthorized - attempt token refresh
      if (
        result.status === 401 &&
        !options?.skipAuthRetry &&
        !isRefreshing
      ) {
        console.log("Received 401, attempting token refresh...");
        const refreshed = await attemptTokenRefresh();

        if (refreshed) {
          console.log("Token refreshed, retrying request...");
          // Retry the original request with skipAuthRetry to avoid infinite loop
          return await apiCall(call, { ...options, skipAuthRetry: true });
        } else {
          console.log("Token refresh failed, user needs to log in again");
          // Redirect to login - the router guard will handle this
          throw new Error("Session expired. Please log in again.");
        }
      }

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
