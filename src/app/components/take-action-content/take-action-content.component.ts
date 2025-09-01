import { Component, OnInit, Input } from '@angular/core';
import { TakeAction } from './take-action';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-take-action-content',
  templateUrl: './take-action-content.component.html',
  styleUrls: ['./take-action-content.component.scss'],
  standalone: false
})
export class TakeActionContentComponent implements OnInit {
  @Input() actionData: TakeAction;
  @Input() selectedElement: string;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit() {
    this.actionData.links.forEach((action) => {
      action.linkSafe = this.sanitizer.bypassSecurityTrustResourceUrl(
        action.link
      );
    });
  }
}
