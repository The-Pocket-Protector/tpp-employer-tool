/**
 * Quality Checker - Simplified
 * Analyzes frame quality for auto-capture with focus on colored card support
 */

/**
 * Convert RGBA image data to grayscale array
 * @param {ImageData} imageData - Raw image data from canvas
 * @returns {Float32Array} Grayscale values (0-255)
 */
function convertToGrayscale(imageData) {
  const data = imageData.data;
  const gray = new Float32Array(data.length / 4);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return gray;
}

/**
 * Detect card using edge detection (Sobel operator)
 * Works for any colored card by detecting edges/contrast instead of brightness
 * @param {Float32Array} gray - Pre-computed grayscale array
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {number} Confidence score (0-100)
 */
function detectCardShapeFromGray(gray, width, height) {
  const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

  let edgeCount = 0;
  const edgeThreshold = 30;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          const pixel = gray[idx];
          gx += pixel * sobelX[ky + 1][kx + 1];
          gy += pixel * sobelY[ky + 1][kx + 1];
        }
      }

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      if (magnitude > edgeThreshold) {
        edgeCount++;
      }
    }
  }

  const totalPixels = (width - 2) * (height - 2);
  const edgeDensity = edgeCount / totalPixels;

  if (edgeDensity < 0.05) {
    return 0;
  } else if (edgeDensity < 0.08) {
    return 40;
  } else if (edgeDensity <= 0.25) {
    const normalizedDensity = (edgeDensity - 0.08) / (0.25 - 0.08);
    return 60 + normalizedDensity * 40;
  } else {
    return Math.max(0, 100 - (edgeDensity - 0.25) * 200);
  }
}

/**
 * Calculate fill ratio - how much of the guide box contains content
 * @param {Float32Array} gray - Pre-computed grayscale array
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {number} Fill ratio (0-1)
 */
function calculateFillRatioFromGray(gray, width, height) {
  const cornerSize = Math.floor(Math.min(width, height) * 0.05);
  let bgBrightness = 0;
  let bgCount = 0;

  // Sample corners to estimate background brightness
  for (let y = 0; y < cornerSize; y++) {
    for (let x = 0; x < cornerSize; x++) {
      // Top-left corner
      bgBrightness += gray[y * width + x];
      bgCount++;
      // Top-right corner
      bgBrightness += gray[y * width + (width - 1 - x)];
      bgCount++;
    }
  }

  const avgBgBrightness = bgBrightness / bgCount;
  const contrastThreshold = 20;
  let contentPixels = 0;

  for (let i = 0; i < gray.length; i++) {
    if (Math.abs(gray[i] - avgBgBrightness) > contrastThreshold) {
      contentPixels++;
    }
  }

  return contentPixels / gray.length;
}

/**
 * Calculate sharpness using simplified Laplacian variance
 * @param {Float32Array} gray - Pre-computed grayscale array
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {number} Sharpness variance
 */
function calculateSharpnessFromGray(gray, width, height) {
  let variance = 0;
  const kernel = [
    [0, 1, 0],
    [1, -4, 1],
    [0, 1, 0]
  ];

  for (let y = 2; y < height - 2; y += 2) {
    for (let x = 2; x < width - 2; x += 2) {
      let sum = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          sum += gray[idx] * kernel[ky + 1][kx + 1];
        }
      }
      variance += sum * sum;
    }
  }

  const sampleCount = Math.floor((height - 4) / 2) * Math.floor((width - 4) / 2);
  return variance / sampleCount;
}

/**
 * Normalize fill ratio to 0-100 scale
 */
function normalizeFillRatio(value, config) {
  if (value < config.minFillRatio) {
    return (value / config.minFillRatio) * 60;
  } else if (value > config.maxFillRatio) {
    return Math.max(0, 100 - ((value - config.maxFillRatio) / (1 - config.maxFillRatio)) * 60);
  } else {
    const mid = (config.minFillRatio + config.maxFillRatio) / 2;
    const distance = Math.abs(value - mid);
    const maxDistance = (config.maxFillRatio - config.minFillRatio) / 2;
    return 80 + (1 - distance / maxDistance) * 20;
  }
}

/**
 * Normalize sharpness to 0-100 scale
 */
function normalizeSharpness(variance) {
  const minAcceptableVariance = 50;
  const goodVariance = 150;

  if (variance < minAcceptableVariance) {
    return (variance / minAcceptableVariance) * 60;
  } else if (variance < goodVariance) {
    return 60 + ((variance - minAcceptableVariance) / (goodVariance - minAcceptableVariance)) * 30;
  } else {
    return Math.min(100, 90 + Math.log10(variance / goodVariance) * 10);
  }
}

/**
 * Calculate overall quality score
 * @param {ImageData} imageData - Raw image data from canvas
 * @param {Object} config - Analysis configuration
 * @returns {Object} Quality metrics
 */
export function calculateQualityScore(imageData, config) {
  const width = imageData.width;
  const height = imageData.height;

  // Convert to grayscale once, use everywhere
  const gray = convertToGrayscale(imageData);

  const rawFillRatio = calculateFillRatioFromGray(gray, width, height);
  const rawSharpness = calculateSharpnessFromGray(gray, width, height);
  const cardDetected = detectCardShapeFromGray(gray, width, height);

  const fillRatio = normalizeFillRatio(rawFillRatio, config);
  const sharpness = normalizeSharpness(rawSharpness);

  const overall = Math.round(
    cardDetected * 0.50 +
    fillRatio * 0.30 +
    sharpness * 0.20
  );

  return {
    fillRatio: Math.round(fillRatio),
    sharpness: Math.round(sharpness),
    cardDetected: Math.round(cardDetected),
    overall
  };
}
