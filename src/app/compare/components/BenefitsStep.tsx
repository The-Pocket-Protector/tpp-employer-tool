import { useCompareStore } from '@/stores/compare.store';
import StepWrapper from './ui/StepWrapper';

const BENEFIT_OPTIONS = [
  { id: 'dental', label: 'Dental', icon: '\u{1F9B7}' },
  { id: 'vision', label: 'Vision', icon: '\u{1F441}' },
  { id: 'hearing', label: 'Hearing', icon: '\u{1F442}' },
  { id: 'otc', label: 'OTC Allowance', icon: '\u{1F48A}' },
  { id: 'fitness', label: 'Fitness / Gym', icon: '\u{1F3CB}\uFE0F' },
  { id: 'transportation', label: 'Transportation', icon: '\u{1F697}' },
  { id: 'telehealth', label: 'Telehealth', icon: '\u{1F4F1}' },
  { id: 'meals', label: 'Meal Delivery', icon: '\u{1F37D}' },
  { id: 'acupuncture', label: 'Acupuncture', icon: '\u{1F4CD}' },
  { id: 'worldwide', label: 'Worldwide Coverage', icon: '\u{1F30D}' },
];

export default function BenefitsStep() {
  const { benefits, benefitNotes, toggleBenefit, setField } = useCompareStore();

  return (
    <StepWrapper
      label="Preferences"
      title="What benefits matter most?"
      subtitle="We'll prioritize plans with your preferred benefits."
    >
      <div className="flex flex-wrap gap-2">
        {BENEFIT_OPTIONS.map((b) => {
          const selected = benefits.includes(b.id);
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => toggleBenefit(b.id)}
              className={`inline-flex cursor-pointer items-center gap-[5px] rounded-full border-[1.5px] px-4 py-2 font-body text-[13px] font-semibold transition-all ${
                selected
                  ? 'border-primary bg-light-bg text-primary'
                  : 'border-border bg-white text-text-dark hover:border-primary'
              }`}
            >
              {b.icon} {b.label}
            </button>
          );
        })}
      </div>
      <div className="mt-5">
        <label className="mb-1.5 block font-body text-[13px] font-semibold text-text-dark">
          Anything else? (optional)
        </label>
        <textarea
          placeholder="e.g. I travel a lot, need low specialist copays..."
          value={benefitNotes}
          onChange={(e) => setField('benefitNotes', e.target.value)}
          className="min-h-[72px] w-full resize-y rounded-[10px] border-[1.5px] border-border px-4 py-3 font-body text-[15px] text-text-dark outline-none transition-colors focus:border-primary"
        />
      </div>
    </StepWrapper>
  );
}
