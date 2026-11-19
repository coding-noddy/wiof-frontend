# World Is One Family (WIOF)
## Future Product & Engineering Roadmap — v5
**Planning baseline:** November 2026  
**Status:** Proposed roadmap; implementation requires workstream approval.

---

## 1. Executive vision

WIOF should help people understand the planet, discover meaningful ways to care for it, take actions that fit their lives, and see their personal journey become meaningful over time.

The long-term product is not a dashboard of tasks or a game built around collecting badges. It is a personal planetary journey: a place where someone can understand what they discovered, learned, changed, contributed, and what they may explore next.

**Product promise:** Make a meaningful journey of care for our shared planet visible, understandable, and welcoming.

The Planet Passport is an expression of this journey—not the journey itself.

## 2. Product principles

1. **Planet-first, human-centered:** Encourage care and understanding without guilt, pressure, or moral ranking.
2. **Meaning over mechanics:** Avoid points, leaderboards, streak pressure, and artificial progress.
3. **Trustworthy impact:** Never claim quantified environmental impact unless the methodology and data support it.
4. **Incremental delivery:** Build on working Phase 1 and Phase 2 foundations; do not rewrite stable systems without evidence.
5. **Single source of truth:** Reuse existing trusted records and derived metrics.
6. **Privacy by default:** Personal journey data should remain personal unless a user explicitly chooses otherwise.
7. **Deterministic core:** Recommendations, eligibility, and award decisions must be explainable and testable; AI is not required for core correctness.
8. **Accessible and inclusive:** Support different abilities, levels of knowledge, time availability, and device sizes.
9. **Optional participation:** Users should be able to learn and explore without being forced to complete actions or sign in unnecessarily.
10. **No false urgency:** Notifications and challenges should be useful, respectful, and opt-in where appropriate.

## 3. Current status and baseline

Based on the supplied WIOF main and source archives and the earlier review:

- Angular 21.2.x, Ionic 8.8.x, Firebase 12.19.x, Firestore, and Cloud Functions are present.
- Phase 2 foundations include activity validation/deduplication, server-derived metrics, Take Action catalogue and history, related content/Explore Next, calendar content, Today on WIOF, My Journey, onboarding/preferences, deterministic Next for You recommendations, engagement/analytics, reset functionality, and Passport UI/stamp components/rules/demo mode/tests.
- The Passport is currently best treated as a prototype or staging experiment, not as a production-ready permanent record system.
- The supplied backend test report showed 79 function tests passing. The archive did not contain `scripts/run-rules-tests.js`, so the rules test command could not be verified from that archive.
- The source archive did not include enough complete Angular project configuration to claim a full frontend build or test was verified.

These are archive-review findings, not a guarantee about the current live repository. Start with a fresh repository audit before implementation.

## 4. Recommended roadmap sequence

### Phase 0 — Stabilization and baseline verification
**Goal:** Establish a reliable, auditable starting point.

Work:
- Re-audit the current repository and compare it with the supplied archive.
- Verify Angular/Ionic/Firebase versions and supported upgrade posture.
- Run frontend build, unit tests, Cloud Functions tests, Firestore rules tests, lint, and CI checks.
- Confirm Firebase App Check status and rollout plan.
- Review reset/deletion behavior, analytics, privacy, and account data handling.
- Document current production/staging state, known issues, and release process.
- Fix only confirmed blockers and high-risk defects.

**Exit criteria:** A current baseline report, reproducible test commands/results, risk register, and approved next workstream.

### Phase 1 — Planet Passport production foundation
**Priority:** Highest product milestone after stabilization.

**Goal:** Turn the Passport prototype into a trustworthy, durable, secure, and accessible personal journey record.

Work:
- Define Passport as a personal record and journey summary, not a score.
- Finalize stamp definitions and versioning.
- Establish server-authoritative eligibility and award logic.
- Persist permanent earned records with timestamps and provenance.
- Make awards idempotent and resilient to retries/duplicate events.
- Define how awards relate to existing action/activity/metric records.
- Ensure stamps cannot be awarded by trusting client-side state.
- Define reset, account deletion, correction, and data-retention behavior.
- Add security rules and callable/function authorization checks.
- Add admin-managed stamp definitions with controlled publication/versioning.
- Add observability for award failures and suspicious requests without collecting unnecessary personal data.
- Test migration/backfill only if required and approved.

**Exit criteria:** Security review passed, award integrity verified, permanent records tested, accessibility/mobile QA completed, operational runbook approved, and release gate signed off.

### Phase 2 — Complete the personal journey experience
**Goal:** Make the journey coherent before adding more mechanics.

Work:
- Clarify the journey flow: **Discover → Learn → Act → Track → Reflect → Improve → Discover Something New**.
- Connect My Journey, activity history, metrics, recommendations, and Passport using existing trusted data.
- Improve empty states and first-time-user guidance.
- Add optional reflection prompts where they help users understand their experience.
- Provide clear explanations for recommendations (“why this is suggested”).
- Let users choose interests/planetary themes without locking them into a pathway.
- Improve navigation between learning, action, and reflection.
- Ensure users can continue at their own pace.

**Exit criteria:** A user can understand what they have explored, what they have done, and what meaningful next step is available—without pressure or confusing duplicate records.

### Phase 3 — Climate Enlightenment integration
**Goal:** Connect WIOF’s planetary journey to deeper learning, while preserving the separate identity of Climate Enlightenment/ClimatEnlighten.

Work:
- Define integration boundaries and user experience.
- Agree on brand usage and cross-product language.
- Link learning content to relevant WIOF topics/actions only where context is useful.
- Establish consent, privacy, analytics, and deep-link behavior.
- Avoid importing or duplicating learning-platform data without a clear contract.
- Start with a small, measurable integration pilot.

