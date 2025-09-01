import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { throwError, Subject } from 'rxjs';
import { Subscriber } from '../../models/Subscriber';
import { catchError, map, takeUntil } from 'rxjs/operators';
import { SubscriptionService } from '../../services/subscription.service';
import { UiUtilService } from 'src/app/util/UiUtilService';
import { UI_MESSAGES } from 'src/app/app.constants';

@Component({
  selector: 'app-subscribe',
  templateUrl: './subscribe.component.html',
  styleUrls: ['./subscribe.component.scss'],
  standalone: false
})
export class SubscribeComponent implements OnInit, OnDestroy {
  @Input() page: string;
  addSubscriberForm: FormGroup;
  subscribeButton: boolean;
  error: string;
  loader;
  destroy$: Subject<boolean> = new Subject();

  constructor(
    private subscribeService: SubscriptionService,
    private uiUtil: UiUtilService
  ) {}

  ngOnInit() {
    this.subscribeButton = true;
    this.addSubscriberForm = new FormGroup({
      firstName: new FormControl('', [Validators.required]),
      lastName: new FormControl('', [Validators.required]),
      email: new FormControl('', [
        Validators.required,
        Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')
      ])
    });
    this.openSubscriptionForm();
  }

  getElement(element) {
    if (element === this.page) {
      return true;
    } else {
      return false;
    }
  }

  async onSubmit() {
    if (this.addSubscriberForm.valid) {
      this.loader = await this.uiUtil.showLoader(
        UI_MESSAGES.SAVE_IN_PROGRESS.replace(
          UI_MESSAGES.PLACEHOLDER,
          'subscription'
        )
      );
      this.subscribeService
        .findSubscriber(this.addSubscriberForm.value.email)
        .subscribe(async (data) => {
          if (data) {
            this.loader.dismiss();
            this.uiUtil.presentAlert(
              UI_MESSAGES.SUCCESS_HEADER,
              UI_MESSAGES.ALREADY_SUBSCRIBED,
              [UI_MESSAGES.SUCCESS_CTA_TEXT]
            );
          } else {
            const subscriber = Subscriber.createByForm(this.addSubscriberForm);
            this.subscribeService
              .saveSubscriber(subscriber)
              .pipe(
                takeUntil(this.destroy$),
                catchError((err) => {
                  return throwError(err);
                })
              )
              .subscribe(
                () => {
                  this.subscribeButton = true;
                  this.setSubscribedFlag();

                  this.loader.dismiss();
                  this.addSubscriberForm.reset();
                  this.uiUtil.presentAlert(
                    UI_MESSAGES.SUCCESS_HEADER,
                    UI_MESSAGES.SUCCESS_SUBSCRIPTION,
                    [UI_MESSAGES.SUCCESS_CTA_TEXT]
                  );
                },
                (error) => {
                  this.loader.dismiss();
                  this.uiUtil.presentAlert(
                    UI_MESSAGES.FAILURE_HEADER,
                    UI_MESSAGES.FAILURE_ADD_ITEM_DESC.replace(
                      UI_MESSAGES.PLACEHOLDER,
                      'subscription'
                    ),
                    [UI_MESSAGES.FAILURE_CTA_TEXT]
                  );
                }
              );
          }
        });
    }
  }

  setSubscribedFlag() {
    localStorage.setItem('subscribed', 'true');
  }

  setSubscriptionOpenedFlag() {
    sessionStorage.setItem('subscriptionBoxOpened', 'true');
  }

  getSubscriptionOpenedFlag() {
    return Boolean(sessionStorage.getItem('subscriptionBoxOpened'));
  }

  getSubscribedFlag() {
    return Boolean(localStorage.getItem('subscribed'));
  }

  openSubscriptionForm() {
    if (!this.getSubscribedFlag()) {
      setTimeout(() => {
        this.triggerOpen();
      }, 10000);
    }
  }

  triggerOpen() {
    if (!this.getSubscriptionOpenedFlag()) {
      this.subscribeButton = false;
      this.setSubscriptionOpenedFlag();
    }
  }

  onSubscribeButtonClick() {
    this.subscribeButton = false;
  }

  onBack() {
    this.subscribeButton = true;
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
