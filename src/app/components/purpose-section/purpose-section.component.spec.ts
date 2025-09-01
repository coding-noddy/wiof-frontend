import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { PurposeSectionComponent } from './purpose-section.component';


describe('PurposeSectionComponent', () => {
  let component: PurposeSectionComponent;
  let fixture: ComponentFixture<PurposeSectionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [PurposeSectionComponent],
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(PurposeSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
