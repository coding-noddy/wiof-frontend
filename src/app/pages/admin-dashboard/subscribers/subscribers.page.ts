import { Component, OnInit } from '@angular/core';
import { ExcelGeneratorService } from '../../../services/excel-generator.service';
import { SubscriptionService } from '../../../services/subscription.service';
import { Subscriber } from '../../../models/Subscriber';

@Component({
  selector: 'app-subscribers',
  templateUrl: './subscribers.page.html',
  styleUrls: ['./subscribers.page.scss']
})
export class SubscribersPage implements OnInit {
  subscribersJson: Subscriber[] = [];
  sortColumn = 'firstName';
  sortDirection: 'asc' | 'desc' = 'asc';
  summary = { total: 0 };

  constructor(
    private _excelGenerator: ExcelGeneratorService,
    private _subscriptionService: SubscriptionService
  ) {}

  ngOnInit() {
    this.getSubscribers();
  }

  generateExcel() {
    this._excelGenerator.exportAsExcelFile(this.subscribersJson, 'wiof_subscribers');
  }

  getSubscribers() {
    this._subscriptionService.getSubscribers().subscribe((data) => {
      const uniqueEmails = [];
      const subscribers = data.filter((s) => {
        if (!uniqueEmails.includes(s.email)) {
          uniqueEmails.push(s.email);
          return s;
        }
      });
      this.subscribersJson = this.sortData(subscribers);
      this.summary.total = this.subscribersJson.length;
    });
  }

  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.subscribersJson = this.sortData(this.subscribersJson);
  }

  private sortData(list: Subscriber[]): Subscriber[] {
    return [...list].sort((a, b) => {
      let valA: any = a[this.sortColumn] || '';
      let valB: any = b[this.sortColumn] || '';

      // Special handling for datetime strings (format: "d/m/yyyy h:mm")
      if (this.sortColumn === 'datetime') {
        valA = this.parseDateString(valA);
        valB = this.parseDateString(valB);
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB as string).toLowerCase();
      }

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  private parseDateString(dateStr: string): number {
    if (!dateStr) return 0;
    // Format: "d/m/yyyy h:mm"
    const parts = dateStr.split(' ');
    const dateParts = (parts[0] || '').split('/');
    const timeParts = (parts[1] || '0:0').split(':');
    if (dateParts.length < 3) return 0;
    const d = new Date(+dateParts[2], +dateParts[1], +dateParts[0], +timeParts[0], +timeParts[1]);
    return d.getTime() || 0;
  }
}
