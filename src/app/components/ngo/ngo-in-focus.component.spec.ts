import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NgoInFocusComponent } from './ngo-in-focus.component';

describe('NgoInFocusComponent', () => {
  let component: NgoInFocusComponent;
  let fixture: ComponentFixture<NgoInFocusComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [NgoInFocusComponent],
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(NgoInFocusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
