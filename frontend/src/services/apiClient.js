/**
 * Core HTTP Request Wrapper and Authentication Header utilities.
 */

export const getAuthToken = () => {
  return typeof window !== 'undefined' ? localStorage.getItem('agentwatch_token') : null;
};

export const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'ngrok-skip-browser-warning': 'true',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const handleAuthFailure = status => {
  if (status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('agentwatch_token');
    window.location.replace('/login.html');
  }
};

export const request = async (url, options = {}) => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Device is currently offline (navigator.onLine is false)');
  }

  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(
        () => controller.abort(new Error('Request timed out after 15 seconds')),
        options.timeoutMs || 15000
      )
    : null;

  let res;
  try {
    const fetchOptions = {
      ...options,
      headers,
      signal: options.signal || (controller ? controller.signal : undefined),
    };
    res = await fetch(url, fetchOptions);
  } catch (networkErr) {
    if (networkErr.name === 'AbortError') {
      throw new Error(`Request timed out: ${url}`);
    }
    throw new Error(`Network connection error: ${networkErr.message || 'Server unreachable'}`);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  if (res.status === 401) {
    handleAuthFailure(res.status);
    throw new Error('Authentication required. Session expired or missing credentials.');
  }

  if (!res.ok) {
    let errorDetail = `HTTP ${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      errorDetail = data.detail || data.reason || data.error || errorDetail;
    } catch {
      try {
        const text = await res.text();
        if (text && text.length < 200) errorDetail = text;
      } catch {}
    }
    const err = new Error(errorDetail);
    err.status = res.status;
    throw err;
  }

  return res;
};
