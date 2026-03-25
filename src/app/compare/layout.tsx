import { Outlet } from 'react-router-dom';
import { useCompareStore } from '@/stores/compare.store';
import { getFlowLength } from '@/stores/flow-config';
import ProgressBar from './components/ui/ProgressBar';
import NavFooter from './components/ui/NavFooter';
import { useCompareSession } from './hooks/useCompareSession';
import './compare.css';

const LOGO = 'https://cdn.prod.website-files.com/660d27533c9c61d241f50da3/67514f5e4a8f7692896cdc33_the-pocketprotector-logo.png';

const FLOW_LABELS: Record<string, string> = {
  ntm: 'New to Medicare',
  magic: 'Magic Plan \u2728',
  pdp: 'Part D Finder',
};

export default function CompareLayout() {
  const { flow, currentStep } = useCompareStore();
  const totalSteps = flow ? getFlowLength(flow) : 0;

  // Auto-sync session on step changes
  useCompareSession();

  return (
    <div className="min-h-screen bg-white font-body text-text-dark antialiased">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap"
      />

      {flow && (
        <>
          <header className="sticky top-0 z-[100] border-b border-border bg-white">
            <div className="mx-auto flex h-[58px] max-w-[1100px] items-center justify-between px-5">
              <img
                src={LOGO}
                alt="The Pocket Protector"
                className="h-8"
              />
              <span className="font-body text-xs font-semibold text-text-muted">
                {FLOW_LABELS[flow] ?? flow}
              </span>
            </div>
            <ProgressBar current={currentStep} total={totalSteps} />
          </header>

          <Outlet />
          <NavFooter />
        </>
      )}

      {!flow && <Outlet />}
    </div>
  );
}
