import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule } from '@angular/forms';

import { AddNgoInFocusPage } from './add-ngo-in-focus.page';

describe('AddNgoInFocusPage', () => {
  let component: AddNgoInFocusPage;
  let fixture: ComponentFixture<AddNgoInFocusPage>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [AddNgoInFocusPage],
        imports: [
          NoopAnimationsModule,
          MatFormFieldModule,
          MatInputModule,
          ReactiveFormsModule
        ]
      }).compileComponents();

      fixture = TestBed.createComponent(AddNgoInFocusPage);
      component = fixture.componentInstance;
      fixture.detectChanges();
    })
  );

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
