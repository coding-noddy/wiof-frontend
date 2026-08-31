# WIOF Future Enhancements & Product Roadmap - v4

**Purpose:** Define the future product direction for WIOF after the Foundation Hardening Plan is implemented and the website is aligned with the approved brand system. This document is intentionally separate from the security/foundation plan so Kiro / Copilot can work on the foundation without prematurely implementing speculative features.

**Product stance:** WIOF remains the primary platform. ClimatEnlighten is a separate website/platform that may be connected through course discovery/recommendation and future learning hand-offs.

**Not in near-term scope:** social network, community feed, public profiles, messaging, following, user-to-user networking.

# 0. Recommended Delivery Sequence

The roadmap should follow this sequence so product expansion does not outrun platform quality or brand consistency:

**Phase 0 - Foundation Hardening**
Security, authorization, privacy, data integrity, event architecture, performance, observability, guest-first safeguards and automated tests.

**Phase 1 - Brand & Experience Alignment**
Bring the existing WIOF website into alignment with the approved WIOF/ClimatEnlighten visual system and improve information architecture, navigation, content hierarchy and reusable UX patterns. This phase comes before major new feature development.

**Phase 2 - Journey & Engagement Foundations**
Connected content, onboarding, Today on WIOF, improved My Journey, action model and early recommendation primitives.

**Phase 3 - Planet Passport & Meaningful Achievement**
Passport, stamps, badges, streak milestones and trusted achievement rules.

**Phase 4 - Personal Impact & Collective Impact**
Validated impact calculations, personal summaries, anonymous aggregate WIOF impact.

**Phase 5 - Personalization & ClimatEnlighten Hand-off**
Behavior-aware recommendations and contextual course recommendations to the separate ClimatEnlighten platform.

**Later - Optional Community Capabilities**
Only revisit community/social functionality after privacy, moderation, safety and operational requirements are explicitly accepted.

---

# 1. WIOF Product North Star

WIOF should help an individual:

**Discover -> Understand -> Act -> Track -> Improve -> Measure**

The goal is not to maximize time spent on the website. The goal is to help users make meaningful lifestyle/environmental improvements and understand the impact of those changes.

A successful WIOF user should eventually be able to answer:

- What have I learned?
- What have I changed?
- What should I try next?
- How am I progressing?
- What impact have my actions had?
- What have WIOF users achieved collectively?

---

# 2. Guest-First Product Principle

WIOF must remain useful before a visitor ever creates an account. Guest access is a deliberate part of the product strategy, not a temporary MVP condition.

## Guest users

Guests should be able to do essentially everything that is public today:

- browse and search public WIOF content
- read blogs/articles
- watch public videos
- explore Earth, Energy, Air, Water and Spirit
- use public environmental tools/widgets
- view calendar/events
- explore public polls/content
- browse courses and course information
- follow public content journeys and related links

## Logged-in users

A signed-in account adds memory and continuity rather than basic access:

- saved/favorite content
- personal activity and journey history
- EQ history
- streaks/progress
- future action completion
- future Planet Passport
- future personal impact
- future personalized recommendations

## UX rule

Do not turn WIOF into a login wall. The guest experience should be a complete discovery experience, while authentication should feel like an invitation to let WIOF remember the user's journey.

## Guest-to-user transition

Use temporary session context where appropriate, but do not silently create a persistent personal journey for anonymous visitors. If a guest later signs in, define explicitly which temporary signals, if any, are promoted into the user's permanent history.

---

# 3. Product Architecture Direction

WIOF should evolve into several connected engines.

## Content Engine

Existing strengths:

- blogs
- videos
- news
- Coffee Conversations
- In Focus
- polls
- calendar
- tools/widgets
- EQ
- courses/course discovery
- Take Action content

## Personal Journey Engine

- profile/preferences
- saved content
- activity history
- EQ history
- learning progress
- action history
- habit signals
- personal milestones

## Action & Impact Engine

- small actions
- repeatable actions
- challenges
- action completion
- optional evidence
- measurable impact
- methodology/versioning

## Recommendation Engine

Uses user preferences and trusted behavioral signals to recommend:

- content
- actions
- activities
- learning resources
- ClimatEnlighten courses

## Passport / Achievement Engine

- milestones
- stamps
- badges
- levels
- streak achievements
- learning achievements
- lifestyle achievements
- impact achievements

## Collective Impact Layer

Anonymous, aggregate-only reporting of total actions and validated impact.

---

# 4. Information Architecture - Make WIOF Feel Like One Product

WIOF already contains many content types. The future experience must connect them through a simple mental model instead of asking users to understand the CMS structure.

### Primary journey

**Discover**

Today's event, interesting fact, featured topics, search, recommendations.

