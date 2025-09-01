import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AddOccasionPage } from './add-occasion.page';

describe('AddOccasionPage', () => {
  let component: AddOccasionPage;
  let fixture: ComponentFixture<AddOccasionPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AddOccasionPage],
      imports: [NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(AddOccasionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
