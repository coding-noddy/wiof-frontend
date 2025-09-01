import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { WiofSpinnerComponent } from './wiof-spinner.component';

describe('WiofSpinnerComponent', () => {
  let component: WiofSpinnerComponent;
  let fixture: ComponentFixture<WiofSpinnerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [WiofSpinnerComponent],
      imports: [MatProgressSpinnerModule]
    }).compileComponents();

    fixture = TestBed.createComponent(WiofSpinnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
