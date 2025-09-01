import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FoodPhIndicatorMeterComponent } from './food-ph-indicator-meter.component';

describe('FoodPhIndicatorMeterComponent', () => {
  let component: FoodPhIndicatorMeterComponent;
  let fixture: ComponentFixture<FoodPhIndicatorMeterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [FoodPhIndicatorMeterComponent],
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(FoodPhIndicatorMeterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
