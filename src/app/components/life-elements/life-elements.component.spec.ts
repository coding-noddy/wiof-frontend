import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { LifeElementsComponent } from './life-elements.component';

describe('LifeElementsComponent', () => {
  let component: LifeElementsComponent;
  let fixture: ComponentFixture<LifeElementsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [LifeElementsComponent],
      imports: [RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(LifeElementsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
