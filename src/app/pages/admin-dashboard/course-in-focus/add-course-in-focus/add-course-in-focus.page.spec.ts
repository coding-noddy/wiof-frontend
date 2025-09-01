import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AddCourseInFocusPage } from './add-course-in-focus.page';

describe('AddCourseInFocusPage', () => {
  let component: AddCourseInFocusPage;
  let fixture: ComponentFixture<AddCourseInFocusPage>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [AddCourseInFocusPage],
        imports: []
      }).compileComponents();

      fixture = TestBed.createComponent(AddCourseInFocusPage);
      component = fixture.componentInstance;
      fixture.detectChanges();
    })
  );

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
