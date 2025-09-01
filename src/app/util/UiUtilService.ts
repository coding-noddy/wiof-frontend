import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ComponentType } from '@angular/cdk/portal';

@Injectable({ providedIn: 'root' })
export class UiUtilService {
  constructor(
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  public showLoader(message: string) {
    return this.snackBar.open(message, '', {
      duration: 0,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  public presentAlert(header: string, message: string, buttons: any[]) {
    return this.snackBar.open(`${header}: ${message}`, 'Close', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }

  public openDialog<T>(component: ComponentType<T>, data?: any) {
    return this.dialog.open(component, {
      data,
      width: '400px'
    });
  }
}
