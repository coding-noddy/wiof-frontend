import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EqWidgetResultComponent } from './eq-widget-result.component';

describe('EqWidgetResultComponent', () => {
  let component: EqWidgetResultComponent;
  let fixture: ComponentFixture<EqWidgetResultComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [EqWidgetResultComponent],
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(EqWidgetResultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
