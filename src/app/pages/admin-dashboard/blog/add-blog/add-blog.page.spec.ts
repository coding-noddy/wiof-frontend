import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AddBlogPage } from './add-blog.page';

describe('AddBlogPage', () => {
  let component: AddBlogPage;
  let fixture: ComponentFixture<AddBlogPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AddBlogPage],
      imports: [NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(AddBlogPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
