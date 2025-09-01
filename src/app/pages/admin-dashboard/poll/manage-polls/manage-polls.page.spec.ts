import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import { ManagePollsPage } from './manage-polls.page';

describe('ManagePollsPage', () => {
  let component: ManagePollsPage;
  let fixture: ComponentFixture<ManagePollsPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ManagePollsPage],
      imports: [NoopAnimationsModule, MatButtonModule, MatCardModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ManagePollsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
