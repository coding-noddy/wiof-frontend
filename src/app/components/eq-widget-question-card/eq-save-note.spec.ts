import { eqSaveNote } from './eq-widget-question-card.component';

describe('EQ save note (two checks a day are saved)', () => {
  it('says nothing for a guest, a failed call, or a save with more left today', () => {
    expect(eqSaveNote(null)).toBeNull();
    expect(eqSaveNote({ saved: true, remainingToday: 1, dailyLimit: 2 })).toBeNull();
  });

  it('says when that was the last save for today', () => {
    expect(eqSaveNote({ saved: true, remainingToday: 0, dailyLimit: 2 })).toContain('you can save another tomorrow');
  });

  it('says when a check was not saved, and that the result still stands', () => {
    const note = eqSaveNote({ saved: false, remainingToday: 0, dailyLimit: 2 })!;
    expect(note).toContain("already saved 2 EQ checks today");
    expect(note).toContain('Come back tomorrow');
  });
});
