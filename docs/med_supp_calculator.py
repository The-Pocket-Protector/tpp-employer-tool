#!/usr/bin/env python3
"""
med_supp_calculator.py — TPP Medicare Supplement Plan Recommendation Calculator
The Pocket Protector | Internal Tool

Asks user for: age, current coverage, zip code, new-to-Medicare status, health (if needed)
Outputs: recommended plan type + top carrier(s) with 10-year cost model

Usage:
    python3 med_supp_calculator.py                  # interactive CLI
    python3 med_supp_calculator.py --json input.json # batch/API mode
"""

import json
import sys
import argparse
from dataclasses import dataclass, field
from typing import Optional
from datetime import date

# ─────────────────────────────────────────────────────────────
# DATA: State Classifications
# ─────────────────────────────────────────────────────────────

# States with YEAR-ROUND guaranteed issue (or near-year-round)
GI_YEAR_ROUND_STATES = {
    "NY": "New York offers year-round guaranteed issue — any carrier must accept you without underwriting.",
    "CT": "Connecticut offers year-round guaranteed issue — any carrier must accept you without underwriting.",
    "VT": "Many carriers in Vermont offer year-round guaranteed issue. Confirm availability with your chosen carrier.",
    "ME": "Maine has continuous open enrollment; a 6-month pre-existing condition exclusion may apply.",
    "WA": "Washington has broad open enrollment protections. Confirm with your chosen carrier.",
}

# Birthday rule states
BIRTHDAY_RULE_STATES = {
    "CA": {"window_days": 30, "note": "California birthday rule: 30-day window starting on your birthday to switch to equal or lesser plan without underwriting."},
    "ID": {"window_days": 63, "note": "Idaho birthday rule: 63-day window starting on your birthday."},
    "IL": {"window_days": 45, "note": "Illinois birthday rule: 45-day window starting on your birthday."},
    "KY": {"window_days": 60, "note": "Kentucky birthday rule (enacted 2024): 60-day window starting on your birthday."},
    "LA": {"window_days": 30, "note": "Louisiana birthday rule: 30-day window starting on your birthday."},
    "MD": {"window_days": 30, "note": "Maryland birthday rule: 30-day window starting on your birthday."},
    "NV": {"window_days": 60, "note": "Nevada birthday rule: 60-day window starting on your birthday."},
    "OK": {"window_days": 60, "note": "Oklahoma birthday rule: 60-day window starting on your birthday."},
    "OR": {"window_days": 30, "note": "Oregon birthday rule: 30-day window starting on your birthday."},
    "RI": {"window_days": 30, "note": "Rhode Island birthday rule: 30-day window from birthday (continuous coverage required)."},
    "UT": {"window_days": 30, "note": "Utah (as of May 2025): Can switch to equal/lesser plan within same carrier without underwriting."},
}

# States with non-standard plan structures
NONSTANDARD_STATES = {
    "MA": "Massachusetts uses its own plan structure (Core and Supplement 1/1A). Contact a TPP advisor for personalized guidance.",
    "MN": "Minnesota uses its own plan structure (Basic and Extended Basic). Contact a TPP advisor for personalized guidance.",
    "WI": "Wisconsin uses its own plan structure. Contact a TPP advisor for personalized guidance.",
}

