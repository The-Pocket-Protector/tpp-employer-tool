interface StepWrapperProps {
  label: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function StepWrapper({ label, title, subtitle, children }: StepWrapperProps) {
  return (
    <div className="mx-auto max-w-[640px] px-6 pt-11 pb-[130px]">
      <div className="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-primary font-body">
        {label}
      </div>
      <h1 className="mb-1.5 font-heading text-[28px] font-extrabold leading-[1.25] tracking-[-0.01em] text-text-dark">
        {title}
      </h1>
      {subtitle && (
        <p className="mb-8 font-body text-sm leading-[1.65] text-text-muted">{subtitle}</p>
      )}
      {children}
    </div>
  );
}
