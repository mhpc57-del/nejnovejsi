import { API } from '../App';

/**
 * Converts a stored image path to a full URL.
 * Handles: full URLs, /api/uploads/..., /uploads/..., uploads/..., null, 'None'
 */
export const getImageUrl = (url) => {
  if (!url || url === 'None' || url === 'null') return null;
  if (url.startsWith('http')) return url;
  const path = url.startsWith('/api/') ? url : url.startsWith('/') ? `/api${url}` : `/api/${url}`;
  return `${API.replace('/api', '')}${path}`;
};
