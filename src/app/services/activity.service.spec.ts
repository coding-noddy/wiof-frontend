import { TestBed } from '@angular/core/testing';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivityService, toCalendarDay } from './activity.service';
import { RateLimiterService } from './rate-limiter.service';

describe('ActivityService', () => {
  let service: ActivityService;
  let firestoreMock: jasmine.SpyObj<any>;
  let rateLimiterMock: jasmine.SpyObj<RateLimiterService>;
  let addSpy: jasmine.Spy;

  beforeEach(() => {
    addSpy = jasmine.createSpy('add').and.returnValue(Promise.resolve({ id: 'doc123' }));

    firestoreMock = {
      collection: jasmine.createSpy('collection').and.returnValue({
        add: addSpy,
        get: jasmine.createSpy('get').and.returnValue({ toPromise: () => Promise.resolve({ docs: [] }) }),
        snapshotChanges: jasmine.createSpy('snapshotChanges')
      })
    };

    rateLimiterMock = jasmine.createSpyObj('RateLimiterService', ['canWrite', 'scheduleRetry']);
    rateLimiterMock.canWrite.and.returnValue(true);

    TestBed.configureTestingModule({
      providers: [
        ActivityService,
        { provide: AngularFirestore, useValue: firestoreMock },
        { provide: RateLimiterService, useValue: rateLimiterMock }
      ]
    });

    service = TestBed.inject(ActivityService);
  });

  describe('logEqCompletion', () => {
    const userId = 'user123';
    const overallScore = 75;
    const dimensions = { attentionScore: 80, clarityScore: 70, reparationScore: 75 };

    it('should create an activity log entry with activityType eq_completion', async () => {
      await service.logEqCompletion(userId, overallScore, dimensions);

      expect(addSpy).toHaveBeenCalledTimes(1);
      const entry = addSpy.calls.first().args[0];
      expect(entry.activityType).toBe('eq_completion');
    });

    it('should include userId in the entry', async () => {
      await service.logEqCompletion(userId, overallScore, dimensions);

      const entry = addSpy.calls.first().args[0];
      expect(entry.userId).toBe(userId);
    });

    it('should include the overall score', async () => {
      await service.logEqCompletion(userId, overallScore, dimensions);

      const entry = addSpy.calls.first().args[0];
      expect(entry.score).toBe(75);
    });

    it('should include all EQ dimension scores', async () => {
      await service.logEqCompletion(userId, overallScore, dimensions);

      const entry = addSpy.calls.first().args[0];
      expect(entry.eqDimensions).toEqual({
        attentionScore: 80,
        clarityScore: 70,
        reparationScore: 75
      });
    });

    it('should include a timestamp', async () => {
      await service.logEqCompletion(userId, overallScore, dimensions);

      const entry = addSpy.calls.first().args[0];
      expect(entry.timestamp).toBeInstanceOf(Date);
    });

    it('should include calendarDay in YYYY-MM-DD format', async () => {
      await service.logEqCompletion(userId, overallScore, dimensions);

      const entry = addSpy.calls.first().args[0];
      expect(entry.calendarDay).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.calendarDay).toBe(toCalendarDay(new Date()));
    });

    it('should use RateLimiterService with key activity_log_{userId}', async () => {
      await service.logEqCompletion(userId, overallScore, dimensions);

      expect(rateLimiterMock.canWrite).toHaveBeenCalledWith('activity_log_user123');
    });

    it('should write to Firestore when rate limiter allows', async () => {
      rateLimiterMock.canWrite.and.returnValue(true);

      await service.logEqCompletion(userId, overallScore, dimensions);

      expect(addSpy).toHaveBeenCalledTimes(1);
    });

    it('should schedule retry when rate limiter rejects', async () => {
      rateLimiterMock.canWrite.and.returnValue(false);

      await service.logEqCompletion(userId, overallScore, dimensions);

      expect(addSpy).not.toHaveBeenCalled();
      expect(rateLimiterMock.scheduleRetry).toHaveBeenCalledWith(
        'activity_log_user123',
        jasmine.any(Function)
      );
    });

    it('should not deduplicate — multiple calls create multiple entries', async () => {
      await service.logEqCompletion(userId, overallScore, dimensions);
      await service.logEqCompletion(userId, overallScore, dimensions);

      expect(addSpy).toHaveBeenCalledTimes(2);
    });

    it('should silently handle Firestore write failures', async () => {
      addSpy.and.returnValue(Promise.reject(new Error('Network error')));
      spyOn(console, 'warn');

      await expectAsync(
        service.logEqCompletion(userId, overallScore, dimensions)
      ).toBeResolved();

      expect(console.warn).toHaveBeenCalled();
    });
  });
});
