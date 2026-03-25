import { useCompareStore } from '@/stores/compare.store';
import StepWrapper from './ui/StepWrapper';
import SelectionCard from './ui/SelectionCard';

export default function MedicaidStep() {
  const { medicaid, setField } = useCompareStore();

  return (
    <StepWrapper
      label="Dual Eligibility"
      title="Are you on Medicaid?"
      subtitle="Dual-eligible beneficiaries may qualify for D-SNP plans with $0 premiums."
    >
      <div className="flex flex-col gap-2.5">
        <SelectionCard
          icon={'\u2705'}
          title="Yes, I have Medicaid"
          description="Dual-eligible for Medicare + Medicaid"
          selected={medicaid === 'yes'}
          onClick={() => setField('medicaid', 'yes')}
        />
        <SelectionCard
          icon={'\u274C'}
          title="No Medicaid"
          selected={medicaid === 'no'}
          onClick={() => setField('medicaid', 'no')}
        />
        <SelectionCard
          icon={'\u2753'}
          title="I'm not sure"
          description="We can help check"
          selected={medicaid === 'unsure'}
          onClick={() => setField('medicaid', 'unsure')}
        />
      </div>
    </StepWrapper>
  );
}
