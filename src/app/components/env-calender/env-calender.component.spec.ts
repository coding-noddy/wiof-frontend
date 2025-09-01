import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EnvCalenderComponent } from './env-calender.component';

describe('EnvCalenderComponent', () => {
  let component: EnvCalenderComponent;
  let fixture: ComponentFixture<EnvCalenderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [EnvCalenderComponent],
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(EnvCalenderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
