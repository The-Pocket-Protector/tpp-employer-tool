interface SelectionCardProps {
  icon: string;
  title: string;
  description?: string;
  selected?: boolean;
  badge?: string;
  onClick: () => void;
}

export default function SelectionCard({
  icon,
  title,
  description,
  selected = false,
  badge,
  onClick,
}: SelectionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3.5 rounded-[14px] border-[1.5px] px-[18px] py-[14px] text-left transition-all cursor-pointer
        ${
          selected
            ? 'border-primary bg-light-bg'
            : 'border-border bg-white hover:border-primary'
        }`}
    >
      <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] bg-[#f8f9fa] text-xl">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-body text-[15px] font-semibold text-text-dark">{title}</span>
          {badge && (
            <span className="inline-block rounded bg-primary px-2 py-[2px] font-body text-[10px] font-bold uppercase tracking-[0.06em] text-white">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <div className="mt-[1px] font-body text-xs text-text-muted">{description}</div>
        )}
      </div>
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
          selected ? 'border-primary bg-primary' : 'border-border bg-transparent'
        }`}
      >
        {selected && (
          <svg width="10" height="10" viewBox="0 0 12 12">
            <path d="M2 6l3 3 5-5" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        )}
      </div>
    </button>
  );
}
