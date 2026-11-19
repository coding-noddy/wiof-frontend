# WIOF Product Backlog
**Version:** 1.0  
**Planning status:** Candidate backlog; not a commitment to delivery.

## Priority legend
- **P0:** Release blocker / trust / security.
- **P1:** Next major milestone.
- **P2:** Important product improvement.
- **P3:** Later opportunity / research required.

## P0 — Stabilization and production readiness

| ID | Item | Value | Acceptance / notes |
|---|---|---|---|
| WIOF-001 | Fresh repository baseline audit | Establish current truth | Audit branch, dependencies, build/test commands, and differences from archive. |
| WIOF-002 | Verify frontend build and tests | Reduce release uncertainty | Run supported build/test/lint; report missing config and failures honestly. |
| WIOF-003 | Restore/verify Firestore rules test pipeline | Protect data | Confirm test script and CI execution; no unverified rules release. |
| WIOF-004 | Firebase App Check review | Reduce abuse risk | Document current state, enforcement mode, rollout, and exceptions. |
| WIOF-005 | Reset/deletion behavior audit | Prevent accidental data loss | Map reset and account deletion across activity, metrics, Passport, reflections. |
| WIOF-006 | Security and privacy risk register | Focus hardening | Record risk, severity, mitigation, owner, and status. |
| WIOF-007 | Brand and accessibility regression pass | Improve trust and usability | Review legacy colors/icons, contrast, CTA clarity, responsive behavior. |

## P1 — Planet Passport production foundation

| ID | Item | Value | Acceptance / notes |
|---|---|---|---|
| WIOF-101 | Define Passport product contract | Avoid score/game confusion | Passport described as a personal journey record, not a ranking. |
| WIOF-102 | Finalize stamp definitions | Consistent meaning | Stable IDs, descriptions, categories, versioning, lifecycle. |
| WIOF-103 | Server-authoritative stamp awarding | Prevent forged awards | Trusted server logic validates eligibility and ownership. |
| WIOF-104 | Idempotent award records | Avoid duplicates | Retries/concurrent requests create one earned record. |
| WIOF-105 | Server `earnedAt` timestamps | Trustworthy chronology | Award time is server-generated. |
| WIOF-106 | Provenance/source reference | Explain award basis | Link award to qualifying trusted event/completion where appropriate. |
| WIOF-107 | Firestore rules and function authorization | Protect records | Clients cannot write authoritative awards; admin actions protected. |
| WIOF-108 | Stamp definition admin workflow | Safe future growth | Controlled publish/update/retire process; audit changes. |
| WIOF-109 | Passport reset/deletion contract | User trust | Clear retention, reset, correction, deletion semantics. |
| WIOF-110 | Passport security/integration test suite | Release confidence | Covers ownership, invalid eligibility, duplicate calls, concurrency, rules. |
| WIOF-111 | Passport accessibility/mobile QA | Inclusive experience | Keyboard, screen reader, contrast, responsive, reduced motion. |
| WIOF-112 | Passport production runbook | Operational readiness | Monitoring, rollout, rollback, support instructions. |

## P2 — Complete the personal journey

| ID | Item | Value | Acceptance / notes |
|---|---|---|---|
| WIOF-201 | Journey flow coherence | Make product understandable | Discover → Learn → Act → Track → Reflect → Improve → Discover Something New. |
| WIOF-202 | My Journey timeline | Personal context | Reuse existing trusted records; avoid duplicate source data. |
| WIOF-203 | Explainable Next for You | Trust recommendations | Show why a suggestion appears and allow preference changes. |
| WIOF-204 | New-user welcome flow | Reduce onboarding friction | One clear, approachable first step; optional preferences. |
| WIOF-205 | Helpful empty states | Avoid discouragement | Explain how to begin without implying failure or lack of worth. |
| WIOF-206 | Optional reflection prompts | Support learning | Private by default, lightweight, editable/deletable. |
| WIOF-207 | Journey theme preferences | Support user choice | Optional interests such as water, energy, biodiversity, consumption. |
| WIOF-208 | Connect learning/action/reflect screens | Reduce fragmentation | Contextual navigation without forcing action completion. |

## P2 — Learning integration

| ID | Item | Value | Acceptance / notes |
|---|---|---|---|
| WIOF-301 | Climate Enlightenment integration contract | Clear boundaries | Define ownership, links, analytics, privacy, and brand. |
| WIOF-302 | Learning-to-action contextual links | Relevant next steps | Links are contextual, not intrusive or duplicative. |
| WIOF-303 | Integration pilot | Validate value | Limited pilot with success measures and rollback. |

## P3 — Contributions

| ID | Item | Value | Dependencies |
|---|---|---|---|
| WIOF-401 | Contribution model discovery | Clarify scope | Define volunteering, donation, advocacy, community types. |
| WIOF-402 | Partner/opportunity trust framework | Protect users | Vetting, transparency, safeguarding, reporting. |
| WIOF-403 | Contribution record in journey | Personal continuity | Verified, privacy-conscious, no inflated impact claims. |
| WIOF-404 | Contribution pilot | Learn before scaling | Requires approved operational and legal model. |

## P3 — Impact and personalization

| ID | Item | Value | Guardrails |
|---|---|---|---|
| WIOF-501 | Personal planetary story | Meaningful reflection | User-controlled, grounded in actual activity. |
| WIOF-502 | Personal journey summary | Help users see growth | No fake impact or speculative metrics. |
| WIOF-503 | Collective summary research | Shared perspective | Privacy-safe aggregation and transparent methodology. |
| WIOF-504 | Topic/pathway discovery | Better relevance | Optional paths, no permanent labels or score. |
| WIOF-505 | AI-assisted discovery research | Explore future utility | Optional; privacy, cost, accuracy review; not core eligibility. |

## P3 — Campaigns and future experiences

| ID | Item | Value | Guardrails |
|---|---|---|---|
| WIOF-601 | Seasonal planetary campaigns | Timely discovery | Reuse Environment Calendar; opt-in and non-competitive. |
| WIOF-602 | Shared learning experiences | Encourage collective learning | Research moderation and safety needs. |
| WIOF-603 | Community participation research | Potential collective action | No generic social network without purpose and safety plan. |
| WIOF-604 | Passport journey narrative | Emotional resonance | Personal, meaningful, non-ranking experience. |

## Backlog grooming rules

Before any item is promoted to a sprint:
1. Confirm current user problem and evidence.
2. Confirm scope, non-goals, and acceptance criteria.
3. Identify dependencies and data source-of-truth.
4. Review security, privacy, accessibility, and operational impact.
5. Estimate complexity and define rollout/rollback.
6. Obtain product approval.

## Explicit exclusions

Do not add:
- Points or leaderboards.
- Public rankings or competitive environmental scores.
- Fake impact totals.
- Client-side award decisions.
- Blockchain/NFT features.
- AI as a required core dependency.
- Duplicate activity/metrics collections without a documented architecture decision.
- Aggressive streaks, guilt-based messaging, or unnecessary login gates.
