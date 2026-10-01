import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ManageTakeActionPage } from './manage-take-action.page';

describe('ManageTakeActionPage', () => {
  let component: ManageTakeActionPage;
  let fixture: ComponentFixture<ManageTakeActionPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ManageTakeActionPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ManageTakeActionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
