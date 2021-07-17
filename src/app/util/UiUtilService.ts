import { LoadingController, AlertController } from '@ionic/angular';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UiUtilService {
  constructor(
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) {}

  public async showLoader(message: string) {
    const loader = await this.loadingCtrl.create({
      message: message
    });
    loader.present();
    return loader;
  }

  public async presentAlert(header: string, message: string, buttons: any[]) {
    const alert = await this.alertCtrl.create({
      header: header,
      message: message,
      buttons: buttons
    });
    await alert.present();
  }
}
