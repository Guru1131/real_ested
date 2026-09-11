/**
 * Image Helper Utility
 * Formats image URLs safely across dev and production server environments
 */

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80';

export const formatImageUrl = (fileUrl) => {
  if (!fileUrl) {
    return FALLBACK_IMAGE;
  }

  // Absolute URLs (Unsplash, HTTP/HTTPS, Data URIs)
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('data:')) {
    return fileUrl;
  }

  // Clean path
  let cleanPath = String(fileUrl).trim().replace(/^\/+/, '');

  // Strip backend/ prefix if present in stored string
  if (cleanPath.startsWith('backend/uploads/')) {
    cleanPath = cleanPath.replace(/^backend\//, '');
  }

  // Prepend uploads/ if missing
  if (!cleanPath.startsWith('uploads/')) {
    cleanPath = `uploads/${cleanPath}`;
  }

  // Safely URL-encode each segment of the path (handling spaces, ampersands, special chars)
  const encodedSegments = cleanPath.split('/').map(segment => {
    try {
      return encodeURIComponent(decodeURIComponent(segment));
    } catch (err) {
      return encodeURIComponent(segment);
    }
  });

  return `/${encodedSegments.join('/')}`;
};

export const handleImageError = (e, customFallback = FALLBACK_IMAGE) => {
  if (e && e.target && e.target.src !== customFallback) {
    e.target.onerror = null; // Prevent infinite loop
    e.target.src = customFallback;
  }
};
