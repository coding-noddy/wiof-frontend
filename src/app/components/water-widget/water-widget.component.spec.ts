import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WaterWidgetComponent } from './water-widget.component';

describe('WaterWidgetComponent', () => {
  let component: WaterWidgetComponent;
  let fixture: ComponentFixture<WaterWidgetComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [WaterWidgetComponent],
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(WaterWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
