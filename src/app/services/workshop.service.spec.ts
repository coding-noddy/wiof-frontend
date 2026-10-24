import { TestBed } from '@angular/core/testing';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { firstValueFrom, of } from 'rxjs';
import { WorkshopService } from './workshop.service';
import { AdminWriteGuardService } from './admin-write-guard.service';

const doc = (id: string, data: any) => ({ id, data: () => ({ ...data }) });

describe('WorkshopService', () => {
  let service: WorkshopService;
  let docs: any[];
  let queryFilters: any[];

  beforeEach(() => {
    docs = [];
    queryFilters = [];
    const firestore = {
      collection: (_name: string, queryFn?: (ref: any) => any) => {
        if (queryFn) {
          queryFn({ where: (...args: any[]) => queryFilters.push(args) });
        }
        return { get: () => of({ docs }) };
      }
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AngularFirestore, useValue: firestore },
        { provide: AngularFireStorage, useValue: {} },
        { provide: AngularFireAuth, useValue: {} },
        { provide: AdminWriteGuardService, useValue: {} }
      ]
    });
    service = TestBed.inject(WorkshopService);
  });

  describe('getUpcomingWorkshops', () => {
    const now = new Date(2026, 10, 15, 18, 0); // 15 Nov 2026, evening, local time

    it('asks Firestore for published workshops only (the rules require that filter)', async () => {
      await firstValueFrom(service.getUpcomingWorkshops(now));
      expect(queryFilters).toEqual([['published', '==', true]]);
    });

    it('keeps today and future workshops, drops past ones, soonest first', async () => {
      docs = [
        doc('later', { title: 'Later', eventDate: '2026-12-01' }),
        doc('past', { title: 'Past', eventDate: '2026-11-14' }),
        doc('today', { title: 'Today', eventDate: '2026-11-15' }),
        doc('soon', { title: 'Soon', eventDate: '2026-11-20' })
      ];

      const workshops = await firstValueFrom(service.getUpcomingWorkshops(now));

      expect(workshops.map((w) => w.id)).toEqual(['today', 'soon', 'later']);
    });
  });

  it('getAllWorkshops lists every workshop, newest date first', async () => {
    docs = [
      doc('a', { eventDate: '2026-01-10' }),
      doc('b', { eventDate: '2026-12-10' }),
      doc('c', { eventDate: '2026-06-10' })
    ];

    const workshops = await firstValueFrom(service.getAllWorkshops());

    expect(workshops.map((w) => w.id)).toEqual(['b', 'c', 'a']);
  });

  it('isGoogleFormUrl accepts Google Form links only', () => {
    expect(WorkshopService.isGoogleFormUrl('https://forms.gle/abc123')).toBeTrue();
    expect(WorkshopService.isGoogleFormUrl('https://docs.google.com/forms/d/e/1FAIpQLSf/viewform')).toBeTrue();
    expect(WorkshopService.isGoogleFormUrl('  https://forms.gle/abc123  ')).toBeTrue();
    expect(WorkshopService.isGoogleFormUrl('http://forms.gle/abc123')).toBeFalse();
    expect(WorkshopService.isGoogleFormUrl('https://example.com/forms/x')).toBeFalse();
    expect(WorkshopService.isGoogleFormUrl('https://docs.google.com/document/d/x')).toBeFalse();
    expect(WorkshopService.isGoogleFormUrl('')).toBeFalse();
  });

  it('today() and eventDateAsDate() use local dates, not UTC', () => {
    expect(WorkshopService.today(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    const date = WorkshopService.eventDateAsDate('2026-03-09');
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 2, 9]);
  });
});