**Learn**

Blog, video, conversation, poll, EQ, educational content.

**Act**

Small action, challenge, habit/activity.

**Track**

My Journey, history, progress, streaks, Passport.

**Improve**

Personal recommendations, next steps, relevant learning, ClimatEnlighten links.

### Five elements remain important

Earth, Energy, Air, Water and Spirit should remain a strong content taxonomy and visual/navigation concept, but users should still understand the overall journey without memorizing the taxonomy.

---

# 4.1 Brand & Experience Alignment

The existing WIOF site should be brought into alignment with the new brand system after foundation hardening and before major feature expansion. The goal is not to copy ClimatEnlighten or turn WIOF into the ClimatEnlighten website; WIOF remains its own primary product while sharing the approved visual family.

## Brand requirements to carry into implementation

The brand guide establishes: **Earthy Brown #A6875D**, **Ocean Teal #21999F**, **Sunny Marigold #FFC26F**, **Ivory #FAF5EC**, **Warm White #FFFCF6**, and **Near-black #2B2420**; Aleo for display/headlines and Noto Sans for body text. fileciteturn0file0L186-L224

Implementation should also respect the approved logo variants and contrast rules, including the guidance that Marigold is an accent/CTA color rather than a background field. fileciteturn0file0L91-L123

### Visual behavior

- warm, earthy, luminous rather than sterile/corporate
- clean, bold linework
- flat graphic treatment for people, plants and animals
- visual storytelling should begin with the idea/message, not with decorative motifs
- use visual vocabulary such as rays, waves, circles or elemental forms only where they clarify meaning

### Website alignment work

1. Create shared design tokens and reusable UI primitives.
2. Apply typography consistently across navigation, headings, cards and content.
3. Standardize buttons, chips, badges, tabs, forms, modals and empty states.
4. Align hero sections, cards and illustrations with the visual system.
5. Establish a consistent icon/linework treatment.
6. Audit all existing imagery and replace off-brand visuals where necessary.
7. Apply responsive rules consistently across desktop/tablet/mobile.
8. Add accessibility and contrast checks to the design-system acceptance criteria.
9. Update admin UI enough to feel part of the same product family, while preserving its utility-focused nature.

### Do not do

- do not redesign every page from scratch
- do not change information architecture and visual styling simultaneously without controlled review
- do not place the ClimatEnlighten logo where the WIOF logo is required
- do not use AI-generated imagery as final production artwork without manual brand review
- do not use decorative motifs just because they appear in the guide

# 5. Connected Content Model

Every major content item should eventually answer:

**What can I explore next?**

Examples:

### Calendar event

Event -> curiosity fact -> related article -> related video -> action

### Blog

Blog -> related video -> related action -> related course

### EQ

EQ result -> interpretation -> activity -> relevant content -> optional course

### Action

Action -> completion -> impact -> next action -> Passport milestone

This creates a connected ecosystem without a social network.

---

# 6. Onboarding Experience

A first-time visitor should not feel that WIOF is a large collection of unrelated features.

## Guest onboarding

A lightweight slider/tour can introduce:

1. Explore WIOF
2. Learn about environmental topics
3. Understand yourself with EQ and tools
4. Take small actions
5. Track your journey
6. Build your Planet Passport over time

The tour should be skippable.

## New authenticated user

After Google Sign-In, offer an optional short onboarding flow:

- choose interests/topics
- choose what they want to explore
- optionally start EQ
- optionally save first content
- optionally try a first action

## First-week progression

A simple progressive journey can be shown on the dashboard:

- Explore your first topic
- Read your first story
- Complete your first video
- Try EQ
- Complete your first action
- Start your Passport

Do not make these mandatory.

---

# 7. "Today on WIOF" / Calendar Curiosity Feature

Keep this as a high-value future UX feature.

When a user visits WIOF, show a lightweight relevant prompt when appropriate:

**Today on WIOF**

- today's environmental event(s)
- one short fact or question
- one related story/video
- optional action

Potential experience:

**Event -> curiosity -> exploration -> action**

Rules:

- avoid showing the same modal repeatedly
- allow dismiss/snooze
- respect accessibility
- show only relevant/meaningful events
- use concise facts with verified sources

This can eventually become personalized based on user interests.

---

# 8. Planet Passport - Flagship Future Experience

Planet Passport should visually represent the user's environmental journey.

It should not be a generic "points page". Every stamp/badge should correspond to a meaningful activity, learning milestone, habit or measurable action.

## Passport categories

### Nature

- planted 1 tree
- planted 10 trees
- planted 25 trees
- completed a biodiversity activity

### Energy

- completed first energy action
- 7-day energy-conscious streak
- 10 verified energy actions
- estimated energy savings milestone

