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

  constructor() {}

  ngOnInit() {}
}