# ZIP code prefix to state mapping (first 3 digits)
# A full implementation would use a ZIP database; this covers major ranges
ZIP_TO_STATE = {
    "100": "NY", "101": "NY", "102": "NY", "103": "NY", "104": "NY",
    "105": "NY", "106": "NY", "107": "NY", "108": "NY", "109": "NY",
    "110": "NY", "111": "NY", "112": "NY", "113": "NY", "114": "NY",
    "115": "NY", "116": "NY", "117": "NY", "118": "NY", "119": "NY",
    "120": "NY", "121": "NY", "122": "NY", "123": "NY", "124": "NY",
    "125": "NY", "126": "NY", "127": "NY", "128": "NY", "129": "NY",
    "060": "CT", "061": "CT", "062": "CT", "063": "CT", "064": "CT",
    "065": "CT", "066": "CT", "067": "CT", "068": "CT", "069": "CT",
    "010": "MA", "011": "MA", "012": "MA", "013": "MA", "014": "MA",
    "015": "MA", "016": "MA", "017": "MA", "018": "MA", "019": "MA",
    "020": "MA", "021": "MA", "022": "MA", "023": "MA", "024": "MA",
    "025": "MA", "026": "MA", "027": "MA",
    "039": "ME", "040": "ME", "041": "ME", "042": "ME", "043": "ME",
    "044": "ME", "045": "ME", "046": "ME", "047": "ME", "048": "ME", "049": "ME",
    "535": "WI", "537": "WI", "538": "WI", "539": "WI", "540": "WI",
    "541": "WI", "542": "WI", "543": "WI", "544": "WI", "545": "WI",
    "546": "WI", "547": "WI", "548": "WI", "549": "WI",
    "550": "MN", "551": "MN", "553": "MN", "554": "MN", "555": "MN",
    "556": "MN", "557": "MN", "558": "MN", "559": "MN", "560": "MN",
    "561": "MN", "562": "MN", "563": "MN", "564": "MN", "565": "MN",
    "566": "MN", "567": "MN",
    "600": "IL", "601": "IL", "602": "IL", "603": "IL", "604": "IL",
    "605": "IL", "606": "IL", "607": "IL", "608": "IL", "609": "IL",
    "610": "IL", "611": "IL", "612": "IL", "613": "IL", "614": "IL",
    "615": "IL", "616": "IL", "617": "IL", "618": "IL", "619": "IL",
    "620": "IL", "622": "IL", "623": "IL", "624": "IL", "625": "IL",
    "626": "IL", "627": "IL", "628": "IL", "629": "IL",
    "900": "CA", "901": "CA", "902": "CA", "903": "CA", "904": "CA",
    "905": "CA", "906": "CA", "907": "CA", "908": "CA", "910": "CA",
    "911": "CA", "912": "CA", "913": "CA", "914": "CA", "915": "CA",
    "916": "CA", "917": "CA", "918": "CA", "919": "CA", "920": "CA",
    "921": "CA", "922": "CA", "923": "CA", "924": "CA", "925": "CA",
    "926": "CA", "927": "CA", "928": "CA", "930": "CA", "931": "CA",
    "932": "CA", "933": "CA", "934": "CA", "935": "CA", "936": "CA",
    "937": "CA", "938": "CA", "939": "CA", "940": "CA", "941": "CA",
    "942": "CA", "943": "CA", "944": "CA", "945": "CA", "946": "CA",
    "947": "CA", "948": "CA", "949": "CA", "950": "CA", "951": "CA",
    "952": "CA", "953": "CA", "954": "CA", "955": "CA", "956": "CA",
    "957": "CA", "958": "CA", "959": "CA", "960": "CA", "961": "CA",
    # Chicago / IL specific (already above)
    "600": "IL", "606": "IL",
    # Oregon
    "970": "OR", "971": "OR", "972": "OR", "973": "OR", "974": "OR",
    "975": "OR", "976": "OR", "977": "OR", "978": "OR", "979": "OR",
    # Nevada
    "889": "NV", "890": "NV", "891": "NV", "893": "NV", "894": "NV",
    "895": "NV", "897": "NV", "898": "NV",
    # Maryland
    "206": "MD", "207": "MD", "208": "MD", "209": "MD", "210": "MD",
    "211": "MD", "212": "MD", "214": "MD", "215": "MD", "216": "MD",
    "217": "MD", "218": "MD", "219": "MD",
    # Vermont
    "050": "VT", "051": "VT", "052": "VT", "053": "VT", "054": "VT",
    "056": "VT", "057": "VT", "058": "VT", "059": "VT",
    # Washington state
    "980": "WA", "981": "WA", "982": "WA", "983": "WA", "984": "WA",
    "985": "WA", "986": "WA", "988": "WA", "989": "WA", "990": "WA",
    "991": "WA", "992": "WA", "993": "WA", "994": "WA",
    # Louisiana
    "700": "LA", "701": "LA", "703": "LA", "704": "LA", "705": "LA",
    "706": "LA", "707": "LA", "708": "LA",
    # Kentucky
    "400": "KY", "401": "KY", "402": "KY", "403": "KY", "404": "KY",
    "405": "KY", "406": "KY", "407": "KY", "408": "KY", "409": "KY",
    "410": "KY", "411": "KY", "412": "KY", "413": "KY", "414": "KY",
    "415": "KY", "416": "KY", "417": "KY", "418": "KY",
    # Idaho
    "832": "ID", "833": "ID", "834": "ID", "835": "ID", "836": "ID",
    "837": "ID", "838": "ID",
    # Oklahoma
    "730": "OK", "731": "OK", "734": "OK", "735": "OK", "736": "OK",
    "737": "OK", "738": "OK", "739": "OK", "740": "OK", "741": "OK",
    "743": "OK", "744": "OK", "745": "OK", "746": "OK", "747": "OK",
    "748": "OK", "749": "OK",
    # Rhode Island
    "028": "RI", "029": "RI",
    # Utah
    "840": "UT", "841": "UT", "842": "UT", "843": "UT", "844": "UT",
    "845": "UT", "846": "UT", "847": "UT",
}

def zip_to_state(zipcode: str) -> str:
    """Convert zip code to state abbreviation."""
    prefix = zipcode[:3]
    return ZIP_TO_STATE.get(prefix, "UNKNOWN")


# ─────────────────────────────────────────────────────────────
# DATA: Carrier Profiles
# ─────────────────────────────────────────────────────────────

