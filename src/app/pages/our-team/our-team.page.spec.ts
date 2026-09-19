import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { OurTeamPage } from './our-team.page';

describe('OurTeamPage', () => {
  let component: OurTeamPage;
  let fixture: ComponentFixture<OurTeamPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [OurTeamPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(OurTeamPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
