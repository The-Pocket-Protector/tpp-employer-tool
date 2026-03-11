/**
 * Card Detection Types
 * Types for auto-capture card detection system
 */

/**
 * Detection status types:
 * - 'too-far': Card is too far, move closer
 * - 'too-close': Card is too close, move back
 * - 'adjusting': Card detected but quality not optimal
 * - 'ready': Card is perfectly positioned
 * - 'capturing': Auto-capture in progress
 */

export const DEFAULT_ANALYSIS_CONFIG = {
  minFillRatio: 0.60,       // Card must fill at least 60% - ensures proper positioning
  maxFillRatio: 0.85,       // Card must not exceed 85% - prevents too close
  captureThreshold: 70,     // Require good overall quality for capture
  requiredStableFrames: 20  // Wait 20 frames (~4 seconds at 200ms intervals) before capture
};
