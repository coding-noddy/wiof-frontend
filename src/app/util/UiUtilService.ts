import { LoadingController, AlertController, ToastController } from '@ionic/angular';
import { Injectable } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning';

const TOAST_ICON: Record<ToastType, string> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  warning: 'alert-circle'
};

@Injectable({ providedIn: 'root' })
export class UiUtilService {
  constructor(
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  public async showLoader(message: string) {
    const loader = await this.loadingCtrl.create({
      message
    });
    loader.present();
    return loader;
  }

  public async presentAlert(header: string, message: string, buttons: any[]) {
    const alert = await this.alertCtrl.create({
      cssClass: 'wiof-alert',
      header,
      message,
      buttons
    });
    await alert.present();
  }

  /**
   * Shows a modern, non-blocking toast for informational success/error/warning
   * messages that don't require a user decision.
   */
  public async presentToast(message: string, type: ToastType = 'success', duration = 3500) {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      position: 'top',
      icon: TOAST_ICON[type],
      cssClass: `wiof-toast wiof-toast--${type}`,
      buttons: [{ icon: 'close-outline', role: 'cancel' }]
    });
    await toast.present();
  }
}
