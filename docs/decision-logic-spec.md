# Employer Coverage vs. Medicare Tool — Decision Logic Specification

**Version:** 1.0 — Extracted from `employer-vs-medicare.jsx`
**Date:** March 9, 2026
**Purpose:** Document every decision point, branching path, scoring rule, and recommendation condition in the tool so a colleague can review, audit, and refine the logic independently of the UX.

---

## How to Use This Document

1. **Start with the flowchart** (`employer-vs-medicare-decision-flowchart.mermaid`) to see the full branching structure at a glance.
2. **Use the Logic Rules Tables below** to audit each decision node — what triggers it, what inputs feed it, what it outputs.
3. **Check the Open Questions section** at the end for areas where the logic needs domain expert input.

---

## Tool Overview

The tool has **three main branches** determined by a single question at the top:

| Branch | Trigger | Purpose |
|--------|---------|---------|
| **A — Small Employer (≤20)** | User selects "20 or fewer employees" | Skip analysis. Medicare is primary by law. Route directly to Medicare plan recommendation. |
| **B — Large Employer (20+)** | User selects "20+" or "Not sure" | Analyze employer plan vs. Medicare. If Medicare wins or it's close, continue to Medicare plan finder. |
| **C — COBRA** | User selects "20+" then "On COBRA" in Step 1 | Compare COBRA costs against ACA marketplace plans using slider-based preference matching. |

---

## Branch A: Small Employer (≤20 Employees)

### Why Medicare is automatic

Federal law (Medicare Secondary Payer rules) makes Medicare primary when the employer has 20 or fewer employees. The employer plan pays second. The user **must** enroll in Part B or face a permanent late enrollment penalty.

### Screen-by-screen flow

| Step | Screen | Input Collected | Logic Notes |
|------|--------|----------------|-------------|
| 0 | Company Size | `empSize = "small"` | Routes to Branch A (step 100) |
| 100 | Education: Medicare is Primary | None (informational) | Explains the legal requirement. No decision made. |
| 101 | Dependents | `dependents` = none / spouse / kids / spouse-kids | **Used later in recommendation** to flag family coverage gap warnings. |
| 102 | ZIP Code | `zip` (5-digit) | Required for plan availability lookup. |
| 103 | Doctors | `doctors[]` array of {name} objects | Optional. Used in recommendation engine for network matching. |
| 104 | Prescriptions | `prescriptions[]` array of {name, dosage, frequency} objects | Optional. Used in recommendation engine for formulary matching. |
| 105 | Coverage Preference | `preference` = cheaper / similar / better | **This is the primary driver** of the MA vs. Medigap recommendation. |
| 106 | Recommendation | Output of `generateMedicareRec()` | Displays final recommendation with reasons, warnings, and CTA. |

---

## Branch B: Large Employer (20+ Employees)

### Screen-by-screen flow — Employer Analysis Phase

| Step | Screen | Input Collected | Logic Notes |
|------|--------|----------------|-------------|
| 0 | Company Size | `empSize = "large"` or `"unsure"` | Routes to Branch B (step 1) |
| 1 | Employment Status | `status` = active / cobra / retiree / spouse / planning | "cobra" routes to Branch C. All others continue to step 2. |
| 2 | Monthly Premium | `premium` (dollar amount) | User's paycheck deduction. Parsed as float. |
| 3 | Annual Deductible | `deductible` (dollar amount) | Parsed as float. |
| 4 | OOP Maximum | `oopMax` (dollar amount) | Parsed as float. |
| 5 | Dependents | `dependents` = none / spouse / kids / spouse-kids | Scored in analysis. |
| 6 | Network Satisfaction | `networkSat` = happy / limited / unsure | Scored in analysis. |
| 7 | Analysis Results | Output of `generateEmployerAnalysis()` | Shows verdict, bar graph, factor cards, and conditional CTAs. |

### Employer Analysis Scoring Engine: `generateEmployerAnalysis()`

The engine assigns points to a **Medicare Score (ms)** and an **Employer Score (es)**, then calculates a ratio.

#### Premium Scoring

| Condition | Points | Factor Card |
|-----------|--------|-------------|
| Premium > $500/mo | ms += 3 | "High monthly premium" — Medicare is likely cheaper |
| Premium $200–$500/mo | ms += 1 | "Moderate premium — worth comparing" |
| Premium > $0 and ≤ $200/mo | es += 3 | "Low premium — strong employer subsidy" |
| Premium = 0 or blank | No points | No card generated |

#### Deductible Scoring

