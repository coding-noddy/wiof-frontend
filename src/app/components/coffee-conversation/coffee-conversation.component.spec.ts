import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CoffeeConversationComponent } from './coffee-conversation.component';

describe('CoffeeConversationComponent', () => {
  let component: CoffeeConversationComponent;
  let fixture: ComponentFixture<CoffeeConversationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CoffeeConversationComponent],
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(CoffeeConversationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
