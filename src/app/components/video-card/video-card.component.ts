import { Component, OnInit, Input } from '@angular/core';
import { Video } from 'src/app/models/Video';

@Component({
    selector: 'app-video-card',
    templateUrl: './video-card.component.html',
    styleUrls: ['./video-card.component.scss'],
    standalone: false
})
export class VideoCardComponent implements OnInit {
  @Input() video: Video;
  @Input() element: string;
  /**
   * Heading level of the title for screen readers, when the card sits under
   * a heading deeper than the page's own (e.g. 4 inside Explore next's groups).
   */
  @Input() headingLevel: number | null = null;

  constructor() {}

  ngOnInit() {}
}