| Condition | Points | Factor Card |
|-----------|--------|-------------|
| Deductible > $4,000 | ms += 2 | "High deductible exposure" |
| Deductible > $0 and ≤ $1,500 | es += 1 | "Reasonable deductible" |
| Deductible $1,501–$4,000 | No points | No card (gap in current logic — see Open Questions) |

#### Out-of-Pocket Max Scoring

| Condition | Points | Factor Card |
|-----------|--------|-------------|
| OOP Max > $8,000 | ms += 2 | "High out-of-pocket maximum" |
| OOP Max > $0 and ≤ $4,000 | es += 1 | "Good out-of-pocket protection" |
| OOP Max $4,001–$8,000 | No points | No card (gap in current logic — see Open Questions) |

#### Dependents Scoring

| Condition | Points | Factor Card |
|-----------|--------|-------------|
| dependents = "kids" or "spouse-kids" | es += 3 | "Dependents on your plan" — Medicare doesn't cover them |
| dependents = "spouse" | No points | Informational card only: "Spouse needs their own coverage" |
| dependents = "none" | No points | No card |

#### Network Satisfaction Scoring

| Condition | Points | Factor Card |
|-----------|--------|-------------|
| networkSat = "limited" | ms += 2 | "You feel limited" — Original Medicare has no network |
| networkSat = "happy" | es += 2 | "You're happy with your coverage" |
| networkSat = "unsure" | No points | No card |

#### Verdict Calculation

```
total = ms + es
ratio = (total > 0) ? ms / total : 0.5
```

| Ratio | Verdict | Action |
|-------|---------|--------|
| ratio > 0.6 | **"Medicare may be a better fit"** | Show "Find the Right Medicare Plan →" button. Continue to steps 200–204. |
| ratio < 0.4 | **"Your employer plan looks competitive"** | Do NOT show continue button. Show soft CTA: "Get a Free Comparison →" |
| 0.4 ≤ ratio ≤ 0.6 | **"It's a close call"** | Show continue button. Route to steps 200–204. |

The **bar graph** displays at `ratio × 100`% width. Left = Favors Medicare. Right = Favors Employer.

### Branch B → Medicare Continuation (Steps 200–204)

If the employer analysis results in a "Medicare may be better" or "close call" verdict, the user continues through the same data collection and preference screens as Branch A:

| Step | Screen | Same logic as Branch A step... |
|------|--------|-------------------------------|
| 200 | ZIP Code | 102 |
| 201 | Doctors | 103 |
| 202 | Prescriptions | 104 |
| 203 | Coverage Preference | 105 |
| 204 | Recommendation | 106 (uses same `generateMedicareRec()`) |

---

## Medicare Recommendation Engine: `generateMedicareRec()`

This function runs at the end of both Branch A and Branch B-continuation. It takes all collected data and outputs either **Medicare Advantage** or **Medigap + Part D**.

### Inputs

| Input | Source |
|-------|--------|
| `doctors[]` | Doctor list builder |
| `prescriptions[]` | Prescription list builder |
| `zip` | ZIP code field |
| `preference` | Coverage preference selection (cheaper / similar / better) |
| `dependents` | Dependents selection |
| `empSize` | Company size from Step 0 |

### Derived Variables

| Variable | Definition |
|----------|-----------|
| `hasDocs` | `doctors.length > 0` |
| `hasRx` | `prescriptions.length > 0` |
| `hasComplexRx` | Any prescription where `frequency === "daily"` AND `dosage !== ""` |
| `manyDocs` | `doctors.length >= 3` |

### Default Recommendation

**The default is always Medigap + Part D** (the safer, more comprehensive option). The engine only switches to Medicare Advantage if specific conditions are met.

### Decision Matrix

| Preference | Recommendation | Reasons | Warnings/Overrides |
|-----------|---------------|---------|-------------------|
| **"cheaper"** | **Medicare Advantage** | "You're prioritizing lower costs" — MA plans often $0 premium with extras. | **IF 3+ doctors OR complex Rx:** Warning card: "Your medical needs may point toward broader coverage." This is a soft warning, NOT an override — recommendation stays MA. |
| **"cheaper" + 3+ doctors** | **Medicare Advantage** (unchanged) | Same as above + "Check your doctors are in-network" — MA uses HMO/PPO networks. | Same warning as above. |
| **"similar"** | **Medigap + Part D** | "You want similar coverage" — Medigap is most comparable to good employer plans. "Any doctor that accepts Medicare" — no network restrictions. | None |
| **"better"** | **Medigap + Part D** | "You want the strongest coverage" — Plan G or Plan N + Part D. "Predictable costs, broad access." | None |

### Additional Context Cards (appended after primary reasons)