CARRIERS = {
    "cigna": {
        "name": "Cigna Healthcare",
        "am_best": "A",
        "am_best_score": 15,
        "plan_g_avg_increase": 0.062,   # 6.2% avg annual
        "plan_n_avg_increase": 0.063,
        "increase_trend": "stable",      # stable | rising | falling
        "naic_complaint_index": 0.6,     # < 1.0 = better than average
        "rating_methodology": "attained_age",  # attained_age | issue_age | community
        "availability_notes": "Not available in MA or MN",
        "unavailable_states": ["MA", "MN"],
        "strengths": ["Consistent rate history", "Strong customer service", "Wellness perks"],
        "weaknesses": ["Not available in all zip codes", "Premiums can run high in some regions"],
    },
    "uhc_aarp": {
        "name": "UnitedHealthcare (AARP)",
        "am_best": "A",
        "am_best_score": 15,
        "plan_g_avg_increase": 0.068,
        "plan_n_avg_increase": 0.070,
        "increase_trend": "stable",
        "naic_complaint_index": 0.75,
        "rating_methodology": "attained_age",
        "availability_notes": "Available in all 50 states + DC. Requires AARP membership (~$16/yr).",
        "unavailable_states": [],
        "strengths": ["Widest national availability", "Brand recognition", "AARP member perks"],
        "weaknesses": ["Requires AARP membership", "Premiums slightly above market in some areas"],
    },
    "humana": {
        "name": "Humana",
        "am_best": "A-",
        "am_best_score": 10,
        "plan_g_avg_increase": 0.065,
        "plan_n_avg_increase": 0.067,
        "increase_trend": "stable",
        "naic_complaint_index": 0.80,
        "rating_methodology": "attained_age",
        "availability_notes": "Not available in MA, MN, WI",
        "unavailable_states": ["MA", "MN", "WI"],
        "strengths": ["Easy online enrollment", "Optional dental/vision/hearing add-ons", "Nationwide access"],
        "weaknesses": ["Rate increases vary by location", "Plan benefits differ by zip code"],
    },
    "mutual_of_omaha": {
        "name": "Mutual of Omaha",
        "am_best": "A+",
        "am_best_score": 18,
        "plan_g_avg_increase": 0.095,   # elevated 2024-2025
        "plan_n_avg_increase": 0.100,
        "increase_trend": "rising",
        "naic_complaint_index": 0.45,   # industry-low complaint index
        "rating_methodology": "attained_age",
        "availability_notes": "Not available in MA",
        "unavailable_states": ["MA"],
        "strengths": ["Industry-low complaint index", "Excellent financial strength", "Strong customer service"],
        "weaknesses": ["Rate increases significantly elevated in 2024-2025", "Watch for continued increase trend"],
    },
    "aetna": {
        "name": "Aetna (CVS Health)",
        "am_best": "A",
        "am_best_score": 15,
        "plan_g_avg_increase": 0.110,   # significantly elevated
        "plan_n_avg_increase": 0.115,
        "increase_trend": "rising",
        "naic_complaint_index": 1.10,
        "rating_methodology": "attained_age",
        "availability_notes": "Not available in MA",
        "unavailable_states": ["MA"],
        "strengths": ["Simple digital enrollment", "Household discounts", "Nationwide availability"],
        "weaknesses": ["Rate increases significantly elevated in 2024-2025", "Mixed service in some areas"],
    },
    "bcbs": {
        "name": "Blue Cross Blue Shield (state affiliate)",
        "am_best": "A",
        "am_best_score": 15,
        "plan_g_avg_increase": 0.072,
        "plan_n_avg_increase": 0.075,
        "increase_trend": "stable",
        "naic_complaint_index": 0.70,
        "rating_methodology": "attained_age",
        "availability_notes": "Available via 34 independent state affiliates. Availability and pricing vary significantly by state.",
        "unavailable_states": [],
        "strengths": ["Trusted brand", "Broad provider acceptance", "Dependable claims support"],
        "weaknesses": ["Pricing and plans vary by state affiliate", "Can be hard to compare across regions"],
    },
    "physicians_mutual": {
        "name": "Physicians Mutual",
        "am_best": "A+",
        "am_best_score": 18,
        "plan_g_avg_increase": 0.060,
        "plan_n_avg_increase": 0.062,
        "increase_trend": "stable",
        "naic_complaint_index": 0.65,
        "rating_methodology": "attained_age",
        "availability_notes": "Available in ~38 states (expanding in 2026). Confirm availability in your state.",
        "unavailable_states": [],
        "strengths": ["Steady premiums", "Strong financial rating", "Simple enrollment"],
        "weaknesses": ["Fewer plan types", "Limited geographic availability in some regions"],
    },
    "united_american": {
        "name": "United American Insurance",
        "am_best": "A",
        "am_best_score": 15,
        "plan_g_avg_increase": 0.068,
        "plan_n_avg_increase": 0.072,
        "increase_trend": "stable",
        "naic_complaint_index": 0.80,
        "rating_methodology": "attained_age",
        "availability_notes": "Not available in MA",
        "unavailable_states": ["MA"],
        "strengths": ["Longstanding reputation", "Stable rates", "Straightforward policies"],
        "weaknesses": ["Smaller market presence", "Limited online tools"],
    },
}


# ─────────────────────────────────────────────────────────────
# DATA: Plan Definitions
# ─────────────────────────────────────────────────────────────

