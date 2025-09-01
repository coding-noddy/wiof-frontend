import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { ElementWelcomeImageComponent } from './element-welcome-image.component';

describe('ElementWelcomeImageComponent', () => {
  let component: ElementWelcomeImageComponent;
  let fixture: ComponentFixture<ElementWelcomeImageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ElementWelcomeImageComponent],
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(ElementWelcomeImageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
