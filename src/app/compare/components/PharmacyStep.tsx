import { useCompareStore } from '@/stores/compare.store';
import StepWrapper from './ui/StepWrapper';
import SelectionCard from './ui/SelectionCard';

const PHARMACY_TYPES = [
  { key: 'retail' as const, icon: '\u{1F3EA}', title: 'Retail Pharmacy', desc: 'CVS, Walgreens, etc.' },
  { key: 'mail' as const, icon: '\u{1F4E6}', title: 'Mail Order', desc: '90-day delivered' },
  { key: 'preferred' as const, icon: '\u2B50', title: 'Preferred Pharmacy', desc: 'Plan-specific preferred' },
];

export default function PharmacyStep() {
  const { pharmacyType, pharmacyName, setField } = useCompareStore();

  return (
    <StepWrapper
      label="Pharmacy"
      title="How do you fill prescriptions?"
      subtitle="Some plans offer lower copays at preferred or mail-order pharmacies."
    >
      <div className="flex flex-col gap-2.5">
        {PHARMACY_TYPES.map((pt) => (
          <SelectionCard
            key={pt.key}
            icon={pt.icon}
            title={pt.title}
            description={pt.desc}
            selected={pharmacyType === pt.key}
            onClick={() => setField('pharmacyType', pt.key)}
          />
        ))}
      </div>
      {pharmacyType === 'retail' && (
        <div className="mt-3.5">
          <label className="mb-1.5 block font-body text-[13px] font-semibold text-text-dark">
            Preferred pharmacy (optional)
          </label>
          <input
            type="text"
            placeholder="e.g. CVS on Clark St"
            value={pharmacyName}
            onChange={(e) => setField('pharmacyName', e.target.value)}
            className="w-full rounded-[10px] border-[1.5px] border-border px-4 py-3 font-body text-[15px] text-text-dark outline-none transition-colors focus:border-primary"
          />
        </div>
      )}
    </StepWrapper>
  );
}