PLANS = {
    "G": {
        "name": "Plan G",
        "covers": [
            "Part A hospital coinsurance + 365 extra days",
            "Part A deductible ($1,676 in 2025)",
            "Part A hospice coinsurance",
            "Part B coinsurance (no copays)",
            "Part B excess charges (provider can't bill you above Medicare rates)",
            "Skilled nursing facility coinsurance",
            "Foreign travel emergency (80%, up to plan limits)",
        ],
        "does_not_cover": [
            "Part B deductible ($257 in 2025 — you pay this once per year)",
            "Prescription drugs (need separate Part D plan)",
        ],
        "out_of_pocket_max": None,
        "summary": "Plan G is the most comprehensive plan available to new Medicare enrollees. After paying the $257 Part B deductible once per year, you pay $0 for any Medicare-covered service. No copays, no coinsurance, no surprises.",
    },
    "N": {
        "name": "Plan N",
        "covers": [
            "Part A hospital coinsurance + 365 extra days",
            "Part A deductible ($1,676 in 2025)",
            "Part A hospice coinsurance",
            "Part B coinsurance (with copays — see below)",
            "Skilled nursing facility coinsurance",
            "Foreign travel emergency (80%, up to plan limits)",
        ],
        "does_not_cover": [
            "Part B deductible ($257 in 2025 — you pay this once per year)",
            "Part B excess charges (providers can bill you up to 15% above Medicare rates)",
            "Prescription drugs (need separate Part D plan)",
        ],
        "copays": "Up to $20 for office visits; up to $50 for ER visits (waived if admitted to hospital)",
        "out_of_pocket_max": None,
        "summary": "Plan N offers very strong coverage at a lower premium than Plan G. You'll pay a small copay on doctor visits (up to $20) and ER visits (up to $50 if not admitted). The tradeoff: no coverage for Part B excess charges.",
    },
    "G_HD": {
        "name": "High-Deductible Plan G",
        "covers": [
            "Same benefits as Plan G, but only after you meet the annual deductible",
        ],
        "does_not_cover": [
            "Anything until deductible is met ($2,870 in 2025)",
            "Prescription drugs",
        ],
        "deductible_2025": 2870,
        "out_of_pocket_max": 2870,
        "summary": "High-Deductible Plan G has the lowest premium of any comprehensive Medigap plan. You pay all costs up to $2,870/year, then Plan G's full coverage kicks in. Best for healthy, younger enrollees who want protection against catastrophic costs at minimum monthly expense.",
    },
}


# ─────────────────────────────────────────────────────────────
# SCORING ENGINE
# ─────────────────────────────────────────────────────────────

def score_carrier(carrier_data: dict, plan_type: str, state: str) -> dict:
    """
    Compute composite carrier score (0–100) for a given plan type and state.
    Returns score dict with breakdown.
    """
    scores = {}

    # 1. A.M. Best rating score (0–20)
    scores["am_best"] = carrier_data["am_best_score"]

    # 2. Rate methodology score (0–20)
    methodology = carrier_data.get("rating_methodology", "attained_age")
    # For NY/CT (community-rated states), methodology matters less
    if state in GI_YEAR_ROUND_STATES and state in ["NY", "CT"]:
        scores["methodology"] = 20  # Community rating mandated — all equal
    elif methodology == "community":
        scores["methodology"] = 20
    elif methodology == "issue_age":
        scores["methodology"] = 15
    else:  # attained_age
        scores["methodology"] = 0

    # 3. Rate increase history score (range: -20 to 25)
    avg_increase = carrier_data.get(f"plan_{plan_type.lower().replace('-','_')}_avg_increase",
                                    carrier_data.get("plan_g_avg_increase", 0.08))
    trend = carrier_data.get("increase_trend", "stable")

    if avg_increase < 0.06:
        increase_score = 25
    elif avg_increase < 0.08:
        increase_score = 15
    elif avg_increase < 0.10:
        increase_score = 5
    else:
        increase_score = -10

    if trend == "rising":
        increase_score -= 10
    elif trend == "falling":
        increase_score += 5

    scores["rate_history"] = max(-20, increase_score)

    # 4. NAIC complaint index score (0–15)
    naic = carrier_data.get("naic_complaint_index", 1.0)
    complaint_score = max(0, min(15, int((1.0 - naic) * 15 + 15)))
    scores["naic"] = complaint_score

    # 5. Market presence (0–10)
    unavailable = carrier_data.get("unavailable_states", [])
    if state in unavailable:
        scores["availability"] = -999  # Carrier not available in this state
    else:
        scores["availability"] = 10

    # Total
    total = sum(v for k, v in scores.items() if k != "availability" or v != -999)
    if scores["availability"] == -999:
        total = -999
    else:
        total += scores["availability"]

    return {
        "carrier_id": None,
        "total": max(0, total),
        "breakdown": scores,
        "available": scores["availability"] != -999,
    }


def ten_year_cost_model(
    monthly_premium: float,
    avg_annual_increase: float,
    methodology: str,
    current_age: int,
) -> dict:
    """
    Project 10-year cumulative cost for a given carrier/plan.
    Returns year-by-year breakdown and total.
    """
    years = []
    total = 0.0
    annual_premium = monthly_premium * 12

    for year in range(10):
        # General rate increase
        general_increase = (1 + avg_annual_increase) ** year

        # Age-based increase (attained-age only)
        if methodology == "attained_age":
            age_at_year = current_age + year
            if age_at_year < 70:
                aging_factor = (1.018) ** year  # ~1.8%/yr
            elif age_at_year < 75:
                aging_factor = (1.018) ** 5 * (1.025) ** (year - 5)
            else:
                aging_factor = (1.018) ** 5 * (1.025) ** 5 * (1.030) ** (year - 10)
        else:
            aging_factor = 1.0

        year_premium = annual_premium * general_increase * aging_factor
        total += year_premium
        years.append({
            "year": year + 1,
            "age": current_age + year,
            "monthly": round(year_premium / 12, 2),
            "annual": round(year_premium, 2),
        })

    return {
        "years": years,
        "total_10yr": round(total, 2),
        "avg_monthly_yr5": round(years[4]["monthly"], 2),
        "avg_monthly_yr10": round(years[9]["monthly"], 2),
    }


# ─────────────────────────────────────────────────────────────
# PLAN RECOMMENDATION ENGINE
# ─────────────────────────────────────────────────────────────

