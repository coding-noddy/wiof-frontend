import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InFocusWidgetComponent } from './in-focus-widget.component';

describe('InFocusWidgetComponent', () => {
  let component: InFocusWidgetComponent;
  let fixture: ComponentFixture<InFocusWidgetComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [InFocusWidgetComponent],
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(InFocusWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
