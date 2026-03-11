/**
 * useCameraCapture - Shared camera capture logic for card scanning
 * Handles camera initialization, frame analysis, and auto-capture
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { FrameAnalyzer } from '../lib/card-detection/frame-analyzer';

/**
 * Card aspect ratio (standard credit card / ID card ratio)
 */
const CARD_ASPECT_RATIO = 1.586;

/**
 * Guide box width as percentage of viewport
 */
const GUIDE_BOX_WIDTH_PERCENT = 0.9;

/**
 * Calculate crop coordinates for the guide box region
 * @param {HTMLVideoElement} video - Video element
 * @param {DOMRect} videoRect - Video bounding rect
 * @returns {Object} Crop coordinates
 */
function calculateCropCoordinates(video, videoRect) {
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  const videoAspect = videoWidth / videoHeight;
  const containerAspect = videoRect.width / videoRect.height;

  let renderWidth, renderHeight, offsetX, offsetY;

  if (videoAspect > containerAspect) {
    renderHeight = videoHeight;
    renderWidth = videoHeight * containerAspect;
    offsetX = (videoWidth - renderWidth) / 2;
    offsetY = 0;
  } else {
    renderWidth = videoWidth;
    renderHeight = videoWidth / containerAspect;
    offsetX = 0;
    offsetY = (videoHeight - renderHeight) / 2;
  }

  const guideBoxWidth = videoRect.width * GUIDE_BOX_WIDTH_PERCENT;
  const guideBoxHeight = guideBoxWidth / CARD_ASPECT_RATIO;
  const guideBoxX = (videoRect.width - guideBoxWidth) / 2;
  const guideBoxY = (videoRect.height - guideBoxHeight) / 2;

  const scaleX = renderWidth / videoRect.width;
  const scaleY = renderHeight / videoRect.height;

  return {
    cropX: offsetX + (guideBoxX * scaleX),
    cropY: offsetY + (guideBoxY * scaleY),
    cropWidth: guideBoxWidth * scaleX,
    cropHeight: guideBoxHeight * scaleY,
    guideBoxWidth,
    guideBoxHeight,
    guideBoxX,
    guideBoxY
  };
}

/**
 * Custom hook for camera capture with auto-detection
 * @param {Object} options - Hook options
 * @param {function} options.onCapture - Callback when image is captured
 * @param {boolean} [options.active=true] - Whether camera should be active
 * @param {number} [options.scaleFactor=3] - Image scale factor for quality
 * @returns {Object} Camera state and controls
 */
export function useCameraCapture({ onCapture, active = true, scaleFactor = 3 }) {
  const [detectionStatus, setDetectionStatus] = useState('adjusting');
  const [guidanceMessage, setGuidanceMessage] = useState('Position card in box');
  const [cameraError, setCameraError] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const analyzerRef = useRef(null);
  const animationFrameRef = useRef(null);

  /**
   * Stop camera stream
   */
  const stopCamera = useCallback(() => {
    try {
      const stream = videoRef.current?.srcObject || streamRef.current;
      stream?.getTracks().forEach(track => track.stop());
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      streamRef.current = null;
    } catch (e) {
      // Ignore errors during cleanup
    }
  }, []);

  /**
   * Capture current frame
   */
  const handleCapture = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || isCapturing) return;

    setIsCapturing(true);
    setDetectionStatus('capturing');
    setGuidanceMessage('Processing...');

    const videoRect = video.getBoundingClientRect();
    const coords = calculateCropCoordinates(video, videoRect);

    canvas.width = coords.cropWidth * scaleFactor;
    canvas.height = coords.cropHeight * scaleFactor;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsCapturing(false);
      return;
    }

    ctx.drawImage(
      video,
      coords.cropX, coords.cropY, coords.cropWidth, coords.cropHeight,
      0, 0, coords.cropWidth * scaleFactor, coords.cropHeight * scaleFactor
    );

    canvas.toBlob(async (blob) => {
      if (blob) {
        stopCamera();
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        const file = new File([blob], 'card-capture.jpg', { type: 'image/jpeg' });
        onCapture(file, url);
      }
      setIsCapturing(false);
    }, 'image/jpeg', 0.9);
  }, [isCapturing, onCapture, scaleFactor, stopCamera]);

  /**
   * Start frame analysis loop
   */
  const startFrameAnalysis = useCallback(() => {
    let lastAnalysisTime = 0;
    const ANALYSIS_INTERVAL = 200;

    const analyzeFrame = (timestamp) => {
      const video = videoRef.current;
      const analyzer = analyzerRef.current;

      if (!video || !analyzer || previewUrl || isCapturing) {
        return;
      }

      if (timestamp - lastAnalysisTime < ANALYSIS_INTERVAL) {
        animationFrameRef.current = requestAnimationFrame(analyzeFrame);
        return;
      }

      lastAnalysisTime = timestamp;

      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationFrameRef.current = requestAnimationFrame(analyzeFrame);
        return;
      }

      const videoRect = video.getBoundingClientRect();
      const guideBoxWidth = videoRect.width * GUIDE_BOX_WIDTH_PERCENT;
      const guideBoxHeight = guideBoxWidth / CARD_ASPECT_RATIO;
      const guideBoxX = (videoRect.width - guideBoxWidth) / 2;
      const guideBoxY = (videoRect.height - guideBoxHeight) / 2;

      const scaleX = video.videoWidth / videoRect.width;
      const scaleY = video.videoHeight / videoRect.height;

      const guideBoxRect = {
        x: guideBoxX * scaleX,
        y: guideBoxY * scaleY,
        width: guideBoxWidth * scaleX,
        height: guideBoxHeight * scaleY
      };

      try {
        const result = analyzer.analyzeFrame(video, guideBoxRect);
        setDetectionStatus(result.status);
        setGuidanceMessage(result.message);

        if (result.shouldCapture && !isCapturing) {
          handleCapture();
          return;
        }
      } catch (error) {
        // Silent fail - continue frame analysis
      }

      animationFrameRef.current = requestAnimationFrame(analyzeFrame);
    };

    animationFrameRef.current = requestAnimationFrame(analyzeFrame);
  }, [previewUrl, isCapturing, handleCapture]);

  /**
   * Initialize camera
   */
  useEffect(() => {
    if (!active) return;

    let stream = null;
    let isActive = true;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        });

        if (videoRef.current && isActive) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        streamRef.current = stream;
        analyzerRef.current = new FrameAnalyzer();
        setCameraError(null);

        // Start frame analysis after camera stabilizes
        setTimeout(() => {
          if (isActive && videoRef.current && !previewUrl) {
            startFrameAnalysis();
          }
        }, 500);
      } catch (err) {
        console.error('Camera access error:', err);
        setCameraError('Camera access denied. Please allow camera access to scan your card.');
      }
    };

    startCamera();

    return () => {
      isActive = false;
      if (stream) stream.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      analyzerRef.current = null;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [active, previewUrl, startFrameAnalysis]);

  /**
   * Reset capture state
   */
  const reset = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setDetectionStatus('adjusting');
    setGuidanceMessage('Position card in box');
    setCameraError(null);
    setIsCapturing(false);
  }, [previewUrl]);

  return {
    // State
    detectionStatus,
    guidanceMessage,
    cameraError,
    isCapturing,
    previewUrl,
    // Refs (for rendering video/canvas elements)
    videoRef,
    canvasRef,
    // Controls
    handleCapture,
    stopCamera,
    reset,
    // Constants for rendering guide box
    CARD_ASPECT_RATIO,
    GUIDE_BOX_WIDTH_PERCENT
  };
}
