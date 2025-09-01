import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ManageCoffeeConversationPage } from './manage-coffee-conversation.page';

describe('ManageCoffeeConversationPage', () => {
  let component: ManageCoffeeConversationPage;
  let fixture: ComponentFixture<ManageCoffeeConversationPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ManageCoffeeConversationPage],
      imports: [NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ManageCoffeeConversationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
