import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { OurPurposePage } from './our-purpose.page';

describe('OurPurposePage', () => {
  let component: OurPurposePage;
  let fixture: ComponentFixture<OurPurposePage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [OurPurposePage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(OurPurposePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
