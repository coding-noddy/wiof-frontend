import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SocialShareHomeComponent } from './social-share-home.component';

describe('SocialShareHomeComponent', () => {
  let component: SocialShareHomeComponent;
  let fixture: ComponentFixture<SocialShareHomeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [SocialShareHomeComponent],
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(SocialShareHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
