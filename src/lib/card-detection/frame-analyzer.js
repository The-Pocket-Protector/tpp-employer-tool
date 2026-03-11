/**
 * Frame Analyzer - Simplified
 * Main orchestrator for card detection and auto-capture logic
 */

import { DEFAULT_ANALYSIS_CONFIG } from './types';
import { calculateQualityScore } from './quality-checker';
import {
  STATUS_ERROR,
  STATUS_WARNING,
  STATUS_SUCCESS,
  STATUS_DEFAULT
} from '../../constants/styles';

export class FrameAnalyzer {
  constructor(config = {}) {
    this.config = { ...DEFAULT_ANALYSIS_CONFIG, ...config };
    this.stableFrameCount = 0;
    // Reusable canvas for frame analysis
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  /**
   * Analyze a video frame and determine detection status
   */
  analyzeFrame(videoElement, guideBoxRect) {
    // Resize canvas only if dimensions changed
    if (this.canvas.width !== guideBoxRect.width || this.canvas.height !== guideBoxRect.height) {
      this.canvas.width = guideBoxRect.width;
      this.canvas.height = guideBoxRect.height;
    }
    const ctx = this.ctx;

    if (!ctx) {
      return this.createErrorResult('Canvas context not available');
    }

    try {
      ctx.drawImage(
        videoElement,
        guideBoxRect.x,
        guideBoxRect.y,
        guideBoxRect.width,
        guideBoxRect.height,
        0,
        0,
        guideBoxRect.width,
        guideBoxRect.height
      );
    } catch {
      return this.createErrorResult('Failed to capture frame');
    }

    const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const quality = calculateQualityScore(imageData, this.config);

    const status = this.determineStatus(quality);
    const message = this.getStatusMessage(status, quality);
    const shouldCapture = this.shouldTriggerCapture(quality);

    return {
      status,
      quality,
      message,
      shouldCapture
    };
  }

  /**
   * Determine detection status based on quality metrics
   */
  determineStatus(quality) {
    if (quality.fillRatio < 55) {
      return 'too-far';
    }
    if (quality.fillRatio > 92) {
      return 'too-close';
    }
    if (quality.overall >= this.config.captureThreshold) {
      return 'ready';
    }
    return 'adjusting';
  }

  /**
   * Get user-facing message for current status
   */
  getStatusMessage(status, quality) {
    switch (status) {
      case 'too-far':
        return 'Move closer';
      case 'too-close':
        return 'Move back';
      case 'adjusting':
        if (quality.cardDetected < 50) {
          return 'Show Medicare card';
        }
        if (quality.fillRatio < 60) {
          return 'Center card in box';
        }
        if (quality.sharpness < 60) {
          return 'Hold very still';
        }
        if (quality.overall < 60) {
          return 'Almost there...';
        }
        return 'Get ready...';
      case 'ready':
        return 'Perfect! Hold still...';
      case 'capturing':
        return 'Processing...';
      default:
        return 'Position card in box';
    }
  }

  /**
   * Determine if auto-capture should be triggered
   */
  shouldTriggerCapture(quality) {
    if (quality.overall >= this.config.captureThreshold) {
      this.stableFrameCount++;
      if (this.stableFrameCount >= this.config.requiredStableFrames) {
        this.stableFrameCount = 0;
        return true;
      }
    } else {
      this.stableFrameCount = 0;
    }
    return false;
  }

  /**
   * Create an error result
   */
  createErrorResult(message) {
    return {
      status: 'adjusting',
      quality: {
        fillRatio: 0,
        sharpness: 0,
        cardDetected: 0,
        overall: 0
      },
      message,
      shouldCapture: false
    };
  }

  /**
   * Reset analyzer state
   */
  reset() {
    this.stableFrameCount = 0;
  }

  /**
   * Get border color for current status
   */
  static getBorderColor(status) {
    switch (status) {
      case 'too-far':
      case 'too-close':
        return STATUS_ERROR;
      case 'adjusting':
        return STATUS_WARNING;
      case 'ready':
      case 'capturing':
        return STATUS_SUCCESS;
      default:
        return STATUS_DEFAULT;
    }
  }
}
