/**
 * PlanComparisonScreen - Displays V6 plan recommendation comparison results
 * Shows how a recommended plan compares to the user's current coverage
 */

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

const YELLOW = "#eab308";
const YELLOW_LIGHT = "#fefce8";
const YELLOW_BORDER = "#fde047";
const RED_LIGHT = "#fef2f2";
const RED_BORDER = "#fecaca";

/**
 * Process V6 recommendation data into comparison categories
 * @param {Object} recommendationData - Raw V6 API response
 * @param {Object} currentPlanData - Current plan info (optional)
 * @returns {Object} Processed comparison data
 */
function processRecommendations(recommendationData, currentPlanData = null) {
  const beatsCurrent = [];
  const similarToCurrent = [];
  const lacksCurrent = [];

  if (recommendationData?.benefits) {
    recommendationData.benefits.forEach(benefit => {
      const item = {
        category: benefit.category,
        currentValue: benefit.currentValue,
        newValue: benefit.newValue
      };

      if (benefit.comparison === 'better') {
        beatsCurrent.push(item);
      } else if (benefit.comparison === 'similar') {
        similarToCurrent.push(item);
      } else if (benefit.comparison === 'worse') {
        lacksCurrent.push(item);
      }
    });
  }

  return {
    recommendedPlanName: recommendationData?.planOverview?.name || 'Recommended Plan',
    currentPlanName: currentPlanData?.carrierName || currentPlanData?.planName || 'Your Current Plan',
    topBenefits: beatsCurrent.slice(0, 3),
    monthlyPremium: recommendationData?.planOverview?.premium || '$0',
    beatsCurrent,
    similarToCurrent,
    lacksCurrent,
    doctorsCovered: recommendationData?.doctorsCovered ?? true,
    medicationsCovered: recommendationData?.medicationsCovered ?? true,
    totalPlansInCounty: recommendationData?.totalPlansInCounty || 0,
    whatsNext: recommendationData?.closing || '',
    button: recommendationData?.button || { label: 'Continue', value: 'continue' },
    planOverview: recommendationData?.planOverview
  };
}

/**
 * @param {Object} props
 * @param {Object} props.recommendationData - V6 recommendation data
 * @param {Object} props.currentPlanData - Current plan info (optional)
 * @param {string} props.countyName - County name for display
 * @param {function} props.onAction - Callback when action button is clicked
 * @param {function} props.onBack - Callback for back button
 */
