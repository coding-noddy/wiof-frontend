import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';

import { EnvCalDialogComponent } from './env-cal-dialog.component';

describe('EnvCalDialogComponent', () => {
  let component: EnvCalDialogComponent;
  let fixture: ComponentFixture<EnvCalDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [EnvCalDialogComponent],
      imports: [MatDialogModule]
    }).compileComponents();

    fixture = TestBed.createComponent(EnvCalDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
