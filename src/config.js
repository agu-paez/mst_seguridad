const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const getApiUrl = (path = '') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${normalizedPath}` : normalizedPath;
};

export const getImageUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return getApiUrl(url);
  return getApiUrl(`/${url}`);
};

export const API_BASE_URL = API_BASE;
