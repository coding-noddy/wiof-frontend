import { createAnimation, Animation } from '@ionic/angular';

/**
 * Shared ModalController enter/leave animation: the modal zooms out from
 * wherever the user clicked to open it, and shrinks back into that same
 * spot on close, instead of Ionic's default generic fade/slide. Originally
 * written for EnvCalDialogComponent (env-calender.component.ts) — pulled
 * out here so every modal in the app uses the same effect instead of each
 * call site reimplementing it.
 *
 * Usage at a modal-opening call site:
 *   async openSomething(data, event?: MouseEvent) {
 *     const originRect = (event?.currentTarget as HTMLElement)?.getBoundingClientRect();
 *     const modal = await this.modalCtrl.create({
 *       component: SomeDialogComponent,
 *       componentProps: { data },
 *       cssClass: 'some-modal',
 *       backdropDismiss: true,
 *       enterAnimation: (baseEl) => buildModalZoomAnimation(baseEl, originRect, false),
 *       leaveAnimation: (baseEl) => buildModalZoomAnimation(baseEl, originRect, true)
 *     });
 *     await modal.present();
 *   }
 * and thread `$event` through from the template's (click) handler so
 * `originRect` can be captured — falls back to a plain scale-in/out when no
 * origin is available (e.g. a keyboard-triggered open with no click event).
 */
export function buildModalZoomAnimation(
  baseEl: HTMLElement,
  originRect: DOMRect | undefined,
  reverse: boolean
): Animation {
  // Ionic 7 modals render inside a shadow root — fall back to baseEl itself
  // if there isn't one (e.g. shady-DOM polyfill environments).
  const root = (baseEl.shadowRoot ?? baseEl) as ParentNode;
  const wrapperEl = root.querySelector('.modal-wrapper') as HTMLElement;
  const backdropEl = root.querySelector('ion-backdrop') as HTMLElement;

  const backdropAnimation = createAnimation().addElement(backdropEl).fromTo('opacity', '0.01', 'var(--backdrop-opacity)');
  const wrapperAnimation = createAnimation().addElement(wrapperEl);

  if (originRect && wrapperEl) {
    const targetRect = wrapperEl.getBoundingClientRect();
    const translateX = originRect.left + originRect.width / 2 - (targetRect.left + targetRect.width / 2);
    const translateY = originRect.top + originRect.height / 2 - (targetRect.top + targetRect.height / 2);
    const scale = Math.max(Math.min(originRect.width / targetRect.width, 1), 0.05);

    wrapperAnimation.keyframes([
      { offset: 0, opacity: '0', transform: `translate(${translateX}px, ${translateY}px) scale(${scale})` },
      { offset: 1, opacity: '1', transform: 'translate(0, 0) scale(1)' }
    ]);
  } else {
    // No origin captured (e.g. keyboard-triggered open) — plain scale-in.
    wrapperAnimation.keyframes([
      { offset: 0, opacity: '0', transform: 'scale(0.8)' },
      { offset: 1, opacity: '1', transform: 'scale(1)' }
    ]);
  }

  const baseAnimation = createAnimation()
    .addElement(baseEl)
    .easing('cubic-bezier(0.32, 0.72, 0, 1)')
    .duration(380)
    .addAnimation([backdropAnimation, wrapperAnimation]);

  return reverse ? baseAnimation.direction('reverse') : baseAnimation;
}
