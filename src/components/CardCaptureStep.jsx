/**
 * CardCaptureStep - Medicare card photo capture component
 * Handles direct camera capture with auto-detection and extraction
 */

import { useState, useCallback } from 'react';
import { extractMedicareCard } from '../services/medicard.service';
import { FrameAnalyzer } from '../lib/card-detection/frame-analyzer';
import { useCameraCapture } from '../hooks/useCameraCapture';
import {
  GREEN,
  GREEN_LIGHT,
  GREEN_BORDER,
  TEXT_DARK,
  TEXT_MED,
  TEXT_LIGHT,
  BORDER,
  BG_SUBTLE,
  heading,
  body
} from '../constants/styles';

/**
 * @param {Object} props
 * @param {number} props.currentStep - Current step number (331-336)
 * @param {function} props.goToStep - Function to navigate to a step
 * @param {Object} props.planResult - The plan result from step 330
 * @param {Object} props.cardExtract - Extracted card data (or null)
 * @param {function} props.setCardExtract - Function to update extracted card data
 * @param {File} props.cardPhoto - Captured photo file
 * @param {function} props.setCardPhoto - Function to update photo
 * @param {boolean} props.cardExtracting - Whether extraction is in progress
 * @param {function} props.setCardExtracting - Function to update extracting state
 * @param {boolean} props.cardExtractFailed - Whether extraction failed
 * @param {function} props.setCardExtractFailed - Function to update failed state
 * @param {function} props.onReset - Function to reset the entire flow
 * @param {function} props.onSearchForPlan - Callback when user wants to search for their plan instead of scanning
 */
