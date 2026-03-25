import { useEffect, useState } from 'react';
import { useCompareStore } from '@/stores/compare.store';
import { submitForRecommendation, updateCompareSession } from '@/services/compare.service';
import type { PlanRecommendation } from '@/types/compare';

const NPN = '21126942';

export default function RecommendationPage() {
  const store = useCompareStore();
  const { flow, mbi, sessionId, recommendations, setRecommendations } = store;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchRecommendations() {
      setLoading(true);
      setError(null);
      try {
        // Final session sync before fetching recommendations
        if (sessionId) {
          await updateCompareSession(sessionId, store).catch((err) =>
            console.error('Failed to sync session before recommend:', err),
          );
        }
        const result = await submitForRecommendation(store);
        if (cancelled) return;
        setRecommendations(result.recommendations ?? [], sessionId || '');
      } catch (err) {
        if (cancelled) return;
        console.error('Recommendation fetch failed:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load recommendations. Please try again.',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRecommendations();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pt = flow === 'pdp' ? 'Part D' : 'Medicare Advantage';

  if (loading) {
    return (
      <div className="mx-auto max-w-[640px] px-6 pt-20 text-center">
        <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary" />
        <h2 className="mb-1.5 font-heading text-[22px] font-extrabold text-text-dark">
          Analyzing your profile...
        </h2>
        <p className="font-body text-sm text-text-muted">
          {flow === 'pdp'
            ? 'Comparing Part D plans'
            : flow === 'magic'
              ? 'Running the Magic Plan algorithm'
              : 'Matching to your needs'}
        </p>
        {mbi && (
          <p className="mt-2 font-body text-xs font-semibold text-primary">
            {'\u2705'} MBI verified &middot; Checking eligibility
          </p>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[640px] px-6 pt-20 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl">
          {'\u26A0\uFE0F'}
        </div>
        <h2 className="mb-2 font-heading text-[22px] font-extrabold text-text-dark">
          Something went wrong
        </h2>
        <p className="mb-6 font-body text-sm text-text-muted">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="cursor-pointer rounded-[10px] bg-primary px-6 py-3 font-heading text-base font-semibold text-white transition-all hover:bg-primary-hover"
        >
          Try Again
        </button>
      </div>
    );
  }

  const topPlans = (recommendations ?? []).slice(0, 3);
  const primary = topPlans[0] as PlanRecommendation | undefined;
  const runners = topPlans.slice(1);

  if (!primary) {
    return (
      <div className="mx-auto max-w-[640px] px-6 pt-20 text-center">
        <h2 className="mb-2 font-heading text-[22px] font-extrabold text-text-dark">
          No plans found
        </h2>
        <p className="font-body text-sm text-text-muted">
          We couldn&apos;t find any matching plans for your area and preferences. Try adjusting your
          criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[640px] px-6 pt-11 pb-[60px]">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
            <path
              d="M6 14l6 6L22 8"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-primary font-body">
          Your {pt} Recommendation
        </div>
        <h1 className="mb-1.5 font-heading text-2xl font-extrabold leading-[1.25] tracking-[-0.01em] text-text-dark">
          {primary.plan_name}
        </h1>
        <p className="font-body text-sm text-text-muted">
          {primary.carrier} &middot;{' '}
          {primary.star_rating != null && <>{primary.star_rating}&star; &middot; </>}
          {primary.contract_id}-{primary.plan_id}
        </p>
        {mbi && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-light-bg px-3.5 py-1 font-body text-[11px] font-bold text-primary">
            {'\u{1F512}'} Verified MBI: {mbi}
          </div>
        )}
      </div>

      {/* Primary plan stats grid */}
      <div className="mb-4 grid grid-cols-2 gap-2.5">
        {[
          {
            l: 'Monthly Premium',
            v: `$${primary.monthly_premium.toFixed(2)}`,
          },
          {
            l: 'Est. Drug Costs',
            v:
              primary.estimated_annual_drug_cost != null
                ? `$${Math.round(primary.estimated_annual_drug_cost / 12)}/mo`
                : 'N/A',
          },
          {
            l: 'Star Rating',
            v: primary.star_rating != null ? `${primary.star_rating}/5` : 'N/A',
          },
          {
            l: 'Max Out-of-Pocket',
            v: primary.moop != null ? `$${primary.moop.toLocaleString()}` : 'N/A',
          },
        ].map((x) => (
          <div key={x.l} className="rounded-xl bg-[#f8f9fa] p-3.5 text-center">
            <div className="mb-[3px] font-body text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">
              {x.l}
            </div>
            <div className="font-heading text-xl font-extrabold text-text-dark">{x.v}</div>
          </div>
        ))}
      </div>

      {/* Overall score + drug coverage */}
      {(primary.overall_score != null || primary.drugs_covered != null) && (
        <div className="mb-4 grid grid-cols-2 gap-2.5">
          {primary.overall_score != null && (
            <div className="rounded-xl bg-[#f8f9fa] p-3.5 text-center">
              <div className="mb-[3px] font-body text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">
                Overall Score
              </div>
              <div className="font-heading text-xl font-extrabold text-primary">
                {primary.overall_score}
              </div>
            </div>
          )}
          {primary.drugs_covered != null && primary.drugs_total != null && (
            <div className="rounded-xl bg-[#f8f9fa] p-3.5 text-center">
              <div className="mb-[3px] font-body text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">
                Drugs Covered
              </div>
              <div className="font-heading text-xl font-extrabold text-text-dark">
                {primary.drugs_covered}/{primary.drugs_total}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Key benefits */}
      {primary.key_benefits && primary.key_benefits.length > 0 && (
        <div className="mb-4 rounded-xl bg-[#f8f9fa] p-4">
          <div className="mb-2 font-body text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">
            Key Benefits
          </div>
          <ul className="list-disc space-y-1 pl-4 font-body text-[13px] leading-[1.6] text-text-dark">
            {primary.key_benefits.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Reasoning */}
      {primary.reasoning && (
        <div className="mb-7 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="mb-1 font-body text-[11px] font-semibold uppercase tracking-[0.04em] text-primary">
            Why We Recommend This Plan
          </div>
          <p className="font-body text-[13px] leading-[1.6] text-text-dark">{primary.reasoning}</p>
        </div>
      )}

      {/* Enrollment section */}
      <div className="mb-3.5">
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-primary font-body">
          Choose how to enroll
        </div>
        <h2 className="mb-1.5 font-heading text-[22px] font-extrabold leading-[1.25] tracking-[-0.01em] text-text-dark">
          Three ways &mdash; same price.
        </h2>
        <p className="mb-5 font-body text-[13px] text-text-muted">
          Same premium no matter how you enroll.
        </p>
      </div>

      {/* TPP - Recommended */}
      <div className="relative mb-3.5 rounded-[14px] border-[1.5px] border-primary bg-light-bg p-[22px]">
        <div className="absolute -top-[11px] left-[18px]">
          <span className="inline-block rounded bg-primary px-2 py-[2px] font-body text-[10px] font-bold uppercase tracking-[0.06em] text-white">
            Recommended
          </span>
        </div>
        <div className="mb-2.5 flex items-center gap-3">
          <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] bg-primary text-white">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <div className="font-heading text-base font-bold text-text-dark">
              Enroll through TPP
            </div>
            <div className="font-body text-xs text-primary">
              {mbi ? 'Auto-filled \u00b7 ' : ''}Fastest &middot; Ongoing Support
            </div>
          </div>
        </div>
        <div className="mb-3.5 font-body text-[13px] leading-[1.65] text-text-dark">
          {mbi ? (
            <>
              Your application is <strong>pre-filled</strong> with your verified Medicare info
              &mdash; just review and submit.{' '}
            </>
          ) : (
            <>We autofill your application &mdash; most people finish in under 3 minutes. </>
          )}
          Guaranteed access to TPP&apos;s ongoing support and claims handling.
        </div>
        <ul className="mb-3.5 list-disc space-y-0.5 pl-4 font-body text-xs leading-[1.8] text-text-dark">
          <li>{mbi ? 'MBI verified \u2014 application pre-filled' : 'Pre-filled application'}</li>
          <li>Licensed agent reviews for errors</li>
          <li>Year-round claims help</li>
          <li>Annual AEP plan review</li>
        </ul>
        <div className="block w-full rounded-[10px] bg-border px-6 py-3 text-center font-heading text-base font-semibold tracking-[-0.01em] text-text-muted cursor-not-allowed">
          Coming soon
        </div>
      </div>

      {/* Medicare.gov */}
      {primary.enrollment_url && (
        <div className="mb-3.5 rounded-[14px] border-[1.5px] border-border p-[22px]">
          <div className="mb-2.5 flex items-center gap-3">
            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] bg-[#0071bc] font-heading text-base font-extrabold text-white">
              M
            </div>
            <div>
              <div className="font-heading text-base font-bold text-text-dark">
                Enroll on Medicare.gov
              </div>
              <div className="font-body text-xs text-text-muted">
                Same price &middot; Government portal
              </div>
            </div>
          </div>
          <div className="mb-3.5 font-body text-[13px] leading-[1.6] text-text-muted">
            Same plan, same price via CMS. Use our NPN (
            <strong className="text-text-dark">{NPN}</strong>) for continued support.
          </div>
          <a
            href={primary.enrollment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full cursor-pointer rounded-xl border-[1.5px] border-border bg-transparent px-5 py-2.5 text-center font-body text-[15px] font-semibold text-text-desc transition-all hover:border-primary"
          >
            Go to Medicare.gov &rarr;
          </a>
        </div>
      )}

      {/* Carrier direct */}
      {primary.enrollment_tier && primary.enrollment_tier !== 'medicare.gov' && (
        <div className="mb-7 rounded-[14px] border-[1.5px] border-border p-[22px]">
          <div className="mb-2.5 flex items-center gap-3">
            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] bg-[#f8f9fa] text-xl">
              {'\u{1F3DB}'}
            </div>
            <div>
              <div className="font-heading text-base font-bold text-text-dark">
                Enroll with {primary.carrier}
              </div>
              <div className="font-body text-xs text-text-muted">
                Same price &middot; Carrier website
              </div>
            </div>
          </div>
          <div className="mb-3.5 font-body text-[13px] leading-[1.6] text-text-muted">
            Same plan, same price &mdash; enter info from scratch on {primary.carrier}&apos;s site.
          </div>
          <div className="block w-full rounded-xl border-[1.5px] border-border bg-transparent px-5 py-2.5 text-center font-body text-[15px] font-semibold text-text-muted cursor-not-allowed">
            Coming soon
          </div>
        </div>
      )}

      {/* If no enrollment_tier or it is medicare.gov, still show carrier option with no link */}
      {(!primary.enrollment_tier || primary.enrollment_tier === 'medicare.gov') && (
        <div className="mb-7 rounded-[14px] border-[1.5px] border-border p-[22px]">
          <div className="mb-2.5 flex items-center gap-3">
            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] bg-[#f8f9fa] text-xl">
              {'\u{1F3DB}'}
            </div>
            <div>
              <div className="font-heading text-base font-bold text-text-dark">
                Enroll with {primary.carrier}
              </div>
              <div className="font-body text-xs text-text-muted">
                Same price &middot; Carrier website
              </div>
            </div>
          </div>
          <div className="mb-3.5 font-body text-[13px] leading-[1.6] text-text-muted">
            Same plan, same price &mdash; visit {primary.carrier}&apos;s website directly to enroll.
          </div>
        </div>
      )}

      {/* Runner-up plans */}
      {runners.length > 0 && (
        <div className="mb-7">
          <div className="mb-3 text-xs font-bold uppercase tracking-[0.06em] text-text-muted font-body">
            Other Top Plans
          </div>
          <div className="flex flex-col gap-3">
            {runners.map((plan) => (
              <PlanCard key={`${plan.contract_id}-${plan.plan_id}`} plan={plan} />
            ))}
          </div>
        </div>
      )}

      {/* Disclaimers */}
      {primary.disclaimers && primary.disclaimers.length > 0 && (
        <div className="mb-5 rounded-xl bg-[#f8f9fa] p-4">
          <div className="mb-1 font-body text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">
            Disclaimers
          </div>
          {primary.disclaimers.map((d, i) => (
            <p key={i} className="font-body text-[11px] leading-[1.5] text-text-muted">
              {d}
            </p>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-border pt-[18px] text-center font-body text-[11px] leading-[1.6] text-text-muted">
        The Pocket Protector &middot; NPN: {NPN} &middot; Same price regardless of enrollment
        method.
        <br />
        Licensed, independent Medicare brokerage. Carriers pay us &mdash; you never pay us.
      </div>
    </div>
  );
}

/** Compact card for runner-up plans (#2, #3) */
function PlanCard({ plan }: { plan: PlanRecommendation }) {
  return (
    <div className="rounded-[14px] border-[1.5px] border-border p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <div className="font-heading text-[15px] font-bold text-text-dark">{plan.plan_name}</div>
          <div className="font-body text-xs text-text-muted">
            {plan.carrier} &middot; {plan.plan_type}
            {plan.star_rating != null && <> &middot; {plan.star_rating}&star;</>}
          </div>
        </div>
        {plan.overall_score != null && (
          <div className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1 text-center">
            <div className="font-heading text-sm font-extrabold text-primary">
              {plan.overall_score}
            </div>
            <div className="font-body text-[9px] uppercase text-primary/70">Score</div>
          </div>
        )}
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <div className="text-center">
          <div className="font-body text-[10px] font-semibold uppercase text-text-muted">
            Premium
          </div>
          <div className="font-heading text-sm font-extrabold text-text-dark">
            ${plan.monthly_premium.toFixed(2)}
          </div>
        </div>
        <div className="text-center">
          <div className="font-body text-[10px] font-semibold uppercase text-text-muted">
            Drug Cost
          </div>
          <div className="font-heading text-sm font-extrabold text-text-dark">
            {plan.estimated_annual_drug_cost != null
              ? `$${Math.round(plan.estimated_annual_drug_cost / 12)}/mo`
              : 'N/A'}
          </div>
        </div>
        <div className="text-center">
          <div className="font-body text-[10px] font-semibold uppercase text-text-muted">MOOP</div>
          <div className="font-heading text-sm font-extrabold text-text-dark">
            {plan.moop != null ? `$${plan.moop.toLocaleString()}` : 'N/A'}
          </div>
        </div>
      </div>

      {plan.key_benefits && plan.key_benefits.length > 0 && (
        <ul className="mb-3 list-disc space-y-0.5 pl-4 font-body text-[12px] leading-[1.6] text-text-muted">
          {plan.key_benefits.slice(0, 3).map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}

      {plan.reasoning && (
        <p className="mb-3 font-body text-[12px] leading-[1.5] text-text-muted italic">
          {plan.reasoning}
        </p>
      )}

      <div className="block w-full rounded-[10px] border-[1.5px] border-border bg-transparent px-5 py-2.5 text-center font-body text-[13px] font-semibold text-text-muted cursor-not-allowed">
        Coming soon
      </div>
    </div>
  );
}