| If recommend = | Condition | Card |
|---------------|-----------|------|
| MA | Always | "Medicare Advantage often includes extras" (dental, vision, gym, OTC) |
| MA | hasRx = true | "Drug coverage is usually built in" — most MA includes Part D |
| Medigap | Always | "You'll need a standalone Part D plan" — Medigap doesn't include drugs |
| Medigap | hasDocs = true | "Your doctors are covered" — any doctor accepting Medicare |

### Family Coverage Warning

| Condition | Warning Card |
|-----------|-------------|
| `empSize` = "small" or "unsure" **AND** `dependents` = "spouse" or "kids" or "spouse-kids" | "Your family's coverage may be affected" — Medicare only covers the individual. Dropping employer plan means finding separate coverage for family through another employer, ACA marketplace, or CHIP. |

**Note:** This warning currently only fires for small/unsure employers, NOT for 20+ employers who choose to continue to Medicare. See Open Questions.

---

## Branch C: COBRA Sub-Branch

### When it triggers

User selects "20+ employees" at Step 0, then "On COBRA" at Step 1.

### Important context

A **warning banner** is shown at Step 10: "COBRA isn't employer coverage for Medicare purposes. If you're 65+ on COBRA without Part B, you may be accruing a permanent penalty."

### Screen-by-screen flow

| Step | Screen | Input Collected |
|------|--------|----------------|
| 10 | COBRA Plan Type | `cobra.planType` = ppo / hmo / hdhp / epo / unknown |
| 11 | COBRA Costs | `cobra.premium`, `cobra.deductible`, `cobra.copay` |
| 12 | About You | `cobra.age`, `cobra.zip`, `cobra.income` |
| 13 | Preference Sliders | 6 adjustable sliders with trade-off logic |
| 14 | Comparison Results | Side-by-side COBRA vs. Marketplace with savings calc |

### Plan Profile Presets

Each COBRA plan type pre-fills the 6 sliders (0–100 scale):

| Plan Type | Premium | Network | Copay | Deductible | Rx | OOP |
|-----------|---------|---------|-------|------------|-----|-----|
| PPO | 72 | 80 | 35 | 35 | 70 | 40 |
| HMO | 50 | 35 | 30 | 30 | 65 | 35 |
| HDHP | 25 | 65 | 70 | 85 | 40 | 70 |
| EPO | 55 | 50 | 35 | 40 | 60 | 40 |
| Unknown | 50 | 50 | 50 | 50 | 50 | 50 |

Additional adjustments based on actual COBRA costs:
- If COBRA premium > $800/mo → increase premium slider by up to 15 (capped at 90)
- If COBRA premium < $300/mo → decrease premium slider by up to 20 (min 10)
- If COBRA deductible > $5,000 → set deductible slider to min(90, 80)
- If COBRA deductible < $1,500 → set deductible slider to max(10, 20)

### Slider Trade-off Logic: `applyTradeoffs()`

When one slider moves, others adjust to reflect real-world insurance trade-offs:

| Slider Changed | Affected Sliders |
|---------------|-----------------|
| **Premium ↑** | Deductible ↓ (factor: 0.6), Network ↑ (factor: 0.3), Copay ↓ (factor: 0.3) |
| **Network ↑** | Premium ↑ (factor: 0.4) |
| **Deductible ↑** | Premium ↓ (factor: 0.5), OOP ↑ (factor: 0.4) |
| **Rx ↑** | Premium ↑ (factor: 0.3) |
| Copay | No cascading effects |
| OOP | No cascading effects |

All values are clamped between 0–100.

### Marketplace Plan Generation: `generatePlan()`

Generates an estimated marketplace plan based on slider positions.

**Age multiplier:**
- Age ≥ 60 → 1.6x
- Age 55–59 → 1.4x
- Age < 55 → 1.2x

**Subsidy calculation** (based on Federal Poverty Level):
- Income/FPL < 1.5 → 97% subsidy
- Income/FPL 1.5–2.0 → 85% subsidy
- Income/FPL 2.0–2.5 → 72% subsidy
- Income/FPL 2.5–3.0 → 60% subsidy
- Income/FPL 3.0–4.0 → 40% subsidy
- Income/FPL > 4.0 → 0% subsidy
- FPL base used: $15,060

**Plan attributes from sliders:**

| Attribute | Formula |
|-----------|---------|
| Plan metal tier | premium < 35 → Bronze; < 55 → Silver; < 72 → Gold; else → Platinum |
| Network type | network > 65 → Broad PPO; > 45 → Mid-size EPO; else → HMO |
| Raw premium | `650 × ageMult × (0.6 + premium_slider/250)` |
| Net premium | `raw - (raw × subsidyFactor)`, min $0 |
| Deductible | `round((500 + deductible_slider × 60) / 100) × 100` |
| OOP Max | `round((2000 + oop_slider × 60) / 100) × 100` |
| Copay | `round((15 + copay_slider × 0.45) / 5) × 5` |
| Rx tier | rx > 65 → Comprehensive; > 40 → Standard; else → Generics only |

