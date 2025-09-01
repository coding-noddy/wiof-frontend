import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AqiScorecardComponent } from './aqi-scorecard.component';

describe('AqiScorecardComponent', () => {
  let component: AqiScorecardComponent;
  let fixture: ComponentFixture<AqiScorecardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AqiScorecardComponent],
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(AqiScorecardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
