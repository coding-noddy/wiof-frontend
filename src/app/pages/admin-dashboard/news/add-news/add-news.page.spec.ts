import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AddNewsPage } from './add-news.page';

describe('AddNewsPage', () => {
  let component: AddNewsPage;
  let fixture: ComponentFixture<AddNewsPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AddNewsPage],
      imports: [NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(AddNewsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
