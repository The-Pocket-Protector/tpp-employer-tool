interface VerifiedCardProps {
  label: string;
  name: string;
  mbi: string;
  partADate: string;
  partBDate: string;
}

export default function VerifiedCard({ label, name, mbi, partADate, partBDate }: VerifiedCardProps) {
  return (
    <div>
      <div className="mb-5 rounded-[14px] border-[1.5px] border-primary/20 bg-light-bg p-[22px]">
        <div className="mb-3.5 flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l3.5 3.5L13 5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-heading text-[15px] font-bold text-primary">{label}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { l: 'Full Name', v: name },
            { l: 'MBI', v: mbi || '\u2014' },
            ...(partADate && partADate !== '\u2014' ? [{ l: 'Part A Effective', v: partADate }] : []),
            ...(partBDate && partBDate !== '\u2014' ? [{ l: 'Part B Effective', v: partBDate }] : []),
          ].map((x) => (
            <div key={x.l}>
              <div className="mb-[3px] font-body text-[10px] font-bold uppercase tracking-[0.06em] text-primary">
                {x.l}
              </div>
              <div className="font-mono text-[15px] font-bold text-text-dark">{x.v}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-[10px] border border-[#fde68a] bg-[#fffbeb] px-4 py-3 font-body text-xs leading-[1.5] text-[#92400e]">
        <span className="shrink-0">{'\u{1F4A1}'}</span>
        <span>This lets us check eligibility, auto-fill your enrollment, and ensure accurate cost estimates.</span>
      </div>
    </div>
  );
}
