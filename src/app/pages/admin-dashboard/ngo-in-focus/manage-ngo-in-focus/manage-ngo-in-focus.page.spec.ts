import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ManageNgoInFocusPage } from './manage-ngo-in-focus.page';

describe('ManageNgoInFocusPage', () => {
  let component: ManageNgoInFocusPage;
  let fixture: ComponentFixture<ManageNgoInFocusPage>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [ManageNgoInFocusPage],
        imports: []
      }).compileComponents();

      fixture = TestBed.createComponent(ManageNgoInFocusPage);
      component = fixture.componentInstance;
      fixture.detectChanges();
    })
  );

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
