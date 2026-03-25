import { useCompareStore } from '@/stores/compare.store';
import type { NtmSituation } from '@/types/compare';
import StepWrapper from './ui/StepWrapper';
import SelectionCard from './ui/SelectionCard';

const SITUATIONS: { key: NtmSituation; icon: string; title: string; description: string }[] = [
  {
    key: 'group',
    icon: '\u{1F3E2}',
    title: 'Leaving employer plan',
    description: 'Retiring or aging into Medicare',
  },
  {
    key: 'retirement',
    icon: '\u{1F389}',
    title: 'Leaving retiree plan',
    description: 'Transitioning from retiree benefits',
  },
  {
    key: 'turning65',
    icon: '\u{1F382}',
    title: 'Turning 65',
    description: 'Entering Medicare for the first time',
  },
  {
    key: 'disability',
    icon: '\u267F',
    title: 'Disability / Under 65',
    description: 'Qualified through disability or ESRD',
  },
];

export default function NtmSituationStep() {
  const { ntmSituation, setField } = useCompareStore();

  return (
    <StepWrapper
      label="Your Situation"
      title="How are you coming to Medicare?"
      subtitle="This helps us understand your timeline and options."
    >
      <div className="flex flex-col gap-2.5">
        {SITUATIONS.map((s) => (
          <SelectionCard
            key={s.key}
            icon={s.icon}
            title={s.title}
            description={s.description}
            selected={ntmSituation === s.key}
            onClick={() => setField('ntmSituation', s.key)}
          />
        ))}
      </div>
    </StepWrapper>
  );
}