export default function CardCaptureStep({
  currentStep,
  goToStep,
  planResult,
  cardExtract,
  setCardExtract,
  cardPhoto: _cardPhoto,
  setCardPhoto,
  cardExtracting: _cardExtracting,
  setCardExtracting,
  cardExtractFailed: _cardExtractFailed,
  setCardExtractFailed,
  onReset,
  onSearchForPlan
}) {
  const [localPreviewUrl, setLocalPreviewUrl] = useState(null);

  // Check if extracted Medicare card data has meaningful information
  const isMedicareDataValid = (data) => {
    if (!data) return false;
    // Check for Medicare number
    const hasMedicareNumber = data.medicare_number && data.medicare_number.trim() !== '';
    // Check for name
    const hasName = (data.fullName && data.fullName.trim() !== '') ||
                    (data.firstName && data.firstName.trim() !== '') ||
                    (data.lastName && data.lastName.trim() !== '');
    // Need at least Medicare number to proceed
    return hasMedicareNumber || hasName;
  };

  // Handle capture and extraction
  const handleCaptureComplete = useCallback(async (file, previewUrl) => {
    setCardPhoto(file);
    setLocalPreviewUrl(previewUrl);
    setCardExtractFailed(false);

    // Navigate to processing step
    goToStep(333);
    setCardExtracting(true);

    try {
      const data = await extractMedicareCard(file);

      // Validate that we got meaningful data
      if (!isMedicareDataValid(data)) {
        setCardExtracting(false);
        setCardExtractFailed(true);
        goToStep(335); // Failure
        return;
      }

      setCardExtract(data);
      setCardExtracting(false);
      goToStep(334); // Success
    } catch (error) {
      console.error('Card extraction failed:', error);
      setCardExtracting(false);
      setCardExtractFailed(true);
      goToStep(335); // Failure
    }
  }, [goToStep, setCardPhoto, setCardExtract, setCardExtracting, setCardExtractFailed]);

  const {
    detectionStatus,
    guidanceMessage,
    cameraError,
    videoRef,
    canvasRef,
    stopCamera,
    reset: resetCamera,
    CARD_ASPECT_RATIO
  } = useCameraCapture({
    onCapture: handleCaptureComplete,
    active: currentStep === 332
  });

  // Handle retake photo
  const handleRetake = useCallback(() => {
    setCardPhoto(null);
    setCardExtract(null);
    setLocalPreviewUrl(null);
    setCardExtractFailed(false);
    resetCamera();
    goToStep(332);
  }, [goToStep, setCardPhoto, setCardExtract, setCardExtractFailed, resetCamera]);

  // Step 331: Instructions
  if (currentStep === 331) {
    return (
      <div style={{ animation: 'fadeUp 0.35s ease' }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: TEXT_LIGHT,
          marginBottom: 8,
          fontFamily: heading
        }}>
          Verify Your Card
        </div>

        <div style={{
          fontFamily: heading,
          fontSize: 24,
          fontWeight: 800,
          color: TEXT_DARK,
          marginBottom: 8
        }}>
          Let's Verify Your Medicare Card
        </div>

        <div style={{
          fontSize: 15,
          color: TEXT_MED,
          lineHeight: 1.6,
          marginBottom: 24,
          fontFamily: body
        }}>
          We need to scan your Medicare card to verify your eligibility and pre-fill your enrollment information.
        </div>

        {/* Medicare card illustration */}
        <div style={{
          background: BG_SUBTLE,
          border: `2px dashed ${BORDER}`,
          borderRadius: 16,
          padding: 32,
          textAlign: 'center',
          marginBottom: 24
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>
            <span role="img" aria-label="Medicare card">🏥</span>
          </div>
          <div style={{
            fontSize: 14,
            color: TEXT_MED,
            fontFamily: body,
            lineHeight: 1.6
          }}>
            Have your red, white, and blue<br />Medicare card ready.
          </div>
        </div>

        <button
          onClick={() => goToStep(332)}
          style={{
            width: '100%',
            padding: '16px 28px',
            background: GREEN,
            border: 'none',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 700,
            color: '#fff',
            fontFamily: heading,
            cursor: 'pointer'
          }}
        >
          Scan My Card
        </button>

        {onSearchForPlan && (
          <button
            onClick={onSearchForPlan}
            style={{
              width: '100%',
              marginTop: 12,
              background: 'none',
              border: `2px solid ${GREEN}`,
              color: GREEN,
              padding: '14px 28px',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              fontFamily: heading,
              cursor: 'pointer'
            }}
          >
            Search for My Plan
          </button>
        )}

        <button
          onClick={() => goToStep(336)}
          style={{
            width: '100%',
            marginTop: 12,
            background: 'none',
            border: `2px solid ${BORDER}`,
            color: TEXT_MED,
            padding: '14px 28px',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 600,
            fontFamily: heading,
            cursor: 'pointer'
          }}
        >
          Enter Information Manually
        </button>
      </div>
    );
  }

  // Step 332: Camera Capture (Full Screen)
  if (currentStep === 332) {
    return (
      <>
        {/* Full screen camera view */}
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
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
                onClick={() => goToStep(331)}
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
                  onClick={() => {
                    stopCamera();
                    goToStep(331);
                  }}
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
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </>
    );
  }

  // Step 333: Processing/Loading
  if (currentStep === 333) {
    return (
      <div style={{ animation: 'fadeUp 0.35s ease', textAlign: 'center', padding: '40px 0' }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: TEXT_LIGHT,
          marginBottom: 8,
          fontFamily: heading
        }}>
          Processing
        </div>

        <div style={{
          fontFamily: heading,
          fontSize: 24,
          fontWeight: 800,
          color: TEXT_DARK,
          marginBottom: 16
        }}>
          Reading Your Card...
        </div>

        {/* Preview of captured image */}
        {localPreviewUrl && (
          <div style={{
            marginBottom: 24,
            borderRadius: 12,
            overflow: 'hidden',
            maxWidth: 280,
            margin: '0 auto 24px'
          }}>
            <img
              src={localPreviewUrl}
              alt="Captured Medicare card"
              style={{
                width: '100%',
                display: 'block'
              }}
            />
          </div>
        )}

        {/* Spinner */}
        <div style={{
          width: 48,
          height: 48,
          border: `4px solid ${BORDER}`,
          borderTopColor: GREEN,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 24px'
        }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>

        <div style={{
          fontSize: 14,
          color: TEXT_MED,
          fontFamily: body
        }}>
          This usually takes a few seconds.
        </div>
      </div>
    );
  }

  // Step 334: Success Confirmation
  if (currentStep === 334 && cardExtract) {
    return (
      <div style={{ animation: 'fadeUp 0.35s ease' }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: GREEN,
          marginBottom: 8,
          fontFamily: heading
        }}>
          Success
        </div>

        <div style={{
          fontFamily: heading,
          fontSize: 24,
          fontWeight: 800,
          color: TEXT_DARK,
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <span style={{ color: GREEN }}>✓</span> Card Scanned Successfully
        </div>

        <div style={{
          fontSize: 15,
          color: TEXT_MED,
          lineHeight: 1.6,
          marginBottom: 24,
          fontFamily: body
        }}>
          Please verify your information below is correct.
        </div>

        {/* Extracted data display */}
        <div style={{
          background: GREEN_LIGHT,
          border: `2px solid ${GREEN_BORDER}`,
          borderRadius: 16,
          padding: 20,
          marginBottom: 24
        }}>
          <div style={{
            display: 'grid',
            gap: 16
          }}>
            <div>
              <div style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: body, marginBottom: 4 }}>Name</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: TEXT_DARK, fontFamily: heading }}>
                {cardExtract.fullName || `${cardExtract.firstName || ''} ${cardExtract.lastName || ''}`.trim() || 'Not found'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: body, marginBottom: 4 }}>Medicare Number</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: TEXT_DARK, fontFamily: heading }}>
                {cardExtract.medicare_number || 'Not found'}
              </div>
            </div>
            {cardExtract.partA?.coverageStart && (
              <div>
                <div style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: body, marginBottom: 4 }}>Part A Effective</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: TEXT_DARK, fontFamily: heading }}>
                  {cardExtract.partA.coverageStart}
                </div>
              </div>
            )}
            {cardExtract.partB?.coverageStart && (
              <div>
                <div style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: body, marginBottom: 4 }}>Part B Effective</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: TEXT_DARK, fontFamily: heading }}>
                  {cardExtract.partB.coverageStart}
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => goToStep(336)}
          style={{
            width: '100%',
            padding: '16px 28px',
            background: GREEN,
            border: 'none',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 700,
            color: '#fff',
            fontFamily: heading,
            cursor: 'pointer'
          }}
        >
          This is Correct
        </button>

        <button
          onClick={handleRetake}
          style={{
            width: '100%',
            marginTop: 12,
            background: 'none',
            border: `2px solid ${BORDER}`,
            color: TEXT_MED,
            padding: '14px 28px',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 600,
            fontFamily: heading,
            cursor: 'pointer'
          }}
        >
          Retake Photo
        </button>
      </div>
    );
  }

  // Step 335: Failure/Retry
  if (currentStep === 335) {
    return (
      <div style={{ animation: 'fadeUp 0.35s ease' }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#dc2626',
          marginBottom: 8,
          fontFamily: heading
        }}>
          Scan Failed
        </div>

        <div style={{
          fontFamily: heading,
          fontSize: 24,
          fontWeight: 800,
          color: TEXT_DARK,
          marginBottom: 8
        }}>
          We Couldn't Read Your Card
        </div>

        <div style={{
          fontSize: 15,
          color: TEXT_MED,
          lineHeight: 1.6,
          marginBottom: 24,
          fontFamily: body
        }}>
          Let's try again. Make sure your card is:
        </div>

        {/* Tips list */}
        <div style={{
          background: BG_SUBTLE,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: 20,
          marginBottom: 24
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 16 }}>💡</span>
              <span style={{ fontSize: 14, color: TEXT_DARK, fontFamily: body }}>Well lit with no glare</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 16 }}>📐</span>
              <span style={{ fontSize: 14, color: TEXT_DARK, fontFamily: body }}>Fully visible in the frame</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 16 }}>🏥</span>
              <span style={{ fontSize: 14, color: TEXT_DARK, fontFamily: body }}>The red, white, and blue Medicare card</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleRetake}
          style={{
            width: '100%',
            padding: '16px 28px',
            background: GREEN,
            border: 'none',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 700,
            color: '#fff',
            fontFamily: heading,
            cursor: 'pointer'
          }}
        >
          Open Camera to Scan Card
        </button>

        {onSearchForPlan && (
          <button
            onClick={onSearchForPlan}
            style={{
              width: '100%',
              marginTop: 12,
              background: 'none',
              border: `2px solid ${GREEN}`,
              color: GREEN,
              padding: '14px 28px',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              fontFamily: heading,
              cursor: 'pointer'
            }}
          >
            Search for My Plan
          </button>
        )}

        <button
          onClick={() => goToStep(336)}
          style={{
            width: '100%',
            marginTop: 12,
            background: 'none',
            border: `2px solid ${BORDER}`,
            color: TEXT_MED,
            padding: '14px 28px',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 600,
            fontFamily: heading,
            cursor: 'pointer'
          }}
        >
          Enter Information Manually
        </button>
      </div>
    );
  }

  // Step 336: Final CTA
  if (currentStep === 336) {
    const planName = planResult?.plan?.name || planResult?.topCarriers?.[0]?.name || 'your selected plan';

    return (
      <div style={{ animation: 'fadeUp 0.35s ease' }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: GREEN,
          marginBottom: 8,
          fontFamily: heading
        }}>
          Ready to Enroll
        </div>

        <div style={{
          fontFamily: heading,
          fontSize: 24,
          fontWeight: 800,
          color: TEXT_DARK,
          marginBottom: 8
        }}>
          You're Ready to Enroll!
        </div>

        <div style={{
          fontSize: 15,
          color: TEXT_MED,
          lineHeight: 1.6,
          marginBottom: 24,
          fontFamily: body
        }}>
          We have everything we need to help you enroll in {planName}.
        </div>

        {/* Success checkmarks */}
        {cardExtract && (
          <div style={{
            background: GREEN_LIGHT,
            border: `2px solid ${GREEN_BORDER}`,
            borderRadius: 12,
            padding: 16,
            marginBottom: 24
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ color: GREEN, fontWeight: 700 }}>✓</span>
              <span style={{ fontSize: 14, color: TEXT_DARK, fontFamily: body }}>Medicare card verified</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: GREEN, fontWeight: 700 }}>✓</span>
              <span style={{ fontSize: 14, color: TEXT_DARK, fontFamily: body }}>Plan recommendation ready</span>
            </div>
          </div>
        )}

        {/* Call CTA */}
        <a
          href="tel:1-866-764-3312"
          style={{
            display: 'block',
            width: '100%',
            padding: '16px 28px',
            background: GREEN,
            border: 'none',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 700,
            color: '#fff',
            fontFamily: heading,
            cursor: 'pointer',
            textDecoration: 'none',
            textAlign: 'center',
            boxSizing: 'border-box'
          }}
        >
          Call to Enroll: 1-866-764-3312
        </a>

        <div style={{
          fontSize: 14,
          color: TEXT_MED,
          textAlign: 'center',
          marginTop: 16,
          marginBottom: 16,
          fontFamily: body
        }}>
          Or schedule a callback at a time that works for you.
        </div>

        <button
          onClick={() => {
            window.open('https://thepocketprotector.com/schedule', '_blank');
          }}
          style={{
            width: '100%',
            padding: '14px 28px',
            background: 'none',
            border: `2px solid ${GREEN}`,
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 700,
            color: GREEN,
            fontFamily: heading,
            cursor: 'pointer'
          }}
        >
          Schedule Callback
        </button>

        <button
          onClick={onReset}
          style={{
            width: '100%',
            marginTop: 16,
            background: 'none',
            border: `2px solid ${BORDER}`,
            color: TEXT_MED,
            padding: '10px 20px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: heading,
            cursor: 'pointer'
          }}
        >
          ← Start Over
        </button>

        <div style={{
          fontSize: 11,
          color: TEXT_LIGHT,
          lineHeight: 1.6,
          textAlign: 'center',
          marginTop: 24,
          paddingTop: 24,
          borderTop: `1px solid ${BORDER}`
        }}>
          The Pocket Protector is not connected with or endorsed by the U.S. Government or the federal Medicare program.
        </div>
      </div>
    );
  }

  return null;
}