export default function PlanComparisonScreen({
  recommendationData,
  currentPlanData,
  countyName,
  onAction,
  onBack
}) {
  const comparison = processRecommendations(recommendationData, currentPlanData);

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{
        fontSize: 13,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: GREEN,
        marginBottom: 8,
        fontFamily: heading
      }}>
        Plan Recommendation
      </div>

      <div style={{
        fontFamily: heading,
        fontSize: 22,
        fontWeight: 800,
        color: TEXT_DARK,
        marginBottom: 8,
        lineHeight: 1.3
      }}>
        I found a plan that may work better for you
      </div>

      {countyName && comparison.totalPlansInCounty > 0 && (
        <div style={{
          fontSize: 14,
          color: TEXT_MED,
          marginBottom: 20,
          fontFamily: body
        }}>
          After reviewing {comparison.totalPlansInCounty} plans in {countyName}...
        </div>
      )}

      {/* Recommended Plan Card */}
      <div style={{
        background: GREEN_LIGHT,
        border: `2px solid ${GREEN_BORDER}`,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20
      }}>
        <div style={{
          fontSize: 18,
          fontWeight: 700,
          color: TEXT_DARK,
          marginBottom: 16,
          fontFamily: heading
        }}>
          {comparison.recommendedPlanName}
        </div>

        {/* Top Benefits */}
        {comparison.topBenefits.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {comparison.topBenefits.map((benefit, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10
              }}>
                <span style={{ color: GREEN, fontSize: 18, lineHeight: 1 }}>✓</span>
                <div>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: TEXT_DARK,
                    fontFamily: heading
                  }}>
                    {benefit.category}
                  </div>
                  <div style={{
                    fontSize: 13,
                    color: TEXT_MED,
                    fontFamily: body
                  }}>
                    {benefit.newValue} <span style={{ color: TEXT_LIGHT }}>(was {benefit.currentValue})</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Doctors & Medications Card */}
      <div style={{
        background: BG_SUBTLE,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        display: 'flex',
        gap: 16
      }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{
            fontSize: 24,
            marginBottom: 4
          }}>
            {comparison.doctorsCovered ? (
              <span style={{ color: GREEN }}>✓</span>
            ) : (
              <span style={{ color: RED }}>✕</span>
            )}
          </div>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: TEXT_DARK,
            fontFamily: heading
          }}>
            Your Doctors
          </div>
          <div style={{
            fontSize: 12,
            color: comparison.doctorsCovered ? GREEN : RED,
            fontFamily: body
          }}>
            {comparison.doctorsCovered ? 'Covered' : 'Not Covered'}
          </div>
        </div>

        <div style={{
          width: 1,
          background: BORDER
        }} />

        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{
            fontSize: 24,
            marginBottom: 4
          }}>
            {comparison.medicationsCovered ? (
              <span style={{ color: GREEN }}>✓</span>
            ) : (
              <span style={{ color: RED }}>✕</span>
            )}
          </div>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: TEXT_DARK,
            fontFamily: heading
          }}>
            Your Medications
          </div>
          <div style={{
            fontSize: 12,
            color: comparison.medicationsCovered ? GREEN : RED,
            fontFamily: body
          }}>
            {comparison.medicationsCovered ? 'Covered' : 'Check Coverage'}
          </div>
        </div>
      </div>

      {/* Monthly Premium */}
      <div style={{
        textAlign: 'center',
        padding: '16px 0',
        marginBottom: 20,
        borderTop: `1px solid ${BORDER}`,
        borderBottom: `1px solid ${BORDER}`
      }}>
        <div style={{
          fontSize: 12,
          color: TEXT_LIGHT,
          fontFamily: body,
          marginBottom: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          Monthly Premium
        </div>
        <div style={{
          fontSize: 32,
          fontWeight: 800,
          color: GREEN,
          fontFamily: heading
        }}>
          {comparison.monthlyPremium}
        </div>
      </div>

      {/* Comparison Sections */}
      {comparison.beatsCurrent.length > 0 && (
        <ComparisonSection
          title="Where this plan beats your current plan"
          items={comparison.beatsCurrent}
          color={GREEN}
          bgColor={GREEN_LIGHT}
          borderColor={GREEN_BORDER}
        />
      )}

      {comparison.similarToCurrent.length > 0 && (
        <ComparisonSection
          title="Where this plan is similar"
          items={comparison.similarToCurrent}
          color={YELLOW}
          bgColor={YELLOW_LIGHT}
          borderColor={YELLOW_BORDER}
        />
      )}

      {comparison.lacksCurrent.length > 0 && (
        <ComparisonSection
          title="What this plan lacks"
          items={comparison.lacksCurrent}
          color={RED}
          bgColor={RED_LIGHT}
          borderColor={RED_BORDER}
        />
      )}

      {/* What's Next */}
      {comparison.whatsNext && (
        <div style={{
          background: BG_SUBTLE,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 24
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: TEXT_DARK,
            fontFamily: heading,
            marginBottom: 8
          }}>
            What's Next
          </div>
          <div style={{
            fontSize: 14,
            color: TEXT_MED,
            lineHeight: 1.6,
            fontFamily: body
          }}>
            {comparison.whatsNext}
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={() => onAction?.(comparison.button.value, comparison.planOverview)}
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
        {comparison.button.label}
      </button>

      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
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
          ← Back to eligibility results
        </button>
      )}
    </div>
  );
}

/**
 * Comparison section component for beats/similar/lacks categories
 */
function ComparisonSection({ title, items, color, bgColor, borderColor }) {
  if (!items || items.length === 0) return null;

  return (
    <div style={{
      marginBottom: 16
    }}>
      <div style={{
        fontSize: 14,
        fontWeight: 600,
        color: color,
        marginBottom: 12,
        fontFamily: heading,
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color
        }} />
        {title}
      </div>

      <div style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        overflow: 'hidden'
      }}>
        {items.map((item, index) => (
          <div
            key={index}
            style={{
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: index < items.length - 1 ? `1px solid ${borderColor}` : 'none'
            }}
          >
            <div style={{
              fontSize: 14,
              fontWeight: 500,
              color: TEXT_DARK,
              fontFamily: body
            }}>
              {item.category}
            </div>
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: color,
              fontFamily: heading
            }}>
              {item.newValue}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
