import { useCompareStore } from '@/stores/compare.store';
import StepWrapper from './ui/StepWrapper';

const CONDITIONS = [
  'Diabetes',
  'Cardiovascular Disorders',
  'Chronic Heart Failure',
  'Chronic Lung Disorders (COPD)',
  'End-Stage Renal Disease (ESRD)',
  'Chronic & Disabling Mental Health',
  'HIV/AIDS',
  'Stroke',
  'Autoimmune Disorders',
  'Cancer (select types)',
  'Dementia',
];

export default function CsnpStep() {
  const { csnpConditions, toggleCsnpCondition } = useCompareStore();

  return (
    <StepWrapper
      label="Special Needs"
      title="Any chronic conditions?"
      subtitle="C-SNP plans offer extra benefits for specific conditions. Select all that apply."
    >
      <div className="flex flex-col gap-2">
        {CONDITIONS.map((c) => {
          const selected = csnpConditions.includes(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggleCsnpCondition(c)}
              className={`flex cursor-pointer items-center gap-3.5 rounded-[14px] border-[1.5px] px-[18px] py-[14px] text-left transition-all ${
                selected
                  ? 'border-primary bg-light-bg'
                  : 'border-border bg-white hover:border-primary'
              }`}
            >
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border-2 transition-all ${
                  selected ? 'border-primary bg-primary' : 'border-border bg-transparent'
                }`}
              >
                {selected && (
                  <svg width="10" height="10" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                )}
              </div>
              <span className="font-body text-sm font-medium text-text-dark">{c}</span>
            </button>
          );
        })}
      </div>
    </StepWrapper>
  );
}