### Mobility

- walking/cycling milestone
- public-transport action
- mobility challenge milestone

### Food

- 7-day healthy-food streak
- sustainable food choices
- food-waste reduction milestone

### Waste

- recycling milestones
- waste-reduction challenge
- reuse/refill milestones

### Learning

- first blog
- 10 quality reads
- 10 videos completed
- learning path completed
- EQ milestone

### Consistency

- 3-day streak
- 7-day streak
- 30-day streak
- 100-day streak

### Personal growth

- EQ improvement milestone
- attention/focus activity milestones
- wellness/lifestyle habit milestones

## Passport design principle

Show progress as a story:

> You have explored 4 elements, completed 17 meaningful actions, improved your EQ score by 11 points, and earned 8 Passport milestones.

The Passport should celebrate growth rather than create pressure.

---

# 9. Achievement System

Achievements should be rule-based and trusted.

Conceptual pipeline:

**event -> validated metric -> achievement rule -> Passport stamp**

A user must not be able to write:

`badge = unlocked`

directly from the browser.

## Achievement types

- first-time achievement
- count milestone
- streak milestone
- improvement milestone
- learning milestone
- action milestone
- impact milestone

## Levels

Example:

**Tree Planter**

1 tree -> 5 -> 10 -> 25 -> 50

**Knowledge Explorer**

5 reads -> 10 -> 25 -> 50

**Consistency**

3 days -> 7 -> 30 -> 100

---

# 10. Action Engine

The future Take Action area should become a structured action system, not only informational content.

## Action definition

Potential fields:

- title
- explanation
- why it matters
- category
- element
- difficulty
- duration
- repeatability
- measurement method
- evidence requirements
- impact method
- source/methodology
- related content
- related course
- status

## User completion

Potential record:

- userId
- actionId
- startedAt
- completedAt
- repetition count
- measured value
- optional evidence
- verification status
- impact result

## Examples

- switch off lights when leaving
- reduce standby power
- walk instead of drive
- refill a reusable bottle
- recycle a particular material
- reduce food waste
- plant/care for a tree
- water plants responsibly
- reduce single-use plastic

Start simple. Avoid forcing evidence for low-risk everyday actions.

---

# 11. Impact Engine

Impact should be measurable where defensible.

Examples users may eventually see:

- estimated kWh saved
- estimated CO2e avoided
- litres of water conserved
- kilograms of waste diverted
- number of trees planted
- mobility distance changed

Every calculation must show an appropriate method/assumption level.

Do not display false precision.

Example:

> Estimated energy saved: 4.2 kWh

not:

> Exactly 4.237891 kWh saved

unless the measurement truly supports that precision.

Impact methodology should be versioned so historical results remain auditable.

---

# 12. Personal Dashboard Evolution

The current dashboard tells users what they have done. The future dashboard should help them understand what it means and what to do next.

## Layer 1 - What you did

- blogs completed
- videos watched
- polls answered
- EQ history
- saved content

## Layer 2 - What you are becoming

- learning areas explored
- habits/trends
- streaks
- improving EQ dimensions
- Passport milestones

## Layer 3 - Your impact

- actions completed
- trees planted
- energy saved
- waste avoided/recycled
- estimated environmental impact

## Layer 4 - What to do next

Examples:

> You have explored Earth more than any other topic. Explore Energy next.

> You usually open articles but complete fewer long reads. Try a 3-minute activity.

> Your attention score could benefit from these focus activities.

> You completed 8 energy actions. Two more actions unlock your next milestone.

> Want to learn more about this topic? Explore a related ClimatEnlighten course.

Recommendations must be explainable and not overly intrusive.

---

# 13. Healthy Comparisons and Benchmarks

Comparisons can motivate, but they can also mislead.

Use anonymized aggregates only and choose careful language.

Good examples:

> 3 out of 100 active users complete this type of learning item.

> You complete 18% more articles than the average active learner.

> Most users who complete this activity return within a week.

Avoid:

- naming individuals
- public ranking by default
- shame-based comparison
- comparison without a clear population/time window

Use denominators, date range and segment definition internally so metrics are honest.

---

# 14. Personal Recommendations

Start with deterministic, explainable recommendation rules before introducing complex AI.

Examples:

### Interest-based

User frequently explores Earth -> recommend Earth content/action.

### Gap-based

User explores content but rarely completes it -> recommend short-form content.

### Progress-based

User is close to a Passport milestone -> recommend the next eligible action.

### EQ-based

User's attention-related score suggests a useful activity -> recommend a relevant focus activity.

### Seasonal/calendar

Relevant event today -> show related content/action.

### Learning bridge

User activity indicates an interest/gap -> recommend a ClimatEnlighten course.