def recommend_plan(
    age: int,
    eligible_before_2020: bool,
    current_coverage: str,
    new_to_medicare: bool,
    zip_code: str,
    state: str,
    health_status: str = "good",
    doctor_visits_per_year: int = 4,
    has_chronic_conditions: bool = False,
    budget_monthly_max: Optional[float] = None,
) -> dict:
    """
    Core recommendation engine. Returns ranked plan recommendations with rationale.
    """

    # ── GI Status ──────────────────────────────────────────────
    gi_eligible = False
    gi_reason = None

    if new_to_medicare and age >= 65:
        gi_eligible = True
        gi_reason = "You're in your 6-month Medigap Open Enrollment Period — the best time to enroll. Any carrier must accept you regardless of your health history."
    elif state in GI_YEAR_ROUND_STATES:
        gi_eligible = True
        gi_reason = GI_YEAR_ROUND_STATES[state]
    elif current_coverage == "ma_plan":
        gi_eligible = False
        gi_reason = "Switching from Medicare Advantage to Medigap typically requires medical underwriting outside your initial enrollment period. If you enrolled in Medicare Advantage during your very first enrollment period and it's been less than 12 months, you may have Trial Rights (contact us to confirm)."
    elif current_coverage == "employer_ending":
        gi_eligible = True
        gi_reason = "Your employer/union coverage ending gives you a federal Guaranteed Issue right — 63 days from when coverage ends to enroll in Medigap without underwriting."

    # ── Special State Check ─────────────────────────────────────
    if state in NONSTANDARD_STATES:
        return {
            "status": "advisor_referral",
            "reason": NONSTANDARD_STATES[state],
            "state": state,
            "gi_eligible": gi_eligible,
        }

    # ── Plan Eligibility ────────────────────────────────────────
    available_plans = ["A", "B", "D", "G", "G_HD", "K", "L", "N"]
    if eligible_before_2020:
        available_plans += ["C", "F", "F_HD"]

    # ── Plan Scoring & Selection ────────────────────────────────
    plan_scores = {}

    # Plan G score
    g_score = 0
    g_reasons_for = []
    g_reasons_against = []

    if doctor_visits_per_year >= 6:
        g_score += 30
        g_reasons_for.append(f"You see doctors frequently ({doctor_visits_per_year}+ visits/year) — Plan G's $0 copay structure saves money")
    if has_chronic_conditions:
        g_score += 25
        g_reasons_for.append("Chronic conditions mean predictable, ongoing medical costs — Plan G eliminates all cost variability")
    if health_status in ["fair", "poor"]:
        g_score += 20
        g_reasons_for.append("Your health profile suggests higher healthcare utilization going forward")
    if age >= 70:
        g_score += 15
        g_reasons_for.append("At 70+, healthcare utilization typically increases — Plan G's comprehensive coverage becomes more valuable")
    if current_coverage == "ma_plan":
        g_score += 15
        g_reasons_for.append("Switching from Medicare Advantage: Plan G provides maximum protection and no network restrictions")

    plan_scores["G"] = g_score

    # Plan N score
    n_score = 0
    n_reasons_for = []
    n_reasons_against = []

    if health_status in ["excellent", "good"] and not has_chronic_conditions:
        n_score += 25
        n_reasons_for.append("Good health means lower utilization — you'll rarely hit the copay limits")
    if doctor_visits_per_year <= 3:
        n_score += 20
        n_reasons_for.append(f"With only ~{doctor_visits_per_year} visits/year, Plan N's copays ({doctor_visits_per_year} × $20 max = ~${doctor_visits_per_year * 20}/yr) likely less than the premium savings vs Plan G")
    if age <= 68 and new_to_medicare:
        n_score += 15
        n_reasons_for.append("Newly enrolled at 65-68: starting with Plan N captures premium savings while you're healthy, with potential to upgrade during birthday rule window if your state has one")
    if budget_monthly_max and budget_monthly_max < 150:
        n_score += 20
        n_reasons_for.append("Budget-conscious choice: Plan N premiums run $20-50/month less than Plan G in most markets")

    # Plan N warnings
    if state not in BIRTHDAY_RULE_STATES and state not in GI_YEAR_ROUND_STATES:
        n_reasons_against.append("Your state has no birthday rule — upgrading to Plan G later will require passing underwriting, which may not be possible if your health changes")

    plan_scores["N"] = n_score

    # High-Deductible G score
    hdg_score = 0
    if health_status == "excellent" and not has_chronic_conditions and age <= 67:
        hdg_score += 30
        hdg_reasons_for = ["Excellent health + young age = low probability of hitting the $2,870 deductible"]
    else:
        hdg_reasons_for = []
    if budget_monthly_max and budget_monthly_max < 100:
        hdg_score += 25
        hdg_reasons_for.append("Tightest budget: HD-G premiums can be $60-90/month in many markets")
    plan_scores["G_HD"] = hdg_score

    # ── Determine winning plan(s) ────────────────────────────────
    sorted_plans = sorted(plan_scores.items(), key=lambda x: x[1], reverse=True)
    primary_plan = sorted_plans[0][0]
    secondary_plan = sorted_plans[1][0] if len(sorted_plans) > 1 else None

    # If Plan G and N are very close, show both
    show_both_g_n = abs(plan_scores.get("G", 0) - plan_scores.get("N", 0)) < 15

    # ── Carrier Scoring ──────────────────────────────────────────
    carrier_results = []
    for carrier_id, carrier_data in CARRIERS.items():
        score_result = score_carrier(carrier_data, primary_plan, state)
        if not score_result["available"]:
            continue
        score_result["carrier_id"] = carrier_id
        score_result["carrier_name"] = carrier_data["name"]
        score_result["rate_trend"] = carrier_data["increase_trend"]
        score_result["am_best_rating"] = carrier_data["am_best"]
        score_result["strengths"] = carrier_data["strengths"]
        score_result["weaknesses"] = carrier_data["weaknesses"]
        score_result["avg_annual_increase"] = carrier_data.get(
            f"plan_{primary_plan.lower()}_avg_increase",
            carrier_data["plan_g_avg_increase"]
        )
        score_result["rating_methodology"] = carrier_data["rating_methodology"]
        carrier_results.append(score_result)

    # Sort by total score descending
    carrier_results.sort(key=lambda x: x["total"], reverse=True)

    # ── Estimated 10-year cost (using approximate premiums by age) ─
    # These are rough market estimates; CSG will provide actual quotes
    base_premiums = {
        "G": {65: 145, 67: 160, 70: 180, 72: 200, 75: 225, 78: 260, 80: 290},
        "N": {65: 110, 67: 120, 70: 140, 72: 155, 75: 175, 78: 200, 80: 225},
        "G_HD": {65: 65, 67: 72, 70: 82, 72: 90, 75: 105, 78: 120, 80: 135},
    }

    def get_base_premium(plan: str, age: int) -> float:
        premiums = base_premiums.get(plan, base_premiums["G"])
        ages = sorted(premiums.keys())
        for a in ages:
            if age <= a:
                return premiums[a]
        return premiums[ages[-1]]

    # Add 10-year model to top carriers
    for cr in carrier_results[:4]:
        base_premium = get_base_premium(primary_plan, age)
        model = ten_year_cost_model(
            monthly_premium=base_premium,
            avg_annual_increase=cr["avg_annual_increase"],
            methodology=cr["rating_methodology"],
            current_age=age,
        )
        cr["cost_model"] = model
        cr["base_premium_estimate"] = base_premium

    # ── State-specific flags ─────────────────────────────────────
    state_flags = []
    if state in GI_YEAR_ROUND_STATES:
        state_flags.append({"type": "gi_state", "message": GI_YEAR_ROUND_STATES[state]})
    if state in BIRTHDAY_RULE_STATES:
        br = BIRTHDAY_RULE_STATES[state]
        state_flags.append({"type": "birthday_rule", "message": br["note"]})

    return {
        "status": "recommendation",
        "primary_plan": primary_plan,
        "secondary_plan": secondary_plan if show_both_g_n else None,
        "plan_detail": PLANS.get(primary_plan, {}),
        "plan_scores": plan_scores,
        "gi_eligible": gi_eligible,
        "gi_reason": gi_reason,
        "top_carriers": carrier_results[:3],
        "all_carriers": carrier_results,
        "state": state,
        "state_flags": state_flags,
        "underwriting_note": _underwriting_note(gi_eligible, health_status, state),
        "part_d_reminder": "Medigap does not cover prescription drugs. You'll need a separate Part D plan. The right Part D plan depends on your specific medications.",
    }


