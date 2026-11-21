import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { earnedWhen, previewStamp, RULE_OPTIONS, RuleOption, Stamp, StampDef, StampFamily, StampShape } from 'src/app/models/Passport';
import { ActionChoice, PassportAdminService, StampAction, StampAuditEntry } from 'src/app/services/passport-admin.service';
import { UiUtilService } from 'src/app/util/UiUtilService';

const ELEMENTS = [
  { slug: 'air', name: 'Air' }, { slug: 'energy', name: 'Energy' }, { slug: 'water', name: 'Water' },
  { slug: 'earth', name: 'Earth' }, { slug: 'spirit', name: 'Spirit' }
];
const MILESTONE_SHAPE: Record<number, StampShape> = { 3: 'triangle', 4: 'square', 5: 'pentagon', 6: 'hexagon' };
const FAMILY_SHAPES: Record<StampFamily, StampShape[]> = {
  milestone: ['circle', 'triangle', 'square', 'pentagon', 'hexagon'],
  travel: ['oval', 'rect'],
  streak: ['rosette'],
  challenge: ['oval', 'rect', 'circle']
};
const INK: Record<string, string> = { air: '#3E7CA6', energy: '#B06A12', water: '#1A7A7F', earth: '#6B5A2E', spirit: '#7A4E7E', journey: '#145C5F' };

/** The badge form, flat for the template. */
interface BadgeForm {
  id: string;
  family: StampFamily;
  name: string;
  title1: string;
  title2: string;
  caption: string;
  meaning: string;
  hint: string;
  unit: string;
  element: string;
  ink: string;
  shape: StampShape;
  ruleType: string;
  target: number;
  ruleElement: string;
  actionId: string;
  windowStart: string;
  windowEnd: string;
  calendarId: string;
}

interface MapGroup {
  key: string;
  label: string;
  defs: StampDef[];
}

const IST_OFFSET = 5.5 * 60 * 60 * 1000;
const istToday = () => new Date(Date.now() + IST_OFFSET).toISOString().slice(0, 10);
const slug = (t: string) => t.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

/**
 * Admin → Passport (docs/PLANET_PASSPORT_ADMIN_PROPOSAL.md): the badge map
 * (every badge, "Earned when" in plain words, status, version, how many
 * have it), the badge form with a live preview and "would earn it now",
 * and the change history. Every change goes through savePassportStamp.
 */
@Component({
  selector: 'app-passport-admin',
  templateUrl: './passport-admin.page.html',
  styleUrls: ['./passport-admin.page.scss'],
  standalone: false
})
export class PassportAdminPage implements OnInit {
  readonly elements = ELEMENTS;
  readonly families: { key: StampFamily; label: string }[] = [
    { key: 'milestone', label: 'Milestone' }, { key: 'travel', label: 'Travel' }, { key: 'streak', label: 'Streak' }, { key: 'challenge', label: 'Challenge' }
  ];

  loading = true;
  loadError = false;
  defs: StampDef[] = [];
  earned: Record<string, number> = {};
  audit: StampAuditEntry[] = [];
  actions: ActionChoice[] = [];

  filterFamily: 'all' | StampFamily = 'all';
  filterStatus: 'all' | 'draft' | 'active' | 'scheduled' | 'retired' = 'all';
  filterElement = 'all';

  /** The badge being added or edited; null when the form is closed. */
  form: BadgeForm | null = null;
  existing: StampDef | null = null;
  idTouched = false;
  hintTouched = false;
  busy = false;
  wouldEarn: number | null = null;
  checking = false;

