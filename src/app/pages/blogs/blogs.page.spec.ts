import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BlogsPage } from './blogs.page';

describe('BlogsPage', () => {
  let component: BlogsPage;
  let fixture: ComponentFixture<BlogsPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BlogsPage],
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(BlogsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
