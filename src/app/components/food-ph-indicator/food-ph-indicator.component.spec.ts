import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { FoodPhIndicatorComponent } from './food-ph-indicator.component';

describe('FoodPhIndicatorComponent', () => {
  let component: FoodPhIndicatorComponent;
  let fixture: ComponentFixture<FoodPhIndicatorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [FoodPhIndicatorComponent],
      imports: [NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(FoodPhIndicatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
