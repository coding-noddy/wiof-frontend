import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { DiscoverMorePage } from './discover-more.page';

describe('DiscoverMorePage', () => {
  let component: DiscoverMorePage;
  let fixture: ComponentFixture<DiscoverMorePage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DiscoverMorePage],
      imports: [BrowserAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(DiscoverMorePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