def _underwriting_note(gi_eligible: bool, health_status: str, state: str) -> str:
    if gi_eligible:
        return "You have Guaranteed Issue rights — any carrier must accept your application regardless of your health history. This is your best window. Don't wait."
    elif health_status in ["excellent", "good"]:
        return "You'll need to pass medical underwriting. Based on your health profile, you should qualify with most carriers. We'll help you find the most lenient underwriting for your situation."
    elif health_status == "fair":
        return "You'll need to pass medical underwriting. Some carriers may be more difficult given your health history. We'll help identify carriers with the most favorable underwriting criteria for your situation."
    else:
        return "Based on your health history, some Medigap plans may be difficult to qualify for without a Guaranteed Issue right. We strongly recommend speaking with an advisor — there may be options, including Medicare Advantage, that work for you."


# ─────────────────────────────────────────────────────────────
# OUTPUT FORMATTER
# ─────────────────────────────────────────────────────────────

def format_recommendation(result: dict, inputs: dict) -> str:
    """Format the recommendation result as a human-readable report."""

    lines = []
    lines.append("=" * 60)
    lines.append("  THE POCKET PROTECTOR — MED SUPP RECOMMENDATION")
    lines.append("=" * 60)
    lines.append("")

    if result["status"] == "advisor_referral":
        lines.append("📋 YOUR SITUATION NEEDS PERSONALIZED ATTENTION")
        lines.append("")
        lines.append(result["reason"])
        lines.append("")
        lines.append("A TPP advisor can walk you through your specific options.")
        lines.append("They're paid the same regardless of which plan you choose.")
        return "\n".join(lines)

    # ── GI Status ──────────────────────────────────────────────
    if result["gi_eligible"]:
        lines.append("✅ GOOD NEWS: You have Guaranteed Issue rights")
    else:
        lines.append("⚠️  UNDERWRITING REQUIRED")
    lines.append(f"   {result['gi_reason'] or result['underwriting_note']}")
    lines.append("")

    # ── State flags ─────────────────────────────────────────────
    for flag in result.get("state_flags", []):
        if flag["type"] == "birthday_rule":
            lines.append(f"📅 STATE BENEFIT: {flag['message']}")
            lines.append("")

    # ── Primary plan recommendation ──────────────────────────────
    plan_id = result["primary_plan"]
    plan = result["plan_detail"]
    lines.append(f"🏆 RECOMMENDED PLAN: {plan.get('name', plan_id)}")
    lines.append("")
    lines.append(f"   {plan.get('summary', '')}")
    lines.append("")
    lines.append("   WHAT'S COVERED:")
    for item in plan.get("covers", []):
        lines.append(f"   ✓ {item}")
    lines.append("")
    lines.append("   WHAT YOU STILL PAY:")
    for item in plan.get("does_not_cover", []):
        lines.append(f"   • {item}")
    if plan.get("copays"):
        lines.append(f"   • Copays: {plan['copays']}")
    lines.append("")

    # ── Secondary plan ───────────────────────────────────────────
    if result.get("secondary_plan") and result["secondary_plan"] != plan_id:
        sec_id = result["secondary_plan"]
        sec_plan = PLANS.get(sec_id, {})
        lines.append(f"🥈 ALSO WORTH CONSIDERING: {sec_plan.get('name', sec_id)}")
        lines.append(f"   {sec_plan.get('summary', '')}")
        lines.append("")

    # ── Carrier recommendations ──────────────────────────────────
    lines.append("─" * 60)
    lines.append("📊 TOP CARRIER RECOMMENDATIONS (10-Year Cost Analysis)")
    lines.append("─" * 60)
    lines.append("")
    lines.append("  Note: Premiums shown are market estimates. Get your")
    lines.append("  exact quote from TPP — rates vary by age, gender, zip.")
    lines.append("")

    for i, carrier in enumerate(result["top_carriers"], 1):
        trend_emoji = {"stable": "🟢", "rising": "🔴", "falling": "🟢"}.get(carrier["rate_trend"], "🟡")
        lines.append(f"  #{i}: {carrier['carrier_name']}")
        lines.append(f"      Stability Score: {carrier['total']}/100")
        lines.append(f"      A.M. Best: {carrier['am_best_rating']} | Rate Trend: {trend_emoji} {carrier['rate_trend'].title()}")
        lines.append(f"      Avg Annual Increase: {carrier['avg_annual_increase']*100:.1f}%")

        if carrier.get("cost_model"):
            model = carrier["cost_model"]
            est = carrier.get("base_premium_estimate", 0)
            lines.append(f"      Est. Premium Today: ~${est}/month")
            lines.append(f"      Est. Premium Year 5: ~${model['avg_monthly_yr5']}/month")
            lines.append(f"      Est. Premium Year 10: ~${model['avg_monthly_yr10']}/month")
            lines.append(f"      ► 10-Year Estimated Total: ${model['total_10yr']:,.0f}")

        pros = carrier.get("strengths", [])[:2]
        cons = carrier.get("weaknesses", [])[:1]
        if pros:
            lines.append(f"      ✓ {pros[0]}")
        if cons:
            lines.append(f"      ⚠ {cons[0]}")
        lines.append("")

    # ── Part D reminder ──────────────────────────────────────────
    lines.append("─" * 60)
    lines.append("💊 DON'T FORGET: PART D DRUG COVERAGE")
    lines.append(f"   {result['part_d_reminder']}")
    lines.append("")

    # ── CTA ─────────────────────────────────────────────────────
    lines.append("─" * 60)
    lines.append("NEXT STEPS")
    lines.append("")
    if result["gi_eligible"]:
        lines.append("  You're in your best window to enroll. Lock in your plan")
        lines.append("  before your Open Enrollment Period closes.")
    else:
        lines.append("  A TPP advisor will check your eligibility and guide you")
        lines.append("  through the application with the right carrier.")
    lines.append("")
    lines.append("  thepocketprotector.com — No pressure. No commissions skew.")
    lines.append("  Paid the same no matter what you choose.")
    lines.append("=" * 60)

    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────
