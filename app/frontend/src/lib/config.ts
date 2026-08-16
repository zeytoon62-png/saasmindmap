/**
 * Runtime configuration for standalone deployment.
 *
 * Set VITE_API_BASE_URL in your .env file to point to the backend.
 * If frontend is served from the same origin (via proxy or same server),
 * leave it empty.
 */

let runtimeConfig: {
  API_BASE_URL: string;
} | null = null;

let configLoading = true;

const defaultConfig = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
};

export async function loadRuntimeConfig(): Promise<void> {
  try {
    // Try to load configuration from a config endpoint (optional)
    const response = await fetch('/api/config');
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        runtimeConfig = await response.json();
      }
    }
  } catch {
    // Config endpoint not available — use defaults (this is expected in standalone mode)
  } finally {
    configLoading = false;
  }
}

export function getConfig() {
  if (configLoading) return defaultConfig;
  if (runtimeConfig) return runtimeConfig;
  return defaultConfig;
}

export function getAPIBaseURL(): string {
  return getConfig().API_BASE_URL;
}

export const config = {
  get API_BASE_URL() {
    return getAPIBaseURL();
  },
};