---

## Open Questions & Items for Review

These are areas where the logic may need refinement based on domain expertise:

### 1. Scoring Gaps in Employer Analysis

The deductible and OOP max scoring have "dead zones" where no points are awarded:

- **Deductible $1,501–$4,000** — no score for either side. Should this be ms += 1?
- **OOP Max $4,001–$8,000** — same gap. Many employer plans fall here. Should there be a "moderate" tier?

### 2. Family Coverage Warning Scope

The dependents warning in `generateMedicareRec()` only fires when `empSize = "small"` or `"unsure"`. But the same family coverage concern applies to 20+ employees who proceed to Medicare via the continuation flow (steps 200+). **Should this warning also fire for large employer users who decide to switch?**

### 3. No Override for "Cheaper" Preference with Complex Needs

When a user selects "cheaper" but has 3+ doctors or complex prescriptions, the tool shows a **soft warning** but still recommends MA. **Should there be a hard override** that switches the recommendation to Medigap + Part D if the medical complexity exceeds a certain threshold?

### 4. "Not Sure" Company Size Routes to Large Employer Branch

Users who select "I'm not sure" about company size are routed to Branch B (20+ analysis). **Is this the right default?** If someone truly doesn't know, should we ask a follow-up question, or is the conservative approach (analyze employer plan) correct?

### 5. COBRA Branch Doesn't Connect to Medicare Recommendation

The COBRA flow (Branch C) compares COBRA vs. ACA Marketplace but **never routes to the Medicare recommendation engine**. For users 65+ on COBRA, Medicare is likely the best option, not marketplace. **Should there be a Medicare path from the COBRA branch for age 65+ users?**

### 6. No Age Collection in Branch A or B

Branches A and B never ask the user's age. The tool assumes Medicare eligibility (65+) but doesn't confirm it. **Should we add an age/DOB screen** to catch users who are under 65 and may not be Medicare-eligible yet?

### 7. Income / IRMAA Not Collected in Medicare Branches

The COBRA branch collects income (for ACA subsidy calculation), but Branches A and B do not. **IRMAA (Income-Related Monthly Adjustment Amount) affects Medicare Part B and Part D premiums** for higher earners. Should income be collected to surface IRMAA warnings?

### 8. No Real-Time Plan Verification

The tool collects doctors and prescriptions but currently can't verify network inclusion or formulary coverage against actual plans. The recommendation is based on general heuristics (e.g., "if 3+ doctors, warn about network"). **Is this acceptable for v1, or do we need API integration before launch?**

### 9. Marketplace Plan Estimates Are Rough

The COBRA comparison uses a formula-based plan generator, not real marketplace data. Subsidy calculations use a simplified FPL model. **How prominently should we caveat these numbers?** Current disclaimer: "Premiums are estimates. Actual plans and subsidies vary by ZIP."

### 10. "Similar" and "Better" Both Recommend Medigap

Currently, selecting "similar" and "better" produce the same recommendation (Medigap + Part D) with slightly different messaging. **Should "similar" have different logic** — perhaps recommending MA in certain conditions where the employer plan resembled an HMO/PPO structure?

---

## Appendix: Step Number Reference

| Step | Branch | Screen |
|------|--------|--------|
| 0 | All | Company Size (First Fork) |
| 1 | B | Employment Status |
| 2 | B | Monthly Premium |
| 3 | B | Annual Deductible |
| 4 | B | OOP Maximum |
| 5 | B | Dependents |
| 6 | B | Network Satisfaction |
| 7 | B | Employer Analysis Results |
| 10 | C (COBRA) | Plan Type |
| 11 | C (COBRA) | COBRA Costs |
| 12 | C (COBRA) | About You |
| 13 | C (COBRA) | Preference Sliders |
| 14 | C (COBRA) | Comparison Results |
| 100 | A | Medicare is Primary (education) |
| 101 | A | Dependents |
| 102 | A | ZIP Code |
| 103 | A | Doctors |
| 104 | A | Prescriptions |
| 105 | A | Coverage Preference |
| 106 | A | Medicare Recommendation |
| 200 | B→Medicare | ZIP Code |
| 201 | B→Medicare | Doctors |
| 202 | B→Medicare | Prescriptions |
| 203 | B→Medicare | Coverage Preference |
| 204 | B→Medicare | Medicare Recommendation |