  constructor(private admin: PassportAdminService, private uiUtil: UiUtilService, private alerts: AlertController) {}

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.loadError = false;
    try {
      const [defs, audit, actions] = await Promise.all([this.admin.allDefinitions(), this.admin.recentChanges(), this.admin.actions()]);
      this.defs = defs;
      this.audit = audit;
      this.actions = actions;
      this.admin.stats().then((s) => (this.earned = s.earned || {})).catch(() => undefined);
    } catch {
      this.loadError = true;
    } finally {
      this.loading = false;
    }
  }

  // ---- The badge map ----

  status(def: StampDef): 'draft' | 'active' | 'scheduled' | 'retired' | 'closed' {
    if (def.status !== 'active') return def.status;
    if (def.family === 'challenge' && def.window) {
      const today = istToday();
      if (today < def.window.start) return 'scheduled';
      if (today > def.window.end) return 'closed';
    }
    return 'active';
  }

  get groups(): MapGroup[] {
    const shown = this.defs.filter((d) =>
      (this.filterFamily === 'all' || d.family === this.filterFamily)
      && (this.filterStatus === 'all' || this.status(d) === this.filterStatus || (this.filterStatus === 'active' && this.status(d) === 'closed'))
      && (this.filterElement === 'all' || (this.filterElement === 'none' ? !d.element : d.element === this.filterElement)));
    const milestone = (shape: StampShape, label: string): MapGroup => ({ key: `m-${shape}`, label, defs: shown.filter((d) => d.family === 'milestone' && d.shape === shape) });
    return [
      milestone('circle', '● Milestones: Welcome'),
      milestone('triangle', '▲ Milestones: 3'),
      milestone('square', '■ Milestones: 4'),
      milestone('pentagon', '⬟ Milestones: 5'),
      milestone('hexagon', '⬢ Milestones: 6'),
      { key: 'travel', label: 'Travel stamps', defs: shown.filter((d) => d.family === 'travel') },
      { key: 'streak', label: 'Streak stamps', defs: shown.filter((d) => d.family === 'streak') },
      { key: 'challenge', label: 'Challenges', defs: shown.filter((d) => d.family === 'challenge') }
    ].filter((g) => g.defs.length);
  }

  earnedWhen(def: StampDef): string {
    return earnedWhen(def, this.actionTitle(def.rule?.actionId));
  }

  actionTitle(id?: string): string | undefined {
    return id ? this.actions.find((a) => a.id === id)?.title : undefined;
  }

  tile(def: StampDef): Stamp {
    return previewStamp(def, this.status(def) !== 'draft' && this.status(def) !== 'retired');
  }

  // ---- The form ----

  startNew(family: StampFamily): void {
    this.existing = null;
    this.idTouched = false;
    this.hintTouched = false;
    this.wouldEarn = null;
    const rule = RULE_OPTIONS.find((r) => r.families.includes(family))!;
    const today = istToday();
    this.form = {
      id: '', family, name: '', title1: '', title2: '', caption: family === 'challenge' ? 'CHALLENGE' : family.toUpperCase(),
      meaning: '', hint: '', unit: rule.unit, element: '', ink: INK['journey'], shape: FAMILY_SHAPES[family][0],
      ruleType: rule.type, target: family === 'milestone' ? 3 : 1, ruleElement: '', actionId: '',
      windowStart: family === 'challenge' ? today : '', windowEnd: family === 'challenge' ? today : '', calendarId: ''
    };
    this.syncShape();
    this.scrollToForm();
  }

  edit(def: StampDef): void {
    this.existing = def;
    this.idTouched = true;
    this.hintTouched = true;
    this.wouldEarn = null;
    this.form = {
      id: def.id, family: def.family, name: def.name || def.title.join(' '), title1: def.title[0] || '', title2: def.title[1] || '',
      caption: def.caption, meaning: def.meaning, hint: def.hint, unit: def.unit, element: def.element || '', ink: def.ink,
      shape: def.shape, ruleType: def.rule.type, target: def.rule.target, ruleElement: def.rule.element || '',
      actionId: def.rule.actionId || '', windowStart: def.window?.start || '', windowEnd: def.window?.end || '', calendarId: def.calendarId || ''
    };
    this.scrollToForm();
  }

  cancel(): void {
    this.form = null;
    this.existing = null;
  }

  private scrollToForm(): void {
    setTimeout(() => document.getElementById('badge-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  get published(): boolean {
    return !!this.existing && this.existing.status !== 'draft';
  }

  get ruleOptions(): RuleOption[] {
    return this.form ? RULE_OPTIONS.filter((r) => r.families.includes(this.form!.family)) : [];
  }

  get rule(): RuleOption | undefined {
    return this.form ? RULE_OPTIONS.find((r) => r.type === this.form!.ruleType) : undefined;
  }

  get shapes(): StampShape[] {
    return this.form ? FAMILY_SHAPES[this.form.family] : [];
  }

  /** Milestones: the shape follows the target (3 ▲ … 6 ⬢; Earthrise-like first steps ●). */
  syncShape(): void {
    const f = this.form;
    if (!f) return;
    const r = this.rule;
    if (r && r.element === 'none') f.ruleElement = '';
    if (r && !r.action) f.actionId = '';
    if (r && r.maxTarget && f.target > r.maxTarget) f.target = r.maxTarget;
    if (r && !this.hintTouched) f.unit = r.unit;
    if (f.family === 'milestone') f.shape = f.ruleType === 'first_steps' ? 'circle' : MILESTONE_SHAPE[f.target] || f.shape;
    if (!this.idTouched && !this.existing) f.id = slug(f.name);
    if (!this.hintTouched) f.hint = this.earnedWhenNow;
    if (r && r.element === 'required' && f.ruleElement) f.element = f.ruleElement;
    if (!this.existing) f.ink = INK[f.element || 'journey'];
    this.wouldEarn = null;
  }

  /** Why a milestone's target can't be saved, or ''. */
  get targetProblem(): string {
    const f = this.form;
    if (!f) return '';
    if (!Number.isInteger(f.target) || f.target < 1) return 'The target is a whole number from 1.';
    if (this.rule?.maxTarget && f.target > this.rule.maxTarget) return `This rule can't go above ${this.rule.maxTarget}.`;
    if (f.family === 'milestone' && f.ruleType !== 'first_steps' && !MILESTONE_SHAPE[f.target]) return 'A milestone counts 3, 4, 5 or 6: its shape has that many corners.';
    return '';
  }

  toDef(): Partial<StampDef> & { rule: StampDef['rule'] } {
    const f = this.form!;
    const rule: StampDef['rule'] = { type: f.ruleType, target: Number(f.target) };
    if (f.ruleElement) rule.element = f.ruleElement;
    if (f.actionId) rule.actionId = f.actionId;
    const def: Partial<StampDef> & { rule: StampDef['rule'] } = {
      id: f.id, family: f.family, name: f.name, title: [f.title1, f.title2].map((t) => t.trim()).filter(Boolean),
      caption: f.caption, meaning: f.meaning, hint: f.hint, unit: f.unit, element: (f.element || null) as any, ink: f.ink, shape: f.shape, rule
    };
    if (f.family === 'challenge') {
      def.window = { start: f.windowStart, end: f.windowEnd };
      if (f.calendarId) def.calendarId = f.calendarId;
    }
    return def;
  }

  get earnedWhenNow(): string {
    return this.form ? earnedWhen(this.toDef(), this.actionTitle(this.form.actionId)) : '';
  }

  get previewEarned(): Stamp {
    return previewStamp(this.toDef(), true);
  }

  get previewWaiting(): Stamp {
    return previewStamp(this.toDef(), false);
  }

  get canSave(): boolean {
    const f = this.form;
    if (!f || this.busy) return false;
    const r = this.rule;
    return !!(f.id && f.name.trim() && f.title1.trim() && f.meaning.trim() && f.hint.trim() && !this.targetProblem
      && (!r || r.element !== 'required' || f.ruleElement)
      && (!r || !r.action || f.actionId)
      && (f.family !== 'challenge' || (f.windowStart && f.windowEnd && f.windowStart <= f.windowEnd)));
  }

  /** Will changing this published badge give it a new version? */
  get willBumpVersion(): boolean {
    const e = this.existing;
    if (!e || e.status === 'draft' || !this.form) return false;
    const d = this.toDef();
    const key = (x: any) => JSON.stringify([x.rule?.type, x.rule?.target, x.rule?.element || null, x.rule?.actionId || null, x.window ? [x.window.start, x.window.end] : null]);
    return key(d) !== key(e);
  }

  async checkWouldEarn(): Promise<void> {
    if (!this.form || this.form.family === 'challenge') return;
    this.checking = true;
    try {
      this.wouldEarn = (await this.admin.stats(this.toDef())).wouldEarn;
    } catch {
      await this.uiUtil.presentToast('Could not count. Please try again.', 'error');
    } finally {
      this.checking = false;
    }
  }

  async save(): Promise<void> {
    if (!this.canSave) return;
    await this.run('save', this.form!.id, this.toDef(), this.existing ? 'Saved.' : 'Saved as a draft. Publish it when ready.');
  }

  async act(action: StampAction): Promise<void> {
    const f = this.form;
    if (!f || !this.existing) return;
    if (action === 'publish' || action === 'reactivate') {
      let count = this.wouldEarn;
      if (f.family !== 'challenge' && count === null) {
        try { count = (await this.admin.stats(this.toDef())).wouldEarn; } catch { count = null; }
      }
      const message = f.family === 'challenge'
        ? `Members will see it from 7 days before ${f.windowStart}, and can earn it from ${f.windowStart} to ${f.windowEnd}.`
        : count === null ? 'Members who meet the rule will be awarded it on their next activity.'
          : `${count} member${count === 1 ? '' : 's'} already meet the rule and will be awarded it on their next activity.`;
      if (!(await this.confirm(action === 'publish' ? 'Publish this badge?' : 'Reactivate this badge?', message))) return;
    }
    if (action === 'retire' && !(await this.confirm('Retire this badge?', 'Nobody new can earn it. Members who have it keep it.'))) return;
    if (action === 'delete' && !(await this.confirm('Delete this draft?', 'It has never been published, so nobody has it.'))) return;
    const done = { publish: 'Published.', retire: 'Retired.', reactivate: 'Active again.', delete: 'Draft deleted.', save: 'Saved.' }[action];
    await this.run(action, this.existing.id, undefined, done);
  }

  private async run(action: StampAction, id: string, def: Partial<StampDef> | undefined, done: string): Promise<void> {
    this.busy = true;
    try {
      const result = await this.admin.change(action, id, def);
      await this.uiUtil.presentToast(result.versionBumped ? `${done} The rule changed, so it's now version ${result.version}; members who earned it keep theirs.` : done, 'success', 5000);
      await this.load();
      const updated = this.defs.find((d) => d.id === id);
      if (updated && action !== 'delete') this.edit(updated); else this.cancel();
    } catch (error: any) {
      await this.uiUtil.presentToast(error?.message ? String(error.message).replace(/^.*?: /, '') : 'Could not save. Please try again.', 'error', 7000);
    } finally {
      this.busy = false;
    }
  }

  private async confirm(header: string, message: string): Promise<boolean> {
    const alert = await this.alerts.create({ header, message, buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Yes', role: 'confirm' }] });
    await alert.present();
    return (await alert.onDidDismiss()).role === 'confirm';
  }
}
