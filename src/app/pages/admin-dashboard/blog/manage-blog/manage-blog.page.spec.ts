import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ManageBlogPage } from './manage-blog.page';

describe('ManageBlogPage', () => {
  let component: ManageBlogPage;
  let fixture: ComponentFixture<ManageBlogPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ManageBlogPage],
      imports: [NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ManageBlogPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