# INTERACTIVE CLI
# ─────────────────────────────────────────────────────────────

COVERAGE_OPTIONS = {
    "1": ("new_to_medicare", "New to Medicare (turning 65 / just enrolled in Part B)"),
    "2": ("ma_plan", "Currently on Medicare Advantage"),
    "3": ("medigap_existing", "Currently have a Medicare Supplement (want to switch)"),
    "4": ("original_only", "Have Parts A & B only (no supplement)"),
    "5": ("employer_ending", "Have employer/union coverage that is ending"),
    "6": ("medicaid", "Have Medicaid / Dual eligible"),
}

HEALTH_OPTIONS = {
    "1": ("excellent", "Excellent — no significant health conditions"),
    "2": ("good", "Good — minor issues, well-managed"),
    "3": ("fair", "Fair — some chronic conditions"),
    "4": ("poor", "Poor — significant health issues"),
}


def ask(prompt: str, options: dict = None, default: str = None) -> str:
    """Ask user a question with optional numbered choices."""
    print(f"\n{prompt}")
    if options:
        for key, val in options.items():
            label = val[1] if isinstance(val, tuple) else val
            print(f"  {key}. {label}")
    while True:
        raw = input(f"\n> ").strip()
        if not raw and default:
            return default
        if options:
            if raw in options:
                return raw
            print(f"  Please enter one of: {', '.join(options.keys())}")
        else:
            if raw:
                return raw
            print("  Please enter a value.")


