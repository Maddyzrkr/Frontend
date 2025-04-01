/**
 * Network utility functions for handling API requests with timeouts and error handling
 */

/**
 * Performs a network request with timeout protection
 * @param fetchPromise The original fetch promise
 * @param timeoutMs Timeout in milliseconds
 * @param errorMessage Custom error message for timeout
 * @returns Promise with the fetch result or timeout error
 */
export const safeNetworkRequest = <T>(
  fetchPromise: Promise<T>,
  timeoutMs: number = 15000,
  errorMessage: string = 'Network request timed out'
): Promise<T> => {
  // Create a timeout promise that rejects after specified time
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timeoutId = setTimeout(() => {
      clearTimeout(timeoutId);
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  // Race the fetch against the timeout
  return Promise.race([fetchPromise, timeoutPromise]);
};

/**
 * Wraps fetch with timeout and error handling
 * @param url URL to fetch from
 * @param options Fetch options
 * @param timeoutMs Timeout in milliseconds
 * @returns Promise with fetch result or error
 */
export const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 15000
): Promise<Response> => {
  try {
    return await safeNetworkRequest(
      fetch(url, options),
      timeoutMs,
      `Request to ${url} timed out after ${timeoutMs}ms`
    );
  } catch (error) {
    // Re-throw with additional context
    if (error instanceof Error) {
      if (error.message.includes('timed out')) {
        throw new Error(`Network timeout: ${error.message}`);
      } else {
        throw new Error(`Network error: ${error.message}`);
      }
    }
    throw new Error('Unknown network error occurred');
  }
};

/**
 * Handles API responses consistently
 * @param response Fetch response
 * @returns Promise with parsed JSON data or error
 */
export const handleApiResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    // Try to get error details from response
    try {
      const errorData = await response.json();
      throw new Error(
        errorData.message || 
        `API error: ${response.status} ${response.statusText}`
      );
    } catch (e) {
      // If we can't parse the error, just throw a generic one
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
  }
  
  try {
    // Parse the successful response
    return await response.json() as T;
  } catch (parseError) {
    console.error('Error parsing JSON response:', parseError);
    throw new Error('Invalid JSON response from server');
  }
};

/**
 * Complete function to make an API request with error handling, timeout, and retries
 * @param url URL to fetch from
 * @param options Fetch options
 * @param timeoutMs Timeout in milliseconds
 * @param maxRetries Maximum number of retry attempts
 * @returns Promise with parsed response data
 */
export const apiRequest = async <T>(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 15000,
  maxRetries: number = 1
): Promise<T> => {
  let lastError: Error | null = null;
  const requestStartTime = Date.now();
  
  // Log that we're starting the request
  const urlWithoutParams = url.split('?')[0];
  console.log(`[API Request] Starting request to ${urlWithoutParams}`);
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // If not the first attempt, add a small delay with exponential backoff
      if (attempt > 0) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Cap at 10 seconds
        console.log(`[API Request] Attempt ${attempt+1}/${maxRetries+1}, waiting ${delayMs}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        console.log(`[API Request] Attempt ${attempt+1}/${maxRetries+1}`);
      }
      
      // If we've spent too much time already on retries, don't attempt another one
      const timeSpent = Date.now() - requestStartTime;
      if (timeSpent > timeoutMs) {
        console.warn(`[API Request] Already spent ${timeSpent}ms, exceeding timeout of ${timeoutMs}ms`);
        throw new Error(`Total retry time exceeded timeout of ${timeoutMs}ms`);
      }
      
      // Calculate remaining timeout for this attempt
      const remainingTimeout = Math.max(timeoutMs - timeSpent, 5000); // At least 5 seconds
      
      const response = await fetchWithTimeout(url, options, remainingTimeout);
      const result = await handleApiResponse<T>(response);
      
      // Log success
      console.log(`[API Request] Success after ${attempt+1} attempt(s), took ${Date.now() - requestStartTime}ms`);
      
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      const timeSpent = Date.now() - requestStartTime;
      console.error(`[API Request Error - Attempt ${attempt+1}/${maxRetries+1}] after ${timeSpent}ms:`, lastError.message);
      
      // If this is our last attempt, rethrow the error
      if (attempt === maxRetries) {
        console.error(`[API Request] Failed after ${maxRetries+1} attempts, giving up`);
        throw lastError;
      }
      
      // If we have a network error, adjust retries based on error type
      if (lastError.message.includes('Network request timeout') || 
          lastError.message.includes('network timeout') ||
          lastError.message.includes('Failed to fetch') ||
          lastError.message.includes('Network error')) {
        console.warn('[API Request] Network error detected, will retry');
      }
      
      // If we get a 429 or 500+ error, also retry with longer backoff
      if (lastError.message.includes('429') || 
          lastError.message.match(/5\d\d/)) {
        const extraDelay = 1000 * (attempt + 1);
        console.warn(`[API Request] Server error (429/5xx), adding ${extraDelay}ms extra delay`);
        await new Promise(resolve => setTimeout(resolve, extraDelay));
      }
    }
  }
  
  // This should never be reached due to throw above, but TypeScript needs it
  throw lastError || new Error('Unknown error in API request');
};

/**
 * Helper to format query parameters
 * @param params Object with query parameters
 * @returns URL-encoded query string
 */
export const formatQueryParams = (params: Record<string, any>): string => {
  return Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      if (typeof value === 'object') {
        return `${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(value))}`;
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join('&');
};

// Add default export with all network util functions
export default {
  safeNetworkRequest,
  fetchWithTimeout,
  handleApiResponse,
  apiRequest,
  formatQueryParams
}; 