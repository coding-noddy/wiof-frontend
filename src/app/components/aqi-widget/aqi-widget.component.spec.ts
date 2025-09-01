import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { AqiWidgetComponent } from './aqi-widget.component';

describe('AqiWidgetComponent', () => {
  let component: AqiWidgetComponent;
  let fixture: ComponentFixture<AqiWidgetComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AqiWidgetComponent],
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(AqiWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
