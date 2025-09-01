import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-life-elements',
  templateUrl: './life-elements.component.html',
  styleUrls: ['./life-elements.component.scss'],
  standalone: false
})
export class LifeElementsComponent implements OnInit {
  @Input('element') selectedElement: string;
  constructor() {}

  ngOnInit() {}

  isSelectedElement(element: string) {
    return this.selectedElement === element;
  }
}
