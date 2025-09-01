import { Component, OnInit, Input } from '@angular/core';
import { Blog } from 'src/app/models/Blog';

@Component({
  selector: 'app-blog-card',
  templateUrl: './blog-card.component.html',
  styleUrls: ['./blog-card.component.scss'],
  standalone: false
})
export class BlogCardComponent implements OnInit {
  @Input() blog: Blog;
  @Input() element: string;

  constructor() {}

  ngOnInit() {}
}
