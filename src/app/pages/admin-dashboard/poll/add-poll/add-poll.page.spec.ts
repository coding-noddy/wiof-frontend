import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { AddPollPage } from './add-poll.page';

describe('AddPollPage', () => {
  let component: AddPollPage;
  let fixture: ComponentFixture<AddPollPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AddPollPage],
      imports: [BrowserAnimationsModule, MatButtonModule, MatFormFieldModule, MatInputModule]
    }).compileComponents();

    fixture = TestBed.createComponent(AddPollPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
