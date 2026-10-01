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

  const relativePath = encodedSegments.join('/');

  // If VITE_API_URL is configured (e.g. on live server), prepend base API URL
  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
  if (apiBase) {
    return `${apiBase}/${relativePath}`;
  }

  return `/${relativePath}`;
};

export const handleImageError = (e, customFallback = FALLBACK_IMAGE) => {
  if (!e || !e.target) return;
  const target = e.target;
  const currentSrc = target.getAttribute('src') || '';
  const step = parseInt(target.dataset.fallbackStep || '0', 10);

  // Path resolution fallbacks for live server environments (cPanel/subfolders/backend mounts)
  if (step === 0) {
    target.dataset.fallbackStep = '1';
    // Try adding /backend/ prefix: e.g., /uploads/foo.jpg -> /backend/uploads/foo.jpg
    if (currentSrc.includes('/uploads/') && !currentSrc.includes('/backend/uploads/')) {
      target.src = currentSrc.replace('/uploads/', '/backend/uploads/');
      return;
    }
  }

  if (step === 1) {
    target.dataset.fallbackStep = '2';
    // Try adding /api/ prefix: e.g., /uploads/foo.jpg -> /api/uploads/foo.jpg
    if (currentSrc.includes('/uploads/')) {
      target.src = currentSrc.replace(/\/backend\/uploads\/|\/uploads\//, '/api/uploads/');
      return;
    }
  }

  if (step === 2) {
    target.dataset.fallbackStep = '3';
    // Try relative path ./uploads/
    const filename = currentSrc.split('/').pop();
    if (filename) {
      target.src = `./uploads/${filename}`;
      return;
    }
  }

  // Final fallback to placeholder image
  target.onerror = null;
  target.src = customFallback;
};
