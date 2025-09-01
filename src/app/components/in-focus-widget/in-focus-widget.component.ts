import { Component, OnInit, Input } from '@angular/core';
import { InFocus } from 'src/app/models/InFocus';
import { AppUtilService } from 'src/app/util/AppUtilService';
import {
  IN_FOCUS_TITLE,
  COFFEE_CONV_SLIDER_OPTIONS
} from 'src/app/app.constants';

@Component({
  selector: 'app-in-focus-widget',
  templateUrl: './in-focus-widget.component.html',
  styleUrls: ['./in-focus-widget.component.scss'],
  standalone: false
})
export class InFocusWidgetComponent implements OnInit {
  @Input() element: string;
  @Input() inFocuses: InFocus[];
  @Input() inFocusTitle: string;
  slideOpts = COFFEE_CONV_SLIDER_OPTIONS;

  inFocusClass: string;

  constructor(private appUtilService: AppUtilService) {}

  ngOnInit() {
    this.appUtilService.stopVideos();
    this.inFocusClass = `wiof-${this.element}`;
    this.inFocusTitle = IN_FOCUS_TITLE[this.element];
  }

  //TODO setting dynamic title - Pending fron Naved
  setTitle(inFocusTitle: string) {
    this.inFocusTitle = inFocusTitle;
  }
}
