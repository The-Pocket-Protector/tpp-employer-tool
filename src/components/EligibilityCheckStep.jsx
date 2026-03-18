/**
 * EligibilityCheckStep - Multi-step insurance eligibility check flow
 * Uses Stedi MCP for payer search and eligibility verification
 * Steps 340-346: Instructions -> Camera -> Extracting -> DOB -> Checking -> Success -> Failure
 */

import { useState, useCallback, useEffect } from 'react';
import { extractInsuranceCard, formatCardDataForDisplay } from '../services/insurance-card.service';
import { performEligibilityCheck } from '../services/stedi.service';
import { FrameAnalyzer } from '../lib/card-detection/frame-analyzer';
import { useCameraCapture } from '../hooks/useCameraCapture';
import DateOfBirthInput from './DateOfBirthInput';
import {
  GREEN,
  GREEN_LIGHT,
  GREEN_BORDER,
  TEXT_DARK,
  TEXT_MED,
  TEXT_LIGHT,
  BORDER,
  BG_SUBTLE,
  RED,
  heading,
  body
} from '../constants/styles';

/**
 * @param {Object} props
 * @param {number} props.currentStep - Current step number (340-346)
 * @param {function} props.goToStep - Function to navigate to a step
 * @param {Object} props.cardData - Extracted insurance card data (or null)
 * @param {function} props.setCardData - Function to update card data
 * @param {Object} props.eligibilityResult - Eligibility check result (or null)
 * @param {function} props.setEligibilityResult - Function to update eligibility result
 * @param {function} props.onComplete - Callback when flow is complete
 * @param {function} props.onReset - Function to reset the entire flow
 * @param {function} props.onSearchForPlan - Callback when user wants to search for their plan instead of scanning
 */
