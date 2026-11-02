import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { ElementWelcomeImageComponent } from './element-welcome-image.component';

describe('ElementWelcomeImageComponent', () => {
  let component: ElementWelcomeImageComponent;
  let fixture: ComponentFixture<ElementWelcomeImageComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ElementWelcomeImageComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ElementWelcomeImageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
