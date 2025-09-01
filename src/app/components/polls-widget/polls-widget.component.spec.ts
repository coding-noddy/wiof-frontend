import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PollsWidgetComponent } from './polls-widget.component';

describe('PollsWidgetComponent', () => {
  let component: PollsWidgetComponent;
  let fixture: ComponentFixture<PollsWidgetComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [PollsWidgetComponent],
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(PollsWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