export default function EligibilityCheckStep({
  currentStep,
  goToStep,
  cardData,
  setCardData,
  eligibilityResult,
  setEligibilityResult,
  // zipCode and county are passed but reserved for future API enhancements
  onComplete,
  onReset,
  onSearchForPlan
}) {
  const [localPreviewUrl, setLocalPreviewUrl] = useState(null);
  const [, setDateOfBirth] = useState(null); // DOB stored for eligibility flow
  const [error, setError] = useState(null);
  const [hasAttempted, setHasAttempted] = useState(false);

  // Check if extracted card data has meaningful information
  const isCardDataValid = (data) => {
    if (!data) return false;
    // Check if at least carrier name and member ID or subscriber name are present
    const hasCarrier = data.carrierName && data.carrierName.trim() !== '';
    const hasMemberId = data.identificationNumber && data.identificationNumber.trim() !== '';
    const hasSubscriber = (data.subscriberName && data.subscriberName.trim() !== '') ||
                          (data.firstName && data.firstName.trim() !== '') ||
                          (data.fullName && data.fullName.trim() !== '');
    // Need at least carrier OR (member ID and subscriber info) to proceed
    return hasCarrier || (hasMemberId && hasSubscriber);
  };

  // Handle capture and extraction
  const handleCaptureComplete = useCallback(async (file, previewUrl) => {
    setLocalPreviewUrl(previewUrl);
    setError(null);

    // Navigate to processing step
    goToStep(342);

    try {
      const data = await extractInsuranceCard(file);

      // Validate that we got meaningful data
      if (!isCardDataValid(data)) {
        setError("We couldn't read the information from your card. Please try again with better lighting or positioning.");
        setHasAttempted(true);
        goToStep(346); // Failure
        return;
      }

      setCardData(data);
      goToStep(343); // DOB input
    } catch (err) {
      console.error('Card extraction failed:', err);
      setError(err.message);
      setHasAttempted(true);
      goToStep(346); // Failure
    }
  }, [goToStep, setCardData]);

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
    active: currentStep === 341
  });

  // Handle DOB submission and eligibility check
  const handleDOBSubmit = useCallback(async (dob) => {
    setDateOfBirth(dob);
    goToStep(344); // Checking eligibility

    try {
      const result = await performEligibilityCheck(cardData, dob);
      setEligibilityResult(result);

      if (result.eligibility?.eligible) {
        goToStep(345); // Success
      } else {
        // Show specific error from API if available
        const apiError = result.eligibility?.error;
        setError(apiError || 'Your insurance could not be verified as active.');
        setHasAttempted(true);
        goToStep(346); // Failure
      }
    } catch (err) {
      console.error('Eligibility check failed:', err);
      setError(err.message);
      setHasAttempted(true);
      goToStep(346); // Failure
    }
  }, [cardData, goToStep, setEligibilityResult]);

  // Handle retake photo
  const handleRetake = useCallback(() => {
    setCardData(null);
    setLocalPreviewUrl(null);
    setDateOfBirth(null);
    setEligibilityResult(null);
    setError(null);
    resetCamera();
    goToStep(341);
  }, [goToStep, setCardData, setEligibilityResult, resetCamera]);

  // Step 340: Skip instructions, go straight to camera
  useEffect(() => {
    if (currentStep === 340) {
      goToStep(341);
    }
  }, [currentStep, goToStep]);

  if (currentStep === 340) {
    return null;
  }

  // Step 341: Camera Capture (Full Screen)
  if (currentStep === 341) {
    return (
      <>
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
                onClick={() => hasAttempted ? goToStep(346) : onReset?.()}
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

                <button
                  onClick={() => {
                    stopCamera();
                    hasAttempted ? goToStep(346) : onReset?.();
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

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </>
    );
  }

  // Step 342: Extracting card data (Loading)
  if (currentStep === 342) {
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
              alt="Captured insurance card"
              style={{ width: '100%', display: 'block' }}
            />
          </div>
        )}

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

        <div style={{ fontSize: 14, color: TEXT_MED, fontFamily: body }}>
          Extracting insurance information...
        </div>
      </div>
    );
  }

  // Step 343: DOB Input
  if (currentStep === 343 && cardData) {
    const displayData = formatCardDataForDisplay(cardData);

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
          Card Scanned
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
          <span style={{ color: GREEN }}>✓</span> Card Information
        </div>

        {/* Extracted data display */}
        <div style={{
          background: GREEN_LIGHT,
          border: `2px solid ${GREEN_BORDER}`,
          borderRadius: 16,
          padding: 20,
          marginBottom: 24
        }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: body, marginBottom: 4 }}>Carrier</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: TEXT_DARK, fontFamily: heading }}>
                {displayData.carrier}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: body, marginBottom: 4 }}>Subscriber</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: TEXT_DARK, fontFamily: heading }}>
                {displayData.subscriber}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: body, marginBottom: 4 }}>Member ID</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: TEXT_DARK, fontFamily: heading }}>
                  {displayData.memberId}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: body, marginBottom: 4 }}>Group</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: TEXT_DARK, fontFamily: heading }}>
                  {displayData.group}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DOB Input */}
        <DateOfBirthInput
          onSubmit={handleDOBSubmit}
          onBack={handleRetake}
          subscriberName={displayData.subscriber}
        />
      </div>
    );
  }

  // Step 344: Checking Eligibility (Loading)
  if (currentStep === 344) {
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
          Verifying Coverage
        </div>

        <div style={{
          fontFamily: heading,
          fontSize: 24,
          fontWeight: 800,
          color: TEXT_DARK,
          marginBottom: 16
        }}>
          Checking Eligibility...
        </div>

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

        <div style={{ fontSize: 14, color: TEXT_MED, fontFamily: body, lineHeight: 1.6 }}>
          Connecting to your insurance carrier...<br />
          This may take a moment.
        </div>
      </div>
    );
  }

  // Step 345: Success
  if (currentStep === 345 && eligibilityResult) {
    const { eligibility, payer } = eligibilityResult;

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
          Verified
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
          <span style={{ color: GREEN }}>✓</span> Coverage Confirmed
        </div>

        <div style={{
          fontSize: 15,
          color: TEXT_MED,
          lineHeight: 1.6,
          marginBottom: 24,
          fontFamily: body
        }}>
          Your insurance is active and verified.
        </div>

        {/* Eligibility details */}
        <div style={{
          background: GREEN_LIGHT,
          border: `2px solid ${GREEN_BORDER}`,
          borderRadius: 16,
          padding: 20,
          marginBottom: 24
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
            paddingBottom: 16,
            borderBottom: `1px solid ${GREEN_BORDER}`
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: GREEN,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 24
            }}>
              ✓
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: TEXT_DARK, fontFamily: heading }}>
                {eligibility.status || 'Active'}
              </div>
              <div style={{ fontSize: 13, color: TEXT_MED, fontFamily: body }}>
                {payer?.payerName || cardData?.carrierName}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: body, marginBottom: 4 }}>Subscriber</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: TEXT_DARK, fontFamily: heading }}>
                {eligibility.subscriberName}
              </div>
            </div>

            {eligibility.planName && (
              <div>
                <div style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: body, marginBottom: 4 }}>Plan</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: TEXT_DARK, fontFamily: heading }}>
                  {eligibility.planName}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: body, marginBottom: 4 }}>Member ID</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: TEXT_DARK, fontFamily: heading }}>
                  {eligibility.memberId}
                </div>
              </div>
              {eligibility.groupNumber && (
                <div>
                  <div style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: body, marginBottom: 4 }}>Group</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: TEXT_DARK, fontFamily: heading }}>
                    {eligibility.groupNumber}
                  </div>
                </div>
              )}
            </div>

            {eligibility.effectiveDate && (
              <div>
                <div style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: body, marginBottom: 4 }}>Effective Date</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: TEXT_DARK, fontFamily: heading }}>
                  {eligibility.effectiveDate}
                </div>
              </div>
            )}

            {eligibility.benefits && Object.keys(eligibility.benefits).length > 0 && (
              <div style={{ marginTop: 8, paddingTop: 12, borderTop: `1px solid ${GREEN_BORDER}` }}>
                <div style={{ fontSize: 12, color: TEXT_LIGHT, fontFamily: body, marginBottom: 8 }}>Benefits</div>
                {eligibility.benefits.deductible && (
                  <div style={{ fontSize: 14, color: TEXT_DARK, fontFamily: body, marginBottom: 4 }}>
                    <strong>Deductible:</strong> {eligibility.benefits.deductible.individual || eligibility.benefits.deductible}
                  </div>
                )}
                {eligibility.benefits.outOfPocketMax && (
                  <div style={{ fontSize: 14, color: TEXT_DARK, fontFamily: body, marginBottom: 4 }}>
                    <strong>Out-of-Pocket Max:</strong> {eligibility.benefits.outOfPocketMax.individual || eligibility.benefits.outOfPocketMax}
                  </div>
                )}
                {eligibility.benefits.coinsurance && (
                  <div style={{ fontSize: 14, color: TEXT_DARK, fontFamily: body }}>
                    <strong>Coinsurance:</strong> {eligibility.benefits.coinsurance}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => onComplete?.(eligibilityResult)}
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
          Done
        </button>

        {onReset && (
          <button
            onClick={onReset}
            style={{
              width: '100%',
              marginTop: 12,
              background: 'none',
              border: 'none',
              color: TEXT_MED,
              padding: '10px',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: heading,
              cursor: 'pointer'
            }}
          >
            ← Start Over
          </button>
        )}
      </div>
    );
  }

  // Step 346: Failure/Retry
  if (currentStep === 346) {
    return (
      <div style={{ animation: 'fadeUp 0.35s ease' }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: RED,
          marginBottom: 8,
          fontFamily: heading
        }}>
          Verification Failed
        </div>

        <div style={{
          fontFamily: heading,
          fontSize: 24,
          fontWeight: 800,
          color: TEXT_DARK,
          marginBottom: 8
        }}>
          We Couldn't Verify Your Coverage
        </div>

        <div style={{
          fontSize: 15,
          color: TEXT_MED,
          lineHeight: 1.6,
          marginBottom: 24,
          fontFamily: body
        }}>
          {error || "We weren't able to verify your insurance eligibility. Please try again."}
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
          Try Again
        </button>

        {onSearchForPlan && !cardData?.payerId && (
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
            Search for My Insurance
          </button>
        )}

        {onReset && (
          <button
            onClick={onReset}
            style={{
              width: '100%',
              marginTop: 12,
              background: 'none',
              border: 'none',
              color: TEXT_LIGHT,
              padding: '10px',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: heading,
              cursor: 'pointer'
            }}
          >
            ← Start Over
          </button>
        )}
      </div>
    );
  }

  return null;
}
