import { trigger, state, style, transition, animate, AnimationTriggerMetadata } from '@angular/animations';

/**
 * Shared "About" panel expand/collapse animation for the widget family
 * (AQI/Water/EQ/Energy/Food-pH). Previously each widget animated a guessed
 * fixed max-height (0 -> 120px/140px), which either clipped long text or
 * left a dead gap below short text, and felt uneven since most of the
 * transition was spent animating past empty space. A later CSS-only
 * attempt (grid-template-rows 0fr -> 1fr) fixed the gap but still felt
 * stuttery, because animating a grid track size forces a full layout
 * recalculation on every frame rather than running on the compositor.
 *
 * This uses Angular's animation engine instead, which measures the
 * element's actual rendered height via the '*' (AUTO_STYLE) token before
 * running the animation — it always matches the real content height
 * exactly, for any amount of text, with no guessing and no CSS hacks.
 *
 * Usage at the call site:
 *   <div class="about-panel" [@expandCollapse]="about ? 'expanded' : 'collapsed'">
 * and add `animations: [expandCollapseAnimation]` to the component's
 * @Component decorator.
 */
export const expandCollapseAnimation: AnimationTriggerMetadata = trigger('expandCollapse', [
  state('collapsed', style({ height: '0px', overflow: 'hidden' })),
  state('expanded', style({ height: '*', overflow: 'hidden' })),
  transition('collapsed <=> expanded', animate('300ms cubic-bezier(0.4, 0, 0.2, 1)'))
]);
