import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { BlogPostPage } from './blog-post.page';

describe('BlogPostPage', () => {
  let component: BlogPostPage;
  let fixture: ComponentFixture<BlogPostPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BlogPostPage],
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(BlogPostPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
