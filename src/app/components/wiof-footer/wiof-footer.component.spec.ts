import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { WiofFooterComponent } from './wiof-footer.component';

describe('WiofFooterComponent', () => {
  let component: WiofFooterComponent;
  let fixture: ComponentFixture<WiofFooterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [WiofFooterComponent],
      imports: [IonicModule.forRoot(), RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(WiofFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
