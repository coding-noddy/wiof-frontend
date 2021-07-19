import { Component, Input, OnInit } from '@angular/core';
import { CourseInFocus } from 'src/app/models/courseInFocus';

@Component({
  selector: 'app-course-in-focus',
  templateUrl: './course-in-focus.component.html',
  styleUrls: ['./course-in-focus.component.scss']
})
export class CourseInFocusComponent implements OnInit {
  @Input() courseInFocus: CourseInFocus;

  constructor() {}

  ngOnInit() {}
}
