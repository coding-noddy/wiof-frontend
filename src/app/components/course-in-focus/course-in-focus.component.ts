import { Component, Input, OnInit } from '@angular/core';
import { CourseInFocus } from 'src/app/models/CourseInFocus';
import { COFFEE_CONV_SLIDER_OPTIONS } from 'src/app/app.constants';

@Component({
  selector: 'app-course-in-focus',
  templateUrl: './course-in-focus.component.html',
  styleUrls: ['./course-in-focus.component.scss']
})
export class CourseInFocusComponent implements OnInit {
  @Input() coursesInFocus: CourseInFocus[];
  slideOpts = COFFEE_CONV_SLIDER_OPTIONS;

  constructor() {}

  ngOnInit() {}
}
