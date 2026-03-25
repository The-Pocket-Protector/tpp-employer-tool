import { useCompareStore } from '@/stores/compare.store';
import StepWrapper from './ui/StepWrapper';

const SWITCH_REASONS = [
  'Premium too high',
  'Doctor left network',
  'Drug costs up',
  'Want better benefits',
  'Plan leaving area',
  'Just shopping',
];

export default function CurrentPlanStep() {
  const { currentCarrier, currentPlanName, switchReasons, setField, toggleSwitchReason } =
    useCompareStore();

  return (
    <StepWrapper
      label="Current Plan"
      title="Tell us about your current MA plan"
      subtitle="We'll find better options based on what you have."
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block font-body text-[13px] font-semibold text-text-dark">
            Current carrier
          </label>
          <input
            type="text"
            placeholder="e.g. Humana, UHC, Aetna..."
            value={currentCarrier}
            onChange={(e) => setField('currentCarrier', e.target.value)}
            className="w-full rounded-[10px] border-[1.5px] border-border px-4 py-3 font-body text-[15px] text-text-dark outline-none transition-colors focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1.5 block font-body text-[13px] font-semibold text-text-dark">
            Plan name (optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Humana Gold Plus H1234-001"
            value={currentPlanName}
            onChange={(e) => setField('currentPlanName', e.target.value)}
            className="w-full rounded-[10px] border-[1.5px] border-border px-4 py-3 font-body text-[15px] text-text-dark outline-none transition-colors focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1.5 block font-body text-[13px] font-semibold text-text-dark">
            Why switch?
          </label>
          <div className="flex flex-wrap gap-2">
            {SWITCH_REASONS.map((r) => {
              const selected = switchReasons.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleSwitchReason(r)}
                  className={`inline-flex cursor-pointer items-center gap-[5px] rounded-full border-[1.5px] px-4 py-2 font-body text-[13px] font-semibold transition-all ${
                    selected
                      ? 'border-primary bg-light-bg text-primary'
                      : 'border-border bg-white text-text-dark hover:border-primary'
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </StepWrapper>
  );
}
