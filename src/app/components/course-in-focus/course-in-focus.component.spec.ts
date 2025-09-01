import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CourseInFocusComponent } from './course-in-focus.component';

describe('CourseInFocusComponent', () => {
  let component: CourseInFocusComponent;
  let fixture: ComponentFixture<CourseInFocusComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CourseInFocusComponent],
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(CourseInFocusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
