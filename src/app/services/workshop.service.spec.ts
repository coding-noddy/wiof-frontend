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

  describe('getPublishedWorkshops', () => {
    // 31 Oct 2026, 6:00 PM IST (12:30 UTC)
    const now = new Date('2026-10-31T18:00:00+05:30');

    it('asks Firestore for published workshops only (the rules require that filter)', async () => {
      await firstValueFrom(service.getPublishedWorkshops(now));
      expect(queryFilters).toEqual([['published', '==', true]]);
    });

    it('splits by end time: upcoming soonest first, past most recent first', async () => {
      docs = [
        doc('later', { eventDate: '2026-12-01' }),
        doc('endedToday', { eventDate: '2026-10-31', startTime: '15:00', endTime: '17:00' }),
        doc('liveNow', { eventDate: '2026-10-31', startTime: '17:00', endTime: '19:00' }),
        doc('noEndToday', { eventDate: '2026-10-31', startTime: '10:00' }),
        doc('lastWeek', { eventDate: '2026-10-20', startTime: '17:00' }),
        doc('soon', { eventDate: '2026-11-05' })
      ];

      const { upcoming, past } = await firstValueFrom(service.getPublishedWorkshops(now));

      expect(upcoming.map((w) => w.id)).toEqual(['noEndToday', 'liveNow', 'soon', 'later']);
      expect(past.map((w) => w.id)).toEqual(['endedToday', 'lastWeek']);
    });

    it('keeps only the most recent past workshops', async () => {
      docs = ['01', '02', '03', '04', '05', '06', '07', '08'].map((d) => doc(d, { eventDate: `2026-09-${d}` }));

      const { past } = await firstValueFrom(service.getPublishedWorkshops(now, 6));

      expect(past.map((w) => w.id)).toEqual(['08', '07', '06', '05', '04', '03']);
    });
  });

  describe('time rules (IST)', () => {
    const w = (extra: any) => ({ eventDate: '2026-10-31', ...extra } as any);

    it('ends at the end time, or at the end of the day without one, in IST', () => {
      expect(WorkshopService.endsAt(w({ endTime: '19:00' })).toISOString()).toBe('2026-10-31T13:30:00.000Z');
      expect(WorkshopService.endsAt(w({})).toISOString()).toBe('2026-10-31T18:29:59.000Z');
    });

    it('isLiveNow is true only between start and end', () => {
      const ws = w({ startTime: '17:00', endTime: '19:00' });
      expect(WorkshopService.isLiveNow(ws, new Date('2026-10-31T16:59:00+05:30'))).toBeFalse();
      expect(WorkshopService.isLiveNow(ws, new Date('2026-10-31T17:00:00+05:30'))).toBeTrue();
      expect(WorkshopService.isLiveNow(ws, new Date('2026-10-31T19:00:00+05:30'))).toBeFalse();
      expect(WorkshopService.isLiveNow(w({ endTime: '19:00' }), new Date('2026-10-31T18:00:00+05:30'))).toBeFalse();
    });

    it('timeLabel formats 12-hour IST times', () => {
      expect(WorkshopService.timeLabel(w({ startTime: '17:00', endTime: '19:30' }))).toBe('5:00 PM – 7:30 PM IST');
      expect(WorkshopService.timeLabel(w({ startTime: '09:05' }))).toBe('9:05 AM IST');
      expect(WorkshopService.timeLabel(w({ startTime: '12:00', endTime: '00:30' }))).toBe('12:00 PM – 12:30 AM IST');
      expect(WorkshopService.timeLabel(w({ endTime: '19:00' }))).toBe('Until 7:00 PM IST');
      expect(WorkshopService.timeLabel(w({}))).toBe('');
    });

    it('isValidTime accepts empty or HH:MM only', () => {
      expect(WorkshopService.isValidTime('')).toBeTrue();
      expect(WorkshopService.isValidTime('17:00')).toBeTrue();
      expect(WorkshopService.isValidTime('24:00')).toBeFalse();
      expect(WorkshopService.isValidTime('5pm')).toBeFalse();
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

  it('eventDateAsDate() is a local date, not UTC', () => {
    const date = WorkshopService.eventDateAsDate('2026-03-09');
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 2, 9]);
  });
});
