import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EnergyWidgetComponent } from './energy-widget.component';

describe('EnergyWidgetComponent', () => {
  let component: EnergyWidgetComponent;
  let fixture: ComponentFixture<EnergyWidgetComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [EnergyWidgetComponent],
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(EnergyWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
