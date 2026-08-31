import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { EnergyPage } from './energy.page';

describe('EnergyPage', () => {
  let component: EnergyPage;
  let fixture: ComponentFixture<EnergyPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [EnergyPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(EnergyPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
