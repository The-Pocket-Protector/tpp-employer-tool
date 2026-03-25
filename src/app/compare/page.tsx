import { useNavigate } from 'react-router-dom';
import { useCompareStore } from '@/stores/compare.store';
import type { FlowType } from '@/types/compare';

const LOGO = 'https://cdn.prod.website-files.com/660d27533c9c61d241f50da3/67514f5e4a8f7692896cdc33_the-pocketprotector-logo.png';
const NPN = '21126942';

const FLOWS: { key: FlowType; emoji: string; name: string; desc: string; time: string; featured: boolean; path: string }[] = [
  {
    key: 'ntm',
    emoji: '\u{1F195}',
    name: 'New to Medicare',
    desc: 'Turning 65, leaving employer coverage, or first time on Medicare.',
    time: '~5 min',
    featured: false,
    path: '/ntm',
  },
  {
    key: 'magic',
    emoji: '\u2728',
    name: 'Magic Plan',
    desc: 'Already on MA? We\u2019ll find something better \u2014 or confirm you\u2019re set.',
    time: '~5 min',
    featured: true,
    path: '/magic',
  },
  {
    key: 'pdp',
    emoji: '\u{1F48A}',
    name: 'Part D Finder',
    desc: 'Just need a drug plan? Enter your meds, get the lowest cost.',
    time: '~2 min',
    featured: false,
    path: '/pdp',
  },
];

export default function CompareLanding() {
  const navigate = useNavigate();
  const { setFlow, reset } = useCompareStore();

  function handleSelect(flow: FlowType, path: string) {
    reset();
    setFlow(flow);
    navigate(path);
  }

  return (
    <div className="min-h-screen bg-white font-body text-text-dark antialiased">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap"
      />

      {/* Hero */}
      <div
        className="border-b border-border px-6 pb-11 pt-[52px]"
        style={{ background: 'linear-gradient(175deg, #edf8f2 0%, #fff 55%, #f9faf9 100%)' }}
      >
        <div className="mx-auto max-w-[740px] text-center">
          <div className="mb-5">
            <img src={LOGO} alt="The Pocket Protector" className="mx-auto h-9" />
          </div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border-[1.5px] border-primary/13 bg-white px-[18px] py-[7px]">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#0b7a4b" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="font-body text-xs font-semibold text-primary">
              Compare Plans &mdash; Powered by Real Medicare Data
            </span>
          </div>
          <h1 className="mb-2.5 font-heading text-[34px] font-extrabold leading-[1.2] tracking-[-0.02em] text-text-dark">
            Find your perfect Medicare plan<br />in minutes.
          </h1>
          <p className="mx-auto max-w-[520px] font-body text-[15px] leading-[1.65] text-text-muted">
            Answer a few questions and we&apos;ll match you with the best plan for your doctors,
            drugs, and budget. Same prices as Medicare.gov &mdash; guaranteed.
          </p>
        </div>
      </div>

      {/* Flow cards */}
      <div className="mx-auto max-w-[520px] px-6 pb-[60px] pt-8">
        <div className="mb-5 text-center">
          <h2 className="mb-1 font-heading text-xl font-extrabold text-text-dark">
            Choose your path
          </h2>
          <p className="font-body text-[13px] text-text-muted">
            Each flow ends with a specific plan recommendation.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {FLOWS.map((fl) => (
            <button
              key={fl.key}
              type="button"
              onClick={() => handleSelect(fl.key, fl.path)}
              className={`cursor-pointer rounded-[14px] border-[1.5px] px-5 py-[18px] text-left transition-all hover:-translate-y-px hover:border-primary hover:shadow-[0_4px_16px_rgba(11,122,75,0.13)] ${
                fl.featured
                  ? 'border-primary bg-light-bg'
                  : 'border-border bg-white'
              }`}
            >
              <div className="mb-1.5 flex items-center gap-3">
                <span className="text-2xl">{fl.emoji}</span>
                <span className="font-heading text-[17px] font-bold">{fl.name}</span>
                {fl.featured && (
                  <span className="inline-block rounded bg-primary px-2 py-[2px] font-body text-[10px] font-bold uppercase tracking-[0.06em] text-white">
                    Most Popular
                  </span>
                )}
              </div>
              <div className={`font-body text-[13px] leading-[1.5] ${fl.featured ? 'text-text-dark' : 'text-text-muted'}`}>
                {fl.desc}
              </div>
              <div className="mt-1.5 font-body text-[13px] font-semibold text-primary">
                {fl.time} &rarr;
              </div>
            </button>
          ))}
        </div>

        <div className="mt-9 border-t border-border pt-[18px] text-center font-body text-[11px] leading-[1.6] text-text-muted">
          NPN: {NPN} &middot; Licensed in 48 states &middot; Same prices as Medicare.gov
          <br />
          Free, independent Medicare brokerage. Carriers pay us &mdash; you never pay us.
        </div>
      </div>
    </div>
  );
}
