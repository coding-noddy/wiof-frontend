import { ComponentFixture, TestBed, async } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { ElementPage } from './element.page';

describe('ElementPage', () => {
  let component: ElementPage;
  let fixture: ComponentFixture<ElementPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ElementPage],
      imports: [IonicModule.forRoot()],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'air' } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ElementPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
