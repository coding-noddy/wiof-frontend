import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-element-welcome-image',
  templateUrl: './element-welcome-image.component.html',
  styleUrls: ['./element-welcome-image.component.scss'],
  standalone: false
})
export class ElementWelcomeImageComponent implements OnInit {
  @Input() welcomeImageClass: string;
  constructor() {}

  ngOnInit() {}
}
