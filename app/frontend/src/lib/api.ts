/**
 * Standalone API client — drop-in replacement for @metagptx/web-sdk.
 *
 * For standalone deployment, set VITE_API_BASE_URL in your .env file
 * to point to your backend server (e.g., http://localhost:8000).
 * If the frontend is served from the same origin as the backend,
 * leave it empty (relative URLs will work).
 */

const getBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL || '';
};

interface InvokeParams {
  url: string;
  method: string;
  data?: any;
}

interface StorageUploadParams {
  bucket_name: string;
  object_key: string;
  file: File;
}

interface StorageDownloadParams {
  bucket_name: string;
  object_key: string;
}

const apiCall = {
  async invoke({ url, method, data }: InvokeParams): Promise<any> {
    const baseUrl = getBaseUrl();
    const upperMethod = method.toUpperCase();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const options: RequestInit = { method: upperMethod, headers };

    if (upperMethod !== 'GET' && data && Object.keys(data).length > 0) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${baseUrl}${url}`, options);

    if (!response.ok) {
      const error: any = new Error(`HTTP ${response.status}`);
      error.status = response.status;
      error.response = { status: response.status };
      throw error;
    }

    const result = await response.json();
    return { data: result };
  },
};

const storage = {
  async upload({ bucket_name, object_key, file }: StorageUploadParams): Promise<any> {
    const baseUrl = getBaseUrl();

    // Use admin upload-file endpoint (handles presigned URL flow server-side)
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket_name', bucket_name);
    formData.append('object_key', object_key);

    const response = await fetch(`${baseUrl}/api/v1/admin/upload-file`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header — browser sets it with boundary for FormData
    });

    if (!response.ok) throw new Error('Upload failed');
    const result = await response.json();
    return { object_key: result.object_key || object_key };
  },

  async getDownloadUrl({ bucket_name, object_key }: StorageDownloadParams): Promise<any> {
    const baseUrl = getBaseUrl();

    const response = await fetch(`${baseUrl}/api/v1/admin/download-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket_name, object_key }),
    });

    if (!response.ok) throw new Error('Failed to get download URL');
    const result = await response.json();
    return { data: { download_url: result.download_url } };
  },
};

const auth = {
  login() {
    // In standalone mode, redirect to home page.
    // Admin authentication is handled separately via /api/v1/admin/login
    window.location.href = '/';
  },
};

export const client = { apiCall, storage, auth };