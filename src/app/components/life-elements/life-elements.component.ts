import { Component, Input, OnInit } from "@angular/core";

@Component({
  selector: "app-life-elements",
  templateUrl: "./life-elements.component.html",
  styleUrls: ["./life-elements.component.scss"]
})
export class LifeElementsComponent implements OnInit {
  @Input("element") selectedElement: String;
  constructor() {}

  ngOnInit() {}

  isSelectedElement(element: String) {
    return this.selectedElement === element;
  }
}