import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NgoPage } from './ngo.page';

describe('NgoPage', () => {
  let component: NgoPage;
  let fixture: ComponentFixture<NgoPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [NgoPage],
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(NgoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
