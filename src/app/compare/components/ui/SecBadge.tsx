export default function SecBadge() {
  return (
    <div className="flex items-center gap-2 rounded-xl border-[1.5px] border-primary/20 bg-light-bg px-4 py-2.5 font-body text-xs font-semibold text-primary">
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      256-bit encrypted &middot; HIPAA compliant &middot; Never stored or shared
    </div>
  );
}
