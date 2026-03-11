/**
 * InsuranceCardCapture - Full-screen camera capture for insurance/employer cards
 * Opens camera directly and auto-captures when card is positioned correctly
 */

import { useCallback } from 'react';
import { FrameAnalyzer } from '../lib/card-detection/frame-analyzer';
import { useCameraCapture } from '../hooks/useCameraCapture';
import { GREEN, TEXT_MED, heading, body } from '../constants/styles';

/**
 * @param {Object} props
 * @param {function} props.onCapture - Callback with captured file when done
 * @param {function} props.onBack - Callback to go back/cancel
 * @param {string} [props.title] - Optional title override
 */
export default function InsuranceCardCapture({ onCapture, onBack, title = "Position Your Card" }) {
  const handleCaptureComplete = useCallback((file) => {
    // Small delay to show the captured preview
    setTimeout(() => {
      onCapture(file);
    }, 500);
  }, [onCapture]);

  const {
    detectionStatus,
    guidanceMessage,
    cameraError,
    previewUrl,
    videoRef,
    canvasRef,
    stopCamera,
    CARD_ASPECT_RATIO
  } = useCameraCapture({
    onCapture: handleCaptureComplete,
    active: true
  });

  const handleBack = useCallback(() => {
    stopCamera();
    onBack();
  }, [stopCamera, onBack]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: '#000'
    }}>
      {cameraError ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: 24,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
          <div style={{
            color: '#fff',
            fontSize: 16,
            marginBottom: 24,
            fontFamily: body
          }}>
            {cameraError}
          </div>
          <button
            onClick={handleBack}
            style={{
              padding: '12px 24px',
              background: GREEN,
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: heading,
              cursor: 'pointer'
            }}
          >
            Go Back
          </button>
        </div>
      ) : previewUrl ? (
        // Show captured preview
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: 24
        }}>
          <img
            src={previewUrl}
            alt="Captured card"
            style={{
              maxWidth: '90%',
              maxHeight: '60%',
              borderRadius: 12,
              border: `4px solid ${GREEN}`
            }}
          />
          <div style={{
            color: '#fff',
            fontSize: 18,
            fontWeight: 600,
            marginTop: 24,
            fontFamily: heading
          }}>
            Processing...
          </div>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            playsInline
            muted
          />

          {/* Overlay with guide box */}
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none'
          }}>
            <div style={{
              position: 'relative',
              width: '90%',
              maxWidth: 720,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.35)',
              borderRadius: 8
            }}>
              <div style={{
                width: '100%',
                aspectRatio: CARD_ASPECT_RATIO.toString(),
                border: `4px solid ${FrameAnalyzer.getBorderColor(detectionStatus)}`,
                borderRadius: 8,
                transition: 'border-color 0.3s ease'
              }} />
            </div>
          </div>

          {/* Top title */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: 16,
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            textAlign: 'center'
          }}>
            <div style={{
              color: '#fff',
              fontSize: 20,
              fontWeight: 700,
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              fontFamily: heading
            }}>
              {title}
            </div>
          </div>

          {/* Bottom guidance */}
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            padding: 16,
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)'
          }}>
            <div style={{
              color: '#fff',
              fontSize: 18,
              fontWeight: 600,
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              fontFamily: heading
            }}>
              {guidanceMessage}
            </div>
            <div style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: 14,
              fontFamily: body
            }}>
              Card will capture automatically when positioned correctly
            </div>

            {/* Back button */}
            <button
              onClick={handleBack}
              style={{
                marginTop: 8,
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 8,
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: heading,
                cursor: 'pointer',
                pointerEvents: 'auto'
              }}
            >
              ← Back
            </button>
          </div>
        </>
      )}

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
