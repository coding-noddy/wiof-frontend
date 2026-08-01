import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';

// Imported from package.json at build time via angular.json
declare const require: any;

@Component({
  selector: 'app-wiof-footer',
  templateUrl: './wiof-footer.component.html',
  styleUrls: ['./wiof-footer.component.scss']
})
export class WiofFooterComponent implements OnInit {
  currentYear = new Date().getFullYear();
  appVersion = '1.0.11';
  envLabel = environment.production ? 'prod' : 'staging';

  constructor() {}

  ngOnInit() {}
}

