import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { VideoPostPage } from './video-post.page';

describe('VideoPostPage', () => {
  let component: VideoPostPage;
  let fixture: ComponentFixture<VideoPostPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [VideoPostPage],
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(VideoPostPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
