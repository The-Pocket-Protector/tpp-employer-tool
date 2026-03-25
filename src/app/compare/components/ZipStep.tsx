import { useCompareStore } from '@/stores/compare.store';
import StepWrapper from './ui/StepWrapper';

export default function ZipStep() {
  const { zip, setField } = useCompareStore();
  const isValid = /^\d{5}$/.test(zip);

  return (
    <StepWrapper
      label="Location"
      title="What's your zip code?"
      subtitle="We'll find plans and providers available in your area."
    >
      <input
        type="text"
        inputMode="numeric"
        maxLength={5}
        placeholder="e.g. 60614"
        value={zip}
        onChange={(e) => setField('zip', e.target.value.replace(/\D/g, '').slice(0, 5))}
        className="w-full rounded-[10px] border-[1.5px] border-border px-4 py-3 font-body text-[15px] text-text-dark outline-none transition-colors focus:border-primary"
      />
      {isValid && (
        <div className="mt-2.5 font-body text-[13px] font-semibold text-primary">
          {'\u2705'} We found plans in your area
        </div>
      )}
    </StepWrapper>
  );
}
