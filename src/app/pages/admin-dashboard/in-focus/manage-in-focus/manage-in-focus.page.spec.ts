import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ManageInFocusPage } from './manage-in-focus.page';

describe('ManageInFocusPage', () => {
  let component: ManageInFocusPage;
  let fixture: ComponentFixture<ManageInFocusPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ManageInFocusPage],
      imports: [NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ManageInFocusPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
