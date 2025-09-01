import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import { SubscribersPage } from './subscribers.page';

describe('SubscribersPage', () => {
  let component: SubscribersPage;
  let fixture: ComponentFixture<SubscribersPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [SubscribersPage],
      imports: [MatToolbarModule, MatButtonModule, MatCardModule]
    }).compileComponents();

    fixture = TestBed.createComponent(SubscribersPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
