import { useCompareStore } from '@/stores/compare.store';
import { getStepKey, isStepValid, isSkippable, STEP_META, getFlowLength } from '@/stores/flow-config';
import { syncSession } from '@/services/compare.service';
import type { FlowType, StepKey } from '@/types/compare';

export default function NavFooter() {
  const store = useCompareStore();
  const { flow, currentStep, nextStep, prevStep, sessionId, setField, ...data } = store;

  if (!flow) return null;

  const stepKey = getStepKey(flow, currentStep);
  if (!stepKey) return null;

  const isFirst = currentStep === 0;
  const isLast = stepKey === 'recommendation';
  const valid = isStepValid(stepKey, { flow, currentStep, sessionId, ...data } as ReturnType<typeof useCompareStore.getState>, flow);
  const skippable = isSkippable(stepKey as StepKey, flow as FlowType);
  const meta = STEP_META[stepKey];
  const totalSteps = getFlowLength(flow);

  const isSecondToLast = currentStep === totalSteps - 2;
  let nextLabel = meta.buttonText;
  if (isSecondToLast) {
    if (flow === 'pdp') nextLabel = 'Find My Part D Plan';
    else if (flow === 'magic') nextLabel = 'Find My Magic Plan';
    else nextLabel = 'Find My Plan';
  }

  if (isLast) return null;

  const handleNext = async () => {
    if (!valid && !skippable) return;

    // Sync session to backend (fire-and-forget — don't block navigation)
    syncSession().catch((err) => console.error('Failed to sync compare session:', err));

    nextStep();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] border-t border-border bg-white px-6 py-3.5">
      <div className="mx-auto flex max-w-[640px] gap-3">
        {!isFirst && (
          <button
            type="button"
            onClick={prevStep}
            className="w-full rounded-xl border-[1.5px] border-border bg-transparent px-7 py-3.5 font-body text-[15px] font-semibold text-text-desc transition-all cursor-pointer hover:border-primary"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={handleNext}
          className={`w-full rounded-xl px-7 py-3.5 font-heading text-base font-semibold tracking-[-0.01em] transition-all ${
            valid || skippable
              ? 'bg-primary text-white cursor-pointer hover:bg-primary-hover hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(11,122,75,0.13)]'
              : 'bg-border text-text-muted cursor-not-allowed'
          }`}
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
