# Med Supp Plan Recommendation Calculator — Logic & Methodology
**The Pocket Protector | Internal Reference Document**
*Last updated: 2026-03-05*

---

## Purpose

This document defines the complete decision logic, scoring framework, and recommendation engine behind TPP's Medicare Supplement (Medigap) Plan Recommendation Calculator. It is intended for internal use by engineers, compliance reviewers, and advisors who maintain or audit the tool.

The calculator is not a quoting tool. It does not surface prices from carriers. It recommends **the right plan type** (e.g., Plan G vs. Plan N) and **the right carrier profile** (based on stability, claims performance, and 10-year cost trajectory) for a specific person based on their circumstances. Live pricing is then pulled from CSG Actuarial for the winning plan type and carrier set.

---

## Section 1: Inputs Collected

The calculator collects the following inputs from the user in order:

### 1.1 Age
- Collected as: exact age (integer)
- Why it matters:
  - Determines which plans are available (Plan F/C only for those eligible before Jan 1, 2020 — i.e., turned 65 before 2020)
  - Determines pricing methodology impact (attained-age vs. issue-age vs. community-rated)
  - Affects long-term cost trajectory modeling
  - If age < 65: flag as pre-Medicare, redirect to calendar/deadline tool
  - If age = 65 and within 6-month OEP window: flag as GI eligible (no underwriting)
  - If age > 65 and no GI right: underwriting will be required in most states

### 1.2 Current Insurance / Coverage Situation
Options presented:
- **New to Medicare (turning 65 soon or just enrolled)** → In OEP window, GI rights apply
- **Medicare Advantage plan** → Switching to Medigap; requires underwriting in most states (except MAOEP or Trial Rights Period)
- **Medicare Supplement (already have one)** → Looking to switch carriers or upgrade plan
- **Original Medicare only (Parts A & B, no supplement)** → No Medigap; underwriting likely required
- **Employer/Union coverage + Medicare** → Coordination of benefits logic; may have GI rights when employer coverage ends
- **Medicaid / Dual eligible** → Flag; Medigap generally not needed/appropriate; redirect

Why it matters:
- Determines GI eligibility (no underwriting = any plan available regardless of health)
- Determines urgency (OEP windows are time-limited)
- If on Medicare Advantage: must drop MA plan before Medigap takes effect; illegal to hold both simultaneously
- If already on a Medigap: carrier switch is possible; plan upgrade is subject to underwriting (downgrade is easier)

### 1.3 New to Medicare?
- Yes / No (with clarifying sub-questions if needed)
- "New" = within 6-month Medigap Open Enrollment Period (starts when enrolled in Part B at 65+)
- This is the single most important window in a person's Medicare life — GI rights are absolute during OEP

### 1.4 Zip Code
- Collected as: 5-digit zip code
- Used to determine:
  - **State** → which GI/birthday rules apply
  - **Plan availability** → not all plans offered in all areas (MA, MN, WI have their own standardized plans)
  - **Carrier availability** → not all carriers operate in all states
  - **Pricing** → Medigap premiums vary significantly by geography
  - **Rating methodology** → some states mandate community rating (NY, CT) which changes the long-term cost math

### 1.5 Health Status (for underwriting screening — only asked if NOT in GI window)
- General self-assessment: Excellent / Good / Fair / Poor
- Key conditions checklist (common knockouts for Medigap underwriting):
  - Heart disease / heart attack / bypass surgery
  - Stroke or TIA
  - Cancer (within last X years, varies by carrier)
  - Chronic kidney disease / dialysis
  - COPD / emphysema
  - Diabetes with complications
  - Dementia / Alzheimer's
  - Currently in a skilled nursing facility
- Why it matters: If health is poor and no GI right exists, the calculator must flag that Plan G/N may be unattainable and redirect to Medicare Advantage as a fallback

---

## Section 2: State Classification Logic

### 2.1 GI / Open Enrollment States (Year-Round or Near-Year-Round)
These states allow switching without underwriting outside the standard OEP:

| State | Rule |
|-------|------|
| New York | Year-round guaranteed issue for all Medigap plans |
| Connecticut | Year-round guaranteed issue for all Medigap plans |
| Vermont | Many carriers offer year-round GI (not all) |
| Maine | Continuous open enrollment with 6-month wait on pre-existing conditions |
| Massachusetts | Has its own standardized plans (Core, Supplement 1, Supplement 1A) — not standard A–N |
| Minnesota | Has its own standardized plans (Basic, Extended Basic) — not standard A–N |
| Wisconsin | Has its own standardized plans — not standard A–N |
| Washington | Open enrollment year-round under certain conditions |

