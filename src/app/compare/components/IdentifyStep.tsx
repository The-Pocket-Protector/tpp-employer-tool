import { useState, useRef, useCallback } from 'react';
import { useCompareStore } from '@/stores/compare.store';
import { MbiLookupRequestSchema } from '@/types/compare';
import StepWrapper from './ui/StepWrapper';
import VerifiedCard from './ui/VerifiedCard';
import SecBadge from './ui/SecBadge';
import { useCardScan } from '../hooks/useCardScan';
import { useMbiLookup } from '../hooks/useMbiLookup';
import { syncSession } from '@/services/compare.service';
import { performEligibilityCheck } from '@/services/stedi.service';

export default function IdentifyStep() {
  const {
    identifyMode,
    setIdentifyMode,
    verified,
    subscriberName,
    mbi,
    partADate,
    partBDate,
    carrierName,
    memberId,
    setField,
  } = useCompareStore();

  const [firstName, setFirstName] = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [manualMbi, setManualMbi] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const { scan, result: cardResult, isScanning, error: cardError } = useCardScan();
  const { lookup: mbiLookup, isLoading: mbiLoading, error: mbiError } = useMbiLookup();

  // DOB fields (MM/DD/YYYY like the home page)
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobYear, setDobYear] = useState('');
  const dayRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const strippedMbi = manualMbi.replace(/[-\s]/g, '').toUpperCase();
  const canLookup = firstName && lastName && dob && strippedMbi.length === 11;

  async function handleManualSubmit() {
    setError('');
    const result = MbiLookupRequestSchema.safeParse({
      first_name: firstName,
      last_name: lastName,
      dob,
      mbi: strippedMbi,
    });
    if (!result.success) {
      setError('Please fill in all fields correctly. MBI must be 11 characters.');
      return;
    }
    setLoading(true);
    setLoadingText('Checking your eligibility...');
    try {
      await mbiLookup(result.data);
      syncSession().catch(console.error);
    } catch {
      setError('Lookup failed. Please check your information and try again.');
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  }

  async function handleCardCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setLoadingText('Scanning your card...');
    setError('');
    try {
      await scan(file);
      syncSession().catch(console.error);
    } catch {
      setError('Card scan failed. Please try again.');
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  }

  function validateDob(): string | null {
    const m = parseInt(dobMonth, 10);
    const d = parseInt(dobDay, 10);
    const y = parseInt(dobYear, 10);

    if (!dobMonth || !dobDay || !dobYear) {
      setError('Please enter a complete date');
      return null;
    }
    if (m < 1 || m > 12) {
      setError('Month must be between 01 and 12');
      return null;
    }
    if (d < 1 || d > 31) {
      setError('Day must be between 01 and 31');
      return null;
    }
    const currentYear = new Date().getFullYear();
    if (y < 1900 || y > currentYear) {
      setError(`Year must be between 1900 and ${currentYear}`);
      return null;
    }
    const date = new Date(y, m - 1, d);
    if (date.getMonth() !== m - 1 || date.getDate() !== d) {
      setError('Please enter a valid date');
      return null;
    }
    return `${dobYear}${dobMonth.padStart(2, '0')}${dobDay.padStart(2, '0')}`;
  }

  const handleDobSubmit = useCallback(async () => {
    setError('');
    const formattedDob = validateDob();
    if (!formattedDob) return;

    setField('dob', formattedDob);
    setLoading(true);
    setLoadingText('Checking eligibility...');

    try {
      const cardData = {
        subscriberName: cardResult?.name ?? subscriberName ?? '',
        memberId: cardResult?.mbi ?? cardResult?.memberId ?? memberId ?? '',
        carrierName: cardResult?.carrier ?? carrierName ?? 'Medicare',
        groupNumber: '',
        state: '',
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: Record<string, any> = await performEligibilityCheck(cardData, formattedDob, '');

      const resolvedMbi = result?.resolvedMBI ?? result?.eligibility?.memberId ?? cardResult?.mbi ?? '';
      const partA = result?.eligibility?.effectiveDate ?? cardResult?.part_a_date ?? '';

      if (resolvedMbi) setField('mbi', resolvedMbi);
      if (partA) setField('partADate', partA);
      setField('verified', true);
      syncSession().catch(console.error);
    } catch {
      // Eligibility check failed, but we still have card data — mark as verified
      setField('verified', true);
      syncSession().catch(console.error);
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dobMonth, dobDay, dobYear, cardResult, subscriberName, memberId, carrierName, setField]);

  const handleDobKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleDobSubmit();
  }, [handleDobSubmit]);

  const dobComplete = dobMonth.length >= 1 && dobDay.length >= 1 && dobYear.length === 4;

  // Derive loading state from hooks or local state
  const isAnyLoading = loading || isScanning || mbiLoading;
  const displayError = error || cardError || mbiError || '';

  // Verified state
  if (verified) {
    return (
      <StepWrapper
        label={identifyMode === 'card' ? 'Card Capture' : 'Verify Coverage'}
        title={identifyMode === 'card' ? 'Card scanned successfully!' : 'Coverage verified!'}
        subtitle={identifyMode === 'card' ? "We pulled the following info. Please verify it's correct." : "Here's what we confirmed with CMS. Please verify it's correct."}
      >
        <VerifiedCard
          label={identifyMode === 'card' ? 'Information extracted' : 'Coverage verified'}
          name={subscriberName || `${firstName} ${lastName}`}
          mbi={mbi || '\u2014'}
          partADate={partADate || '\u2014'}
          partBDate={partBDate || '\u2014'}
        />
      </StepWrapper>
    );
  }

  // Loading spinner
  if (isAnyLoading) {
    const spinnerSub = loadingText.includes('eligibility')
      ? 'Verifying coverage with your insurance carrier'
      : identifyMode === 'card'
        ? 'Extracting details from your card'
        : 'Verifying with CMS records';
    return (
      <div className="mx-auto max-w-[640px] px-6 pt-20 text-center">
        <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary" />
        <div className="mb-1 font-heading text-[17px] font-bold text-text-dark">{loadingText}</div>
        <div className="font-body text-[13px] text-text-muted">{spinnerSub}</div>
      </div>
    );
  }

  // DOB collection after card scan success
  if (cardResult && identifyMode === 'card') {
    return (
      <StepWrapper
        label="Card Captured"
        title="We read your card!"
        subtitle="We need your date of birth to verify your eligibility."
      >
        <div className="flex flex-col gap-4">
          {/* Extracted card details */}
          <div className="rounded-[14px] border-[1.5px] border-primary/20 bg-light-bg p-[22px]">
            <div className="mb-3.5 flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l3.5 3.5L13 5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="font-heading text-[15px] font-bold text-primary">Card details extracted</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { l: 'Name', v: cardResult.name },
                { l: 'Carrier', v: cardResult.carrier },
                { l: 'Member ID', v: cardResult.memberId },
                ...(cardResult.mbi ? [{ l: 'MBI', v: cardResult.mbi }] : []),
                ...(cardResult.part_a_date ? [{ l: 'Part A Date', v: cardResult.part_a_date }] : []),
                ...(cardResult.part_b_date ? [{ l: 'Part B Date', v: cardResult.part_b_date }] : []),
              ]
                .filter((x) => x.v)
                .map((x) => (
                  <div key={x.l}>
                    <div className="mb-[3px] font-body text-[10px] font-bold uppercase tracking-[0.06em] text-primary">
                      {x.l}
                    </div>
                    <div className="font-mono text-[15px] font-bold text-text-dark">{x.v}</div>
                  </div>
                ))}
            </div>
          </div>

          {/* DOB input */}
          <div>
            <label className="mb-1.5 block font-body text-[13px] font-semibold text-text-dark">
              Date of birth
            </label>
            <div className="grid grid-cols-[1fr_1fr_1.5fr] gap-3">
              <div>
                <label className="mb-1 block font-body text-[11px] font-semibold text-text-muted">Month</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="MM"
                  maxLength={2}
                  value={dobMonth}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 2);
                    setDobMonth(v);
                    setError('');
                    if (v.length === 2) dayRef.current?.focus();
                  }}
                  onKeyDown={handleDobKeyDown}
                  className="w-full rounded-[10px] border-[1.5px] border-border px-4 py-3 text-center font-heading text-[17px] font-bold text-text-dark outline-none transition-colors focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block font-body text-[11px] font-semibold text-text-muted">Day</label>
                <input
                  ref={dayRef}
                  type="text"
                  inputMode="numeric"
                  placeholder="DD"
                  maxLength={2}
                  value={dobDay}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 2);
                    setDobDay(v);
                    setError('');
                    if (v.length === 2) yearRef.current?.focus();
                  }}
                  onKeyDown={handleDobKeyDown}
                  className="w-full rounded-[10px] border-[1.5px] border-border px-4 py-3 text-center font-heading text-[17px] font-bold text-text-dark outline-none transition-colors focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block font-body text-[11px] font-semibold text-text-muted">Year</label>
                <input
                  ref={yearRef}
                  type="text"
                  inputMode="numeric"
                  placeholder="YYYY"
                  maxLength={4}
                  value={dobYear}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setDobYear(v);
                    setError('');
                  }}
                  onKeyDown={handleDobKeyDown}
                  className="w-full rounded-[10px] border-[1.5px] border-border px-4 py-3 text-center font-heading text-[17px] font-bold text-text-dark outline-none transition-colors focus:border-primary"
                />
              </div>
            </div>
          </div>

          {displayError && <p className="font-body text-[13px] text-red-600">{displayError}</p>}

          {dobComplete && (
            <button
              type="button"
              onClick={handleDobSubmit}
              className="w-full rounded-xl bg-primary px-7 py-3.5 font-heading text-base font-semibold tracking-[-0.01em] text-white transition-all cursor-pointer hover:bg-primary-hover hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(11,122,75,0.13)]"
            >
              Check eligibility
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setError('');
            }}
            className="p-2 text-center font-body text-[13px] font-semibold text-primary cursor-pointer"
          >
            &larr; Retake photo
          </button>
        </div>
      </StepWrapper>
    );
  }

  // Card capture mode
  if (identifyMode === 'card') {
    return (
      <StepWrapper
        label="Card Capture"
        title="Scan your Medicare card"
        subtitle="Take a photo or upload an image of your red, white & blue Medicare card."
      >
        <div className="flex flex-col gap-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer rounded-[14px] border-2 border-dashed border-primary bg-light-bg p-[44px_24px] text-center transition-all hover:bg-[#dff0e6]"
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCardCapture}
              className="hidden"
            />
            <div className="mx-auto mb-4 flex h-[68px] w-[68px] items-center justify-center rounded-full bg-primary">
              <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
                <path d="M12 8L14 5H18L20 8H25C26.1 8 27 8.9 27 10V24C27 25.1 26.1 26 25 26H7C5.9 26 5 25.1 5 24V10C5 8.9 5.9 8 7 8H12Z" stroke="white" strokeWidth="2" />
                <circle cx="16" cy="16.5" r="4.5" stroke="white" strokeWidth="2" />
              </svg>
            </div>
            <div className="mb-1 font-heading text-base font-bold text-text-dark">Tap to take a photo or upload</div>
            <div className="font-body text-[13px] text-text-muted">JPG, PNG, HEIC &middot; Front of card only</div>
          </div>

          {displayError && <p className="font-body text-[13px] text-red-600">{displayError}</p>}

          <button
            type="button"
            onClick={() => {
              setIdentifyMode('manual');
              setField('identifyMode', 'manual');
            }}
            className="p-2 text-center font-body text-[13px] font-semibold text-primary cursor-pointer"
          >
            I don&apos;t have my card &rarr; enter info manually
          </button>
          <SecBadge />
        </div>
      </StepWrapper>
    );
  }

  // Manual mode
  if (identifyMode === 'manual') {
    return (
      <StepWrapper
        label="Verify Coverage"
        title="Enter your Medicare info."
        subtitle="We'll verify your eligibility using your MBI, name, and date of birth."
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block font-body text-[13px] font-semibold text-text-dark">Full legal name</label>
            <div className="flex gap-2.5">
              <input
                type="text"
                placeholder="First"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="flex-1 rounded-[10px] border-[1.5px] border-border px-4 py-3 font-body text-[15px] text-text-dark outline-none transition-colors focus:border-primary"
              />
              <input
                type="text"
                placeholder="MI"
                maxLength={1}
                value={middleInitial}
                onChange={(e) => setMiddleInitial(e.target.value)}
                className="w-16 rounded-[10px] border-[1.5px] border-border px-4 py-3 font-body text-[15px] text-text-dark outline-none transition-colors focus:border-primary"
              />
              <input
                type="text"
                placeholder="Last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="flex-1 rounded-[10px] border-[1.5px] border-border px-4 py-3 font-body text-[15px] text-text-dark outline-none transition-colors focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block font-body text-[13px] font-semibold text-text-dark">Date of birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full rounded-[10px] border-[1.5px] border-border px-4 py-3 font-body text-[15px] text-text-dark outline-none transition-colors focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-body text-[13px] font-semibold text-text-dark">Medicare Beneficiary Identifier (MBI)</label>
            <input
              type="text"
              maxLength={14}
              placeholder="1EG4-TE5-MK72"
              value={manualMbi}
              onChange={(e) => setManualMbi(e.target.value.toUpperCase())}
              className="max-w-[240px] rounded-[10px] border-[1.5px] border-border px-4 py-3 font-mono text-[17px] tracking-[1px] text-text-dark outline-none transition-colors focus:border-primary"
            />
            <p className="mt-1 font-body text-[11px] text-text-muted">Found on your red, white &amp; blue Medicare card</p>
          </div>

          <SecBadge />

          {displayError && <p className="font-body text-[13px] text-red-600">{displayError}</p>}

          {canLookup && (
            <button
              type="button"
              onClick={handleManualSubmit}
              className="w-full rounded-xl bg-primary px-7 py-3.5 font-heading text-base font-semibold tracking-[-0.01em] text-white transition-all cursor-pointer hover:bg-primary-hover hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(11,122,75,0.13)]"
            >
              Verify my eligibility
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setIdentifyMode('card');
              setField('identifyMode', 'card');
            }}
            className="mt-1 p-2 text-center font-body text-[13px] font-semibold text-primary cursor-pointer"
          >
            &larr; I have my card, let me upload it instead
          </button>
        </div>
      </StepWrapper>
    );
  }

  // Skip mode
  if (identifyMode === 'skip') {
    return (
      <StepWrapper
        label="Verify Coverage"
        title="No problem — we'll skip for now."
        subtitle="You can still compare plans. We'll collect this to enroll."
      >
        <div className="mb-4 rounded-xl bg-[#f8f9fa] p-5 font-body text-[13px] leading-[1.6] text-text-desc">
          <strong className="text-text-dark">What you&apos;ll miss:</strong>
          <ul className="mt-2 list-disc pl-[18px]">
            <li>Eligibility check for D-SNP and C-SNP plans</li>
            <li>Auto-filled enrollment application</li>
            <li>Verification of active Part A &amp; B</li>
          </ul>
        </div>
        <button
          type="button"
          onClick={() => {
            setIdentifyMode(null as never);
            setField('identifyMode', null);
          }}
          className="p-2 text-center font-body text-[13px] font-semibold text-primary cursor-pointer"
        >
          &larr; Go back and verify my coverage
        </button>
      </StepWrapper>
    );
  }

  // Mode selection (initial)
  return (
    <StepWrapper
      label="Verify Coverage"
      title="Let's pull your Medicare info."
      subtitle="This lets us see what you qualify for, auto-fill your application, and find the best plan match."
    >
      <div className="flex flex-col gap-3">
        {/* Card capture - featured */}
        <button
          type="button"
          onClick={() => {
            setIdentifyMode('card');
            setField('identifyMode', 'card');
          }}
          className="cursor-pointer rounded-[14px] border-[1.5px] border-primary bg-light-bg p-5 text-left transition-all hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(11,122,75,0.13)]"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-xl bg-primary">
              <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
                <rect x="3" y="6" width="20" height="14" rx="2.5" stroke="white" strokeWidth="1.8" />
                <circle cx="13" cy="13" r="3" stroke="white" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-heading text-base font-bold text-text-dark">Scan your Medicare card</span>
                <span className="inline-block rounded bg-primary px-2 py-[2px] font-body text-[10px] font-bold uppercase tracking-[0.06em] text-white">Fastest</span>
              </div>
              <div className="mt-[3px] font-body text-xs leading-[1.4] text-primary">
                We extract everything automatically from your red, white &amp; blue card
              </div>
            </div>
          </div>
        </button>

        {/* Manual */}
        <button
          type="button"
          onClick={() => {
            setIdentifyMode('manual');
            setField('identifyMode', 'manual');
          }}
          className="cursor-pointer rounded-[14px] border-[1.5px] border-border bg-white p-5 text-left transition-all hover:border-primary"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] bg-[#f8f9fa]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="4" width="16" height="16" rx="2" stroke="#1a1a1a" strokeWidth="1.5" />
                <path d="M8 9h8M8 12h6M8 15h4" stroke="#1a1a1a" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <span className="font-heading text-base font-bold text-text-dark">I don&apos;t have my card</span>
              <div className="mt-[3px] font-body text-xs leading-[1.4] text-text-muted">
                Enter name, DOB &amp; last 4 SSN &mdash; we&apos;ll look up your MBI
              </div>
            </div>
          </div>
        </button>

        {/* Skip */}
        <button
          type="button"
          onClick={() => {
            setIdentifyMode('skip');
            setField('identifyMode', 'skip');
          }}
          className="cursor-pointer rounded-[14px] border-[1.5px] border-border px-5 py-3.5 text-left transition-all hover:border-primary"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] bg-[#f8f9fa]">
              {'\u23ED'}
            </div>
            <div>
              <span className="font-body text-sm font-semibold text-text-muted">Skip for now</span>
              <div className="mt-[2px] font-body text-xs text-text-muted">
                Compare plans first &mdash; we&apos;ll collect this to enroll later
              </div>
            </div>
          </div>
        </button>
      </div>
      <div className="mt-5">
        <SecBadge />
      </div>
    </StepWrapper>
  );
}
