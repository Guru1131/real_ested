// Helper utility to generate clean SVG QR Code elements for referral IDs
export const generateQRCodeSVG = (text, size = 160) => {
  // Generate a deterministic 2D pattern matrix from the input text string
  const modules = 21;
  const cellSize = size / modules;
  
  // Basic hash function to seed pattern
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  const isPositionDetectionArea = (row, col) => {
    // Top-Left Finder Pattern
    if (row < 7 && col < 7) return true;
    // Top-Right Finder Pattern
    if (row < 7 && col >= modules - 7) return true;
    // Bottom-Left Finder Pattern
    if (row >= modules - 7 && col < 7) return true;
    return false;
  };

  const getFinderColor = (row, col) => {
    // Outer border (7x7), inner white (5x5), inner black core (3x3)
    const isTopLeft = row < 7 && col < 7;
    const isTopRight = row < 7 && col >= modules - 7;
    const isBottomLeft = row >= modules - 7 && col < 7;

    let r = row;
    let c = col;
    if (isTopRight) c = col - (modules - 7);
    if (isBottomLeft) r = row - (modules - 7);

    if (r === 0 || r === 6 || c === 0 || c === 6) return '#0f172a';
    if (r === 1 || r === 5 || c === 1 || c === 5) return '#ffffff';
    return '#0284c7'; // Primary Accent
  };

  const cells = [];

  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      let fillColor = '#0f172a';
      if (isPositionDetectionArea(row, col)) {
        fillColor = getFinderColor(row, col);
      } else {
        // Pseudo-random data module pattern based on string hash
        const val = Math.abs(Math.sin((row * 31 + col * 17 + hash) % 1000) * 10000);
        const isFilled = Math.floor(val) % 2 === 0;
        if (!isFilled) continue;
        fillColor = '#1e293b';
      }

      cells.push(
        `<rect key="${row}-${col}" x="${(col * cellSize).toFixed(2)}" y="${(row * cellSize).toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="${fillColor}" />`
      );
    }
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="background: #ffffff; padding: 10px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
      ${cells.join('')}
    </svg>
  `;
};
