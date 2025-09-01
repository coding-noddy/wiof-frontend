import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageNewsPage } from './manage-news.page';

describe('ManageNewsPage', () => {
  let component: ManageNewsPage;
  let fixture: ComponentFixture<ManageNewsPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ManageNewsPage],
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(ManageNewsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
