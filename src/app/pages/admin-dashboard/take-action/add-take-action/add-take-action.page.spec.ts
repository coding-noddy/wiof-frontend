import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { AddTakeActionPage } from './add-take-action.page';

describe('AddTakeActionPage', () => {
  let component: AddTakeActionPage;
  let fixture: ComponentFixture<AddTakeActionPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AddTakeActionPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(AddTakeActionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
