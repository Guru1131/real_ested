/**
 * Map Helper Utility
 * Extracts clean embed URL from raw Google Maps iframe HTML code or URL strings
 */

export const extractMapUrl = (input) => {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';

  // If user pasted an iframe HTML tag string, extract src attribute
  if (trimmed.includes('<iframe') || trimmed.includes('src=')) {
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Validate HTTP/HTTPS protocol
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  return '';
};