### 2.2 Birthday Rule States
These states allow switching to an equal or lesser plan within 30–63 days of birthday annually, without underwriting:

| State | Window |
|-------|--------|
| California | 30 days after birthday |
| Idaho | 63 days after birthday (as of 2024) |
| Illinois | 45 days after birthday |
| Kentucky | 60 days after birthday (enacted 2024) |
| Louisiana | 30 days after birthday |
| Maryland | 30 days after birthday |
| Nevada | 60 days after birthday |
| Oklahoma | 60 days after birthday |
| Oregon | 30 days after birthday |
| Rhode Island | 30 days after birthday (continuous coverage required) |
| Utah | Can switch within same carrier without underwriting (effective May 2025) |

### 2.3 Standard States
All other states: underwriting required outside the 6-month OEP, except for federally protected GI events (loss of employer coverage, MA plan leaving area, carrier insolvency, etc.).

### 2.4 Special Cases
- **Massachusetts, Minnesota, Wisconsin**: Use their own plan structures. The calculator must detect these states and redirect to state-specific plan logic (not the standard A–N framework).
- For the MVP build, these three states show a "Contact an advisor" recommendation, as the plan structures are materially different.

---

## Section 3: Plan Selection Logic

### 3.1 Available Plans (Standard States, Medicare-eligible on/after Jan 1, 2020)
Plans available: **A, B, D, G, High-Deductible G, K, L, N**
Plans NOT available to those newly eligible after Jan 1, 2020: **C, F, High-Deductible F**

### 3.2 Plan Comparison Matrix

| Benefit | A | B | D | G | Hi-Ded G | K | L | N |
|---------|---|---|---|---|----------|---|---|---|
| Part A hospital coinsurance + 365 days | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Part A deductible | ✗ | ✓ | ✓ | ✓ | ✓ | 50% | 75% | ✓ |
| Part A hospice coinsurance | ✓ | ✓ | ✓ | ✓ | ✓ | 50% | 75% | ✓ |
| Part B coinsurance | ✓ | ✓ | ✓ | ✓ | ✓ | 50% | 75% | ✓* |
| Part B deductible ($257 in 2025) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Part B excess charges | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Skilled nursing coinsurance | ✗ | ✗ | ✓ | ✓ | ✓ | 50% | 75% | ✓ |
| Foreign travel emergency | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| Out-of-pocket limit (2025) | None | None | None | None | $2,870 ded | $7,220 | $3,610 | None |

*Plan N: Covers Part B coinsurance but with copays of up to $20 for office visits and up to $50 for ER visits (waived if admitted).

### 3.3 Plan Elimination Logic

Apply filters in this order to narrow to recommended plan(s):

**Step 1 — Eliminate plans based on eligibility**
- If Medicare-eligible on/after Jan 1, 2020: eliminate F and C from consideration

**Step 2 — Eliminate low-coverage plans for most users**
- Plans A, B: only cover hospital coinsurance/deductible. Almost never the right answer unless budget is severely constrained. Eliminate unless budget < $80/month.
- Plans K, L: cost-sharing plans (50%/75%). Low premium, but significant out-of-pocket exposure. Eliminate unless user explicitly prefers lower premium with cost-sharing (unusual for the TPP customer profile).
- Plan M: covers 50% of Part A deductible; niche plan, rarely available. Eliminate.
- Plan D: lacks Part B excess charge coverage; rarely sold; largely replaced by G. Eliminate.

**Step 3 — Core decision: Plan G vs. Plan N**

This is the key fork for most users:

