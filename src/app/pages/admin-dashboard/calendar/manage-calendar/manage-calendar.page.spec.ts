import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';

import { ManageCalendarPage } from './manage-calendar.page';

describe('ManageCalendarPage', () => {
  let component: ManageCalendarPage;
  let fixture: ComponentFixture<ManageCalendarPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ManageCalendarPage],
      imports: [BrowserAnimationsModule, MatToolbarModule, MatButtonModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ManageCalendarPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