Only later consider an AI recommendation layer once the deterministic signals and feedback loops are working.

---

# 15. ClimatEnlighten Integration

ClimatEnlighten is a separate website/platform.

WIOF should not become an LMS for ClimatEnlighten.

The primary relationship is:

**WIOF signal/content -> relevant course recommendation -> ClimatEnlighten**

Potential future integration:

- deep links
- tracked referral/click event
- course recommendation metadata
- optional return-to-WIOF journey

Avoid shared internal data models unless there is a clear long-term product reason.

---

# 16. Collective Impact Without a Social Network

Community/social functionality is intentionally deferred.

WIOF can still show collective achievement through anonymous aggregation.

Example:

**WIOF users completed 250,000 actions**

**Estimated total energy saved: X**

**Estimated total waste diverted: Y**

The aggregation should be based on validated user actions and documented methodology.

Never expose the raw personal histories behind the aggregate.

---

# 17. Analytics Roadmap

## Product analytics

Measure:

- acquisition
- registration
- activation
- content engagement
- completion
- EQ participation
- action completion
- repeat behavior
- Passport unlocks
- recommendation clicks
- ClimatEnlighten referrals
- retention

## Admin insights

The admin dashboard should eventually answer:

**What are users interested in?**

**What content works?**

**Where do users drop off?**

**Which actions are actually completed?**

**Which recommendations work?**

**What collective impact is being generated?**

---

# 18. Future Notification Strategy

Notifications should be useful, optional and behavior-aware.

Potential examples:

- daily/weekly action suggestion
- streak reminder
- Passport milestone unlocked
- today's environmental event
- relevant article/video
- course recommendation

Do not turn WIOF into a notification-heavy engagement loop.

Preference controls should exist.

---

# 19. Feature Prioritization

## Near-term after foundation

### P0/P1

- information architecture cleanup
- onboarding
- connected-content model
- personal dashboard improvements
- action model design

### P1

- structured actions
- progress tracking
- recommendation rules

### P1/P2

- Planet Passport
- achievements
- impact engine

## Later

- advanced personalization
- ClimatEnlighten referral intelligence
- richer aggregate impact
- notifications

## Deferred

- social feed
- messaging
- following
- public user profiles
- community network
- competitive leaderboard by default

---

# 20. Example Long-Term User Journey

A future WIOF experience could look like this:

**Visit WIOF**

-> Today on WIOF shows an environmental event

-> user reads a short fact

-> opens a related Earth article

-> watches a 2-minute video

-> WIOF suggests a small action

-> user completes the action

-> impact is calculated using a documented method

-> Passport milestone unlocks

-> dashboard celebrates progress

-> WIOF notices the user's interest in Earth

-> recommends another action or learning item

-> optionally recommends a related ClimatEnlighten course

-> over time, the dashboard shows personal improvement

-> aggregate systems contribute the action to WIOF collective impact

No social network is required for this entire journey.

---

# 21. Design Principles for Future Development

1. **Progress over pressure.**
2. **Real behavior over vanity engagement.**
3. **Curiosity over guilt.**
4. **Measured impact over invented numbers.**
5. **Personal growth over competition.**
6. **Explainable recommendations before opaque AI.**
7. **Privacy by default.**
8. **Every major page should suggest a useful next step.**
9. **New features must plug into the existing event/data foundation.**
10. **Do not make the platform more complicated than the user needs.**

---

# 22. Suggested Future Release Sequence

## Release A - Connected WIOF

Focus:

- IA
- navigation
- related content
- onboarding
- better My Journey
- clearer next steps

## Release B - One Small Step / Action Engine

Focus:

- structured actions
- completion
- repeat behavior
- initial impact calculations

## Release C - Planet Passport

Focus:

- stamps
- badges
- milestones
- streak achievements
- learning achievements

## Release D - Personal Intelligence

Focus:

- behavioral insights
- recommendations
- healthy comparisons
- next-best-action logic

## Release E - Impact at Scale

Focus:

- validated personal impact
- aggregate impact
- methodology transparency
- stronger admin reporting

## Release F - Learning Bridge

Focus:

- ClimatEnlighten course recommendations
- safe deep links
- referral/learning analytics

Community/social features remain a separate future decision and should not be assumed by these releases.

---

# 23. Final Product Vision

WIOF should eventually feel like a calm, intelligent companion for environmental improvement:

**It helps me discover something.**

**It helps me understand it.**

**It gives me something realistic to try.**

**It remembers what I have done.**

**It helps me see whether I am improving.**

**It shows me the difference my actions can make.**

**And it shows me that my individual actions can add up to collective progress.**

The product should grow in depth without becoming confusing, noisy or privacy-invasive.