def run_interactive():
    print("\n" + "=" * 60)
    print("  THE POCKET PROTECTOR")
    print("  Medicare Supplement Plan Finder")
    print("=" * 60)
    print("\nWe'll ask you a few questions to find the right plan.")
    print("This takes about 2 minutes.\n")

    # Age
    while True:
        age_str = ask("1. What is your age?")
        try:
            age = int(age_str)
            if 50 <= age <= 100:
                break
            print("  Please enter an age between 50 and 100.")
        except ValueError:
            print("  Please enter a valid age number.")

    if age < 65:
        print("\n⚠️  You're not yet eligible for Medicare (age 65).")
        print("   The best thing you can do right now is plan your enrollment.")
        print("   Visit thepocketprotector.com for your personalized deadline calendar.")
        return

    # Medicare eligibility date (for Plan F eligibility)
    eligible_before_2020 = False
    if age >= 70:
        eligible_str = ask(
            "2. Were you first eligible for Medicare before January 1, 2020?\n   (This determines if Plan F is available to you.)",
            {"1": "Yes", "2": "No"},
        )
        eligible_before_2020 = eligible_str == "1"

    # Zip code
    while True:
        zip_code = ask(f"{'3' if age >= 70 else '2'}. What is your zip code?")
        if len(zip_code) == 5 and zip_code.isdigit():
            break
        print("  Please enter a valid 5-digit zip code.")

    state = zip_to_state(zip_code)
    if state == "UNKNOWN":
        print(f"\n  We couldn't identify your state from zip code {zip_code}.")
        state = ask("  Please enter your 2-letter state code (e.g., IL, TX, FL):").upper()

    q_num = 4 if age >= 70 else 3

    # Current coverage
    coverage_key = ask(
        f"{q_num}. Which best describes your current coverage situation?",
        COVERAGE_OPTIONS,
    )
    current_coverage = COVERAGE_OPTIONS[coverage_key][0]
    q_num += 1

    if current_coverage == "medicaid":
        print("\n  If you have Medicaid (or are dual-eligible for Medicare and Medicaid),")
        print("  a Medicare Supplement plan is generally not the right fit.")
        print("  You likely have very low or no cost-sharing through Medicaid.")
        print("  Contact a TPP advisor to review your specific situation.")
        return

    new_to_medicare = current_coverage == "new_to_medicare"

    # Health status (skip if GI confirmed)
    gi_confirmed = new_to_medicare or current_coverage == "employer_ending" or state in GI_YEAR_ROUND_STATES
    health_status = "good"
    has_chronic_conditions = False
    doctor_visits = 4

    if not gi_confirmed:
        health_key = ask(
            f"{q_num}. How would you describe your current health?",
            HEALTH_OPTIONS,
        )
        health_status = HEALTH_OPTIONS[health_key][0]
        q_num += 1

    # Doctor visits
    visits_str = ask(
        f"{q_num}. Roughly how many times per year do you visit a doctor or specialist?\n   (Include primary care + specialists)",
        {"1": "1-2 times", "2": "3-5 times", "3": "6-10 times", "4": "10+ times"},
    )
    doctor_visits = {"1": 2, "2": 4, "3": 8, "4": 12}[visits_str]
    q_num += 1

    # Chronic conditions
    if health_status in ["fair", "poor"] or doctor_visits >= 6:
        chronic_str = ask(
            f"{q_num}. Do you have any ongoing chronic conditions\n   (e.g., heart disease, diabetes, COPD, cancer history)?",
            {"1": "Yes", "2": "No"},
        )
        has_chronic_conditions = chronic_str == "1"

    # Budget (optional)
    budget_str = ask(
        f"\nOptional: Is there a maximum monthly premium budget you're working with?\n   (Press Enter to skip)",
        default="skip",
    )
    budget_monthly_max = None
    if budget_str != "skip":
        try:
            budget_monthly_max = float(budget_str.replace("$", "").replace(",", ""))
        except ValueError:
            pass

    # ── Run engine ───────────────────────────────────────────────
    print("\n\nAnalyzing your options...\n")

    result = recommend_plan(
        age=age,
        eligible_before_2020=eligible_before_2020,
        current_coverage=current_coverage,
        new_to_medicare=new_to_medicare,
        zip_code=zip_code,
        state=state,
        health_status=health_status,
        doctor_visits_per_year=doctor_visits,
        has_chronic_conditions=has_chronic_conditions,
        budget_monthly_max=budget_monthly_max,
    )

    inputs = {
        "age": age,
        "zip_code": zip_code,
        "state": state,
        "current_coverage": current_coverage,
        "health_status": health_status,
        "doctor_visits": doctor_visits,
        "has_chronic_conditions": has_chronic_conditions,
    }

    print(format_recommendation(result, inputs))

    # Optionally save result
    output_path = f"/root/.openclaw/workspace/csg/recommendations/rec_{zip_code}_{age}_{date.today().isoformat()}.json"
    import os
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        # Make serializable
        result_clean = {k: v for k, v in result.items() if k != "plan_detail"}
        json.dump({"inputs": inputs, "result": result_clean}, f, indent=2, default=str)
    print(f"\n(Recommendation saved to {output_path})")


# ─────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="TPP Medicare Supplement Calculator")
    parser.add_argument("--json", help="Path to JSON input file for batch/API mode")
    parser.add_argument("--output", help="Output path for JSON result")
    args = parser.parse_args()

    if args.json:
        with open(args.json) as f:
            inputs = json.load(f)
        result = recommend_plan(**inputs)
        output = format_recommendation(result, inputs)
        print(output)
        if args.output:
            with open(args.output, "w") as f:
                json.dump({"inputs": inputs, "result": result}, f, indent=2, default=str)
    else:
        run_interactive()


if __name__ == "__main__":
    main()
