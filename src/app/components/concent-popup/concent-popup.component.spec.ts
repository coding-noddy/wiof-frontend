import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ConcentPopupComponent } from './concent-popup.component';

describe('ConcentPopupComponent', () => {
  let component: ConcentPopupComponent;
  let fixture: ComponentFixture<ConcentPopupComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ConcentPopupComponent],
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(ConcentPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
