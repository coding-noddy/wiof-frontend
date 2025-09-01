import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { EqWidgetQuestionCardComponent } from './eq-widget-question-card.component';

describe('EqWidgetQuestionCardComponent', () => {
  let component: EqWidgetQuestionCardComponent;
  let fixture: ComponentFixture<EqWidgetQuestionCardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [EqWidgetQuestionCardComponent],
      imports: [NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(EqWidgetQuestionCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