**Exit criteria:** A documented integration contract, a limited pilot, and validated user value.

### Phase 4 — WIOF Contributions
**Goal:** Let users discover and participate in meaningful contributions when the organization is ready.

Potential scope:
- Contribution opportunities and their eligibility/context.
- Clear distinction between volunteering, donations, advocacy, community participation, and other contribution types.
- Transparent organization/project information and trust checks.
- Confirmation and recordkeeping without overstating outcomes.
- Optional inclusion in personal journey summaries.

**Dependencies:** Operational model, partner vetting, safeguarding, financial/legal review if money is involved, and clear contribution verification.

**Exit criteria:** Approved contribution model, vetted pilot partners/opportunities, transparent terms, and appropriate safety/privacy controls.

### Phase 5 — Personal and collective impact
**Goal:** Help users understand progress without fabricating impact.

Possible features:
- Personal journey timeline.
- Reflection summaries based on confirmed activity.
- Optional community or collective summaries only when aggregation is privacy-safe and methodology is clear.
- Transparent methodology and uncertainty.
- No conversion of every activity into speculative CO₂ or planetary impact.

**Exit criteria:** Any impact statement has documented evidence, methodology, caveats, and user comprehension testing.

### Phase 6 — Intelligent discovery and personalization
**Goal:** Make discovery more relevant without making core behavior opaque.

Possible features:
- Better deterministic recommendations based on explicit interests and trusted activity.
- Topic/pathway suggestions (e.g., water, energy, consumption, biodiversity, climate learning).
- Explainable recommendation reasons and controls to adjust preferences.
- Optional AI assistance for summaries or discovery only after privacy, accuracy, and cost review.

**Guardrails:** AI must not decide whether a user earned a Passport stamp, fabricate impact, or become a dependency for essential journey functionality.

### Phase 7 — Planetary participation and future experiences
This is a long-term opportunity space, not a committed delivery phase.

Possible directions:
- Seasonal planetary campaigns using the existing Environment Calendar.
- Shared learning experiences.
- Community initiatives with clear moderation and safety models.
- Personal “planetary story” or journey narrative.
- Cross-platform experiences and integrations.

Only promote ideas into delivery after user research, operational feasibility, and value validation.

## 5. Product opportunities and ideas

### 5.1 Passport as a personal planetary identity
The Passport can become a meaningful visual record of the user's journey: discoveries, learning, actions, reflections, and verified milestones. It should not imply that a person’s worth or environmental contribution can be ranked.

### 5.2 Personal planetary story
A private, user-controlled timeline or narrative could help answer:
- What have I discovered?
- What have I learned?
- What actions have I tried?
- What changed in my understanding?
- What would I like to explore next?

### 5.3 Optional journey pathways
Offer flexible themes rather than mandatory tracks:
- Water Guardian
- Energy Explorer
- Conscious Consumption
- Biodiversity Supporter
- Climate Learner

Use these as discovery lenses, not identity labels or permanent commitments.

### 5.4 Passport travel notes and reflections
Allow lightweight, optional notes tied to a journey moment. Keep them private by default and make deletion/export behavior clear.

### 5.5 A welcoming first experience
A new user should quickly understand WIOF, choose an interest if desired, and discover one approachable next step. Avoid overwhelming them with dashboards or requiring action immediately.

### 5.6 Planetary campaigns
Use existing calendar infrastructure to surface timely campaigns or learning themes. Campaigns should be optional and should not create streak pressure or guilt.

## 6. Cross-cutting engineering requirements

- Security: least privilege, server-side validation, Firestore rules tests, App Check strategy, abuse controls.
- Privacy: data minimization, user control, clear retention/deletion, no unnecessary public profiles.
- Accessibility: keyboard/screen-reader support, contrast, touch targets, reduced motion, responsive layout.
- Performance: Firestore query/index review, pagination, caching, bundle size, and mobile responsiveness.
- Reliability: idempotent functions, retries, logging, error handling, and operational runbooks.
- Analytics: track product usefulness, not invasive behavioral surveillance.
- Brand: complete WIOF visual alignment, remove legacy visual inconsistencies, validate CTAs and contrast.
- Quality: CI checks, automated tests, staging QA, regression tests, and release gates.

## 7. Explicitly avoid

- Points, leaderboards, public rankings, or competitive environmental scores.
- Fake or unverified environmental impact claims.
- Artificial progress or stamp awards based only on client-side state.
- Aggressive notifications, guilt, streak pressure, or shame-based language.
- Unnecessary login walls.
- A generic social network without a clear planetary purpose and safety plan.
- Blockchain/NFT mechanics as a substitute for meaningful product value.
- AI-driven award decisions or AI as a required core dependency.
- Duplicating activity, metrics, or completion data in new collections without a documented need.
- Large rewrites or production deployments without explicit approval.

## 8. Roadmap governance

Each workstream should have:
- Problem statement and user value.
- Scope and non-goals.
- Source-of-truth/data impact.
- Security/privacy/accessibility impact.
- Acceptance criteria.
- Test and rollout plan.
- Rollback or recovery plan.
- Explicit approval before production deployment.

Do not start a broad implementation phase just because the roadmap exists. First approve the workstream and its contract.

## 9. End-state experience

A WIOF user should be able to answer:
- What have I discovered about our planet?
- What have I learned?
- What actions have I taken?
- What have I reflected on or changed?
- What milestones are part of my journey?
- What can I explore next?
- How can I contribute meaningfully, if I choose?

**WIOF is not about collecting stamps. It is about making a meaningful journey visible.**