| Factor | Favors Plan G | Favors Plan N |
|--------|--------------|--------------|
| Health utilization | Frequent doctor visits (6+/yr) | Infrequent doctor visits (1-2/yr) |
| Specialist visits | Regular specialist use | Rare specialist use |
| Part B excess charge exposure | Lives in state where providers can charge excess | Providers in area accept assignment |
| Budget preference | Will pay more for certainty | Wants lowest monthly premium |
| Risk tolerance | Low (wants $0 out of pocket) | Higher (comfortable with copays) |
| Age | 70+ (higher utilization likely) | 65–68 (lower utilization likely) |
| Health status | Fair/Poor | Excellent/Good |
| GI window | Either (doesn't affect coverage choice) | Either |
| State | Non-excess-charge state | State where providers rarely charge excess |

**Plan G wins when:** The premium difference vs. Plan N is ≤ $30-40/month AND the user visits doctors regularly OR has any chronic conditions.

**Plan N wins when:** The premium gap is > $40-50/month AND the user is healthy, newly enrolled, and lives in an area where excess charges are rare. Plan N is increasingly competitive in 2025-2026.

**High-Deductible Plan G wins when:** User is healthy, 65-67, wants lowest possible premium, can absorb the $2,870 deductible (2025), and treats it like a high-deductible health plan.

### 3.4 Final Plan Output
The calculator produces a **ranked recommendation** of 1-2 plans, e.g.:
- **#1 Recommendation: Plan G** — with explanation
- **#2 Also consider: Plan N** — with explanation of tradeoffs

---

## Section 4: Carrier Scoring & 10-Year Cost Modeling

This is the most differentiated part of the tool. Plan selection is only half the answer — carrier selection determines real 10-year cost.

### 4.1 Why Carrier Matters

All Medigap plans of the same letter are **standardized by federal law** — a Plan G from Carrier A covers exactly the same benefits as a Plan G from Carrier B. The differences are:
1. Premium (today's price)
2. Rating methodology (how premiums grow over time)
3. Rate increase history (actual behavior)
4. Claims payment (speed, denial rates)
5. Financial stability (will they still be around?)
6. Customer service (NAIC complaint index)

A carrier that prices Plan G at $120/month today but raises rates 12%/year is dramatically worse than one at $145/month with 4%/year increases. Over 10 years, the cheaper-today carrier ends up costing $40,000+ more in cumulative premiums.

### 4.2 Rating Methodology (Critical for Long-Term Cost)

**Attained-Age Rated** (most common):
- Premiums based on your current age
- Price increases both from age and from general rate actions
- Cheap at 65, increasingly expensive by 75-85
- Worst long-term value, best short-term price
- Must flag clearly: "This plan is cheap now but will get significantly more expensive as you age."

**Issue-Age Rated**:
- Premium locked to age at enrollment
- Only general rate actions cause increases (not aging)
- More expensive initially, better long-term value
- Best for someone who enrolls at 65 and plans to stay

**Community Rated**:
- Same price for everyone regardless of age
- Mandated in: NY, CT (and some others)
- Generally higher premiums at 65 but never increases due to age
- Best long-term value in states that mandate it

**Scoring rule:**
- Community rated: +20 points (long-term value)
- Issue-age rated: +15 points
- Attained-age rated: 0 points (baseline; penalize more below if rate history is bad)

### 4.3 Carrier Rate Stability Scoring (2024-2025 data)

Based on actuarial data from Telos Actuarial Q2 2025 analysis and independent broker research:

| Carrier | Plan G Avg Annual Increase (2022-2025) | Plan N Avg Annual Increase | Trend | Score |
|---------|---------------------------------------|---------------------------|-------|-------|
| Cigna/Cigna Healthcare | ~5-7% (consistent with historical) | ~5-7% | Stable | 90/100 |
| Humana | ~5-7% (consistent) | ~5-7% | Stable | 85/100 |
| UnitedHealthcare/AARP | ~6-8% (stable, slight uptick) | ~6-8% | Stable | 83/100 |
| Mutual of Omaha | ~8-12% (elevated in 2024-2025) | ~10%+ | Trending up | 65/100 |
| Aetna | ~10-12%+ (significantly elevated 2024-2025) | ~12%+ | Concerning | 55/100 |
| BCBS (varies by state affiliate) | ~5-9% (varies widely) | ~5-9% | Varies | 75/100 |
| Physicians Mutual | ~5-7% | ~5-7% | Stable | 82/100 |
| United American | ~6-8% | ~6-8% | Stable | 78/100 |

**Important caveat:** Rate increases vary by state and by block of business. These are directional national averages. The tool should present these as guidance, not guarantees, and should note the data vintage.

**Scoring rule for rate history:**
- Avg annual increase < 6%: +25 points
- Avg annual increase 6-8%: +15 points
- Avg annual increase 8-10%: +5 points
- Avg annual increase > 10%: -10 points (active penalty)
- Increasing trend (getting worse): -10 points additional

### 4.4 Financial Strength / Claims Performance Scoring

| Rating | Score |
|--------|-------|
| A.M. Best A++ | +20 |
| A.M. Best A+ | +18 |
| A.M. Best A | +15 |
| A.M. Best A- | +10 |
| A.M. Best B+ or below | +0 (flag) |

**A.M. Best ratings as of 2025-2026:**
- UnitedHealthcare: A (downgraded from A+ Aug 2025, outlook stable)
- Cigna: A (affirmed April 2025)
- Humana: A-
- Aetna (CVS Health): A
- Mutual of Omaha: A+
- BCBS affiliates: A or A+ (most affiliates)
- Physicians Mutual: A+
- United American: A

**NAIC Complaint Index:**
- Below 1.0 = better than industry average
- Mutual of Omaha: industry-low complaint index (strong)
- UnitedHealthcare: generally good
- Humana: mixed by state
- Aetna: mixed; some markets elevated complaints
- Score: (1.0 - complaint_index) × 15, capped at 15

### 4.5 10-Year Cumulative Cost Model

For each carrier/plan combination, calculate:

```
Year 0 premium = quoted monthly premium × 12
Year N premium = Year 0 × (1 + avg_annual_rate_increase)^N × (1 + aging_factor_if_attained_age)^N
10-Year total = Sum of Year 0 through Year 9 annual premiums
```

**Aging factor for attained-age rated plans:**
- Age 65-70: +1.5-2.5% per year from aging alone (varies by carrier/state)
- Age 70-75: +2-3% per year
- Age 75+: +2.5-4% per year
- This compounds on top of general rate increases

**Example output (illustrative):**
- Carrier A: Plan G @ $145/month today, 6% avg increases, issue-age rated
  - Year 1: $1,740 | Year 5: $2,328 | Year 10: $3,117 | **10-yr total: ~$24,800**
- Carrier B: Plan G @ $118/month today, 11% avg increases, attained-age rated
  - Year 1: $1,416 | Year 5: $2,378 | Year 10: $4,000 | **10-yr total: ~$27,900**

Carrier A costs $27/month more today but saves ~$3,100 over 10 years.

### 4.6 Claims Payment / Out-of-Pocket Risk

Medigap plans are legally required to pay claims that Medicare approves. However:
- **Slow claims processing** creates friction (providers may bill patients while waiting)
- **Claim denials on coordination errors** create hassle and potential out-of-pocket exposure
- **Network issues** don't apply to Medigap (it follows Medicare's network, which is nationwide) — but advisor availability and support quality matter

Scoring factor: use NAIC complaint index as proxy for claims experience (no public claims-speed database exists).

---

## Section 5: Recommendation Output Logic

### 5.1 Composite Carrier Score (out of 100)

```
Carrier Score = 
  Rating methodology score (0-20)
  + Rate history score (0-25, with penalty down to -20)
  + A.M. Best score (0-20)
  + NAIC complaint score (0-15)
  + Market presence/availability (0-10)
  + 10-year cost efficiency vs. average (0-10)
```

### 5.2 Output Format

The tool produces a recommendation with:

1. **Recommended Plan** (e.g., "Plan G")
   - One-line why
   - What it covers vs. what you pay out of pocket
   - Monthly premium range (pulled from CSG for the user's zip + age + gender)

2. **Top 2-3 Carrier Recommendations** ranked by composite score
   - Current monthly premium
   - Estimated 10-year total cost
   - Rate stability rating (color coded: Green / Yellow / Red)
   - A.M. Best rating
   - Key pro/con

3. **Underwriting status**
   - GI window: "Great news — you're in your open enrollment window. Any carrier must accept you regardless of your health history."
   - Non-GI, healthy: "Based on your health profile, you should be able to qualify for most carriers."
   - Non-GI, health flags: "Given your health history, some carriers may decline your application. We recommend starting with [carrier X] which has more lenient underwriting for your situation."

4. **State-specific flags**
   - Birthday rule state: "You're in [State], which has a birthday rule — you can switch carriers once a year near your birthday without underwriting."
   - GI state (NY/CT): "In [State], you can apply for any Medigap plan at any time — no underwriting required."
   - MA/MN/WI: "Your state uses a different plan structure. An advisor can walk you through your specific options."

5. **Part D Drug Plan reminder**
   - "Medigap doesn't cover prescriptions. You'll need a separate Part D plan. Want help finding the right one?"

6. **Next step CTA**
   - If GI window: "You're in your open enrollment window — this is your best chance to lock in the right plan. Start your application now."
   - If not GI: "Ready to apply? We'll check your eligibility and walk you through it."

---

## Section 6: Special Scenarios & Edge Cases

### 6.1 Currently on Medicare Advantage — Wants to Switch to Medigap
- **Flag:** Cannot hold both MA and Medigap simultaneously
- **Key question:** When does MA plan end? (AEP: Oct 15 – Dec 7, effective Jan 1; OEP: Jan 1 – Mar 31 for switching back to Original Medicare)
- **Trial Rights:** If enrolled in MA during initial Medicare enrollment and switching back within 12 months → GI rights apply
- **Otherwise:** Subject to underwriting. If health flags exist, switching may not be possible.
- **Recommendation:** Do health screening first before advising the switch.

### 6.2 Currently Uninsured (Original Medicare Only)
- Subject to underwriting (no GI right unless qualifying event)
- If recently lost employer/union coverage: may have GI right (63-day window)
- If no GI right and health issues: may be stuck; Medicare Advantage may be the better path
- Calculator should present both paths honestly

### 6.3 Already Has Medigap — Wants to Switch Carriers
- Easier if: staying on same plan letter (e.g., G → G with different carrier)
- Harder if: upgrading plan (N → G); full underwriting required in standard states
- Birthday rule states: can switch to equal/lesser plan without underwriting during window
- Recommendation: If switching carriers on same plan, apply to new carrier first — don't cancel existing policy until approved

### 6.4 Pre-65 on Medicare (Disability)
- Under 65 on Medicare due to disability: many states do not require carriers to sell Medigap
- Only ~30 states require carriers to offer at least one Medigap plan to under-65
- Premiums can be dramatically higher
- Calculator should flag this clearly and recommend calling an advisor

### 6.5 Turning 65 But Still Working / Has Employer Coverage
- If employer coverage is primary and Medicare is secondary: can delay Part B enrollment without penalty
- When employer coverage ends: has 63 days to enroll in Part B + Medigap under GI rules
- Calculator should capture this scenario and emphasize timing

---

## Section 7: What We Explicitly Don't Recommend (And Why)

**Plans F and C (for those newly eligible after Jan 1, 2020):**
- Legally unavailable. Not offered.

**Plan K and L:**
- TPP's customer profile skews toward people who want comprehensive coverage and predictability. Cost-sharing plans create anxiety and unexpected bills. We recommend against these unless budget is severely constrained.

**High-Deductible Plan G:**
- Only recommended for: age 65-67, excellent health, comfortable with deductible, wants absolute minimum premium.
- Not recommended for: anyone 70+, anyone with chronic conditions, anyone who expects regular healthcare utilization.

**Carriers with red flags:**
- Any carrier with >10% average annual increases AND an upward trend: not recommended (flagged as "Not Recommended — Rate Concerns").
- Any carrier with A.M. Best below A-: not recommended.
- Any carrier with NAIC complaint index > 2.0: flagged with warning.

---

## Section 8: Data Sources & Maintenance

| Data Element | Source | Update Frequency |
|-------------|--------|-----------------|
| Plan benefits | CMS / Medicare.gov | Annual (plan year) |
| State GI/birthday rules | State DOI + Boomer Benefits research | Annual (check for new legislation) |
| Carrier rate increase history | Telos Actuarial, independent broker research, state DOI filings | Quarterly |
| A.M. Best ratings | A.M. Best (requires subscription or news monitoring) | As published |
| NAIC complaint index | NAIC.org public database | Annual |
| Live pricing | CSG Actuarial API | Real-time |
| Part A/B deductible amounts | CMS | Annual |
| Medicare OEP/AEP dates | CMS | Annual |

---

## Section 9: Compliance Notes

- This tool provides **educational recommendations**, not binding insurance quotes or advice.
- All recommendations must include: "Rates and availability vary by location. This is an estimate based on current market data and is not a guaranteed quote."
- For CMS compliance: no carrier name may be presented as "best" in a way that implies we have a financial incentive to recommend them. Language should be: "Based on rate stability, financial strength, and 10-year cost modeling, we recommend considering..."
- Must include standard TPMO disclaimer on any output page.
- All state-specific rules must be reviewed annually by compliance team.
- Tool should not be used to recommend a specific plan to a Medicaid or Dual-eligible beneficiary without advisor oversight.

---

## Section 10: Build Phases

### Phase 1 (MVP)
- Collect: age, state (from zip), current coverage, new to Medicare
- Output: Plan G vs. N recommendation with rationale
- Carrier: top 3 by composite score for that state
- CSG pricing integration: pull live rates for recommended plan(s)
- Underwriting flag: GI vs. not

### Phase 2
- Full health questionnaire for non-GI users
- 10-year cost model displayed visually (chart)
- Carrier rate history displayed (last 3 years of increases)
- Part D add-on prompt

### Phase 3
- Real-time carrier availability by zip
- State-specific birthday rule timing (personalized: "Your birthday is March 15 — your switch window opens March 15")
- Application flow directly from recommendation
- MA-to-Medigap switching flow with trial rights detection

---

*This document should be reviewed quarterly. Changes to CMS rules, state legislation, or carrier behavior require updates. Owner: TPP Product Team.*
