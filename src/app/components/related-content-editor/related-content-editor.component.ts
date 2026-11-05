import { Component, forwardRef, Input, OnDestroy, OnInit } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { firstValueFrom, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ELEMENTS } from 'src/app/app.constants';
import { MAX_RELATED, RelatedRef, relatedKey, RelatedType, youtubeIdFrom } from 'src/app/models/RelatedContent';
import { ActionService } from 'src/app/services/action.service';
import { BlogService } from 'src/app/services/blog.service';
import { YoutubeVideoService } from 'src/app/services/youtube-video.service';

interface PickOption {
  id: string;
  title: string;
  note?: string;
}

const TYPE_LABEL: Record<RelatedType, string> = { blog: 'Story', video: 'Video', action: 'Action' };

/**
 * Admin picker for an item's related content (models/RelatedContent.ts), used
 * as a form control: `<app-related-content-editor formControlName="relatedContent">`.
 * Stories and actions are picked from the existing catalogue; videos are added
 * by YouTube link, with the title looked up from YouTube.
 */
@Component({
    selector: 'app-related-content-editor',
    templateUrl: './related-content-editor.component.html',
    styleUrls: ['./related-content-editor.component.scss'],
    standalone: false,
    providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RelatedContentEditorComponent), multi: true }]
})
export class RelatedContentEditorComponent implements ControlValueAccessor, OnInit, OnDestroy {
  /** The item being edited, so it can't be linked to itself. */
  @Input() selfType?: RelatedType;
  @Input() selfId?: string | null;
  /** Element a new video link opens under. */
  @Input() defaultElement = '';

  readonly max = MAX_RELATED;
  readonly elements = Object.values(ELEMENTS);
  refs: RelatedRef[] = [];
  addType: RelatedType = 'blog';
  query = '';
  videoInput = '';
  videoElement = '';
  videoError = '';
  isAddingVideo = false;
  disabled = false;

  private blogs: PickOption[] = [];
  private actions: PickOption[] = [];
  private destroy$ = new Subject<void>();
  private onChange: (value: RelatedRef[]) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(
    private blogService: BlogService,
    private actionService: ActionService,
    private youtube: YoutubeVideoService
  ) {}

  ngOnInit(): void {
    this.videoElement = this.defaultElement || ELEMENTS.EARTH;
    this.blogService.getBlogSummaries().pipe(takeUntil(this.destroy$)).subscribe((blogs) => {
      this.blogs = blogs.map((b) => ({ id: b.id, title: b.title, note: b.category }));
    });
    this.actionService.getAllActions().pipe(takeUntil(this.destroy$)).subscribe((actions) => {
      this.actions = actions.map((a) => ({
        id: a.id,
        title: a.title,
        note: a.isActive ? (a.elementIds || []).join(', ') : 'inactive'
      }));
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  writeValue(value: RelatedRef[] | null): void {
    this.refs = Array.isArray(value) ? [...value] : [];
  }

  registerOnChange(fn: (value: RelatedRef[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  get isFull(): boolean {
    return this.refs.length >= MAX_RELATED;
  }

  typeLabel(type: RelatedType): string {
    return TYPE_LABEL[type];
  }

  /** Catalogue matches for the search box, leaving out the item itself and existing links. */
  get matches(): PickOption[] {
    const type = this.addType;
    if (type === 'video') return [];
    const terms = this.query.trim().toLowerCase();
    if (!terms) return [];
    const taken = new Set(this.refs.map(relatedKey));
    return (type === 'blog' ? this.blogs : this.actions)
      .filter((o) => !(type === this.selfType && o.id === this.selfId))
      .filter((o) => !taken.has(relatedKey({ type, id: o.id })))
      .filter((o) => (o.title || '').toLowerCase().includes(terms))
      .slice(0, 8);
  }

  pick(option: PickOption): void {
    if (this.addType === 'video') return;
    this.add({ type: this.addType, id: option.id, title: option.title });
    this.query = '';
  }

  async addVideo(): Promise<void> {
    this.videoError = '';
    const id = youtubeIdFrom(this.videoInput);
    if (!id) {
      this.videoError = 'Paste a YouTube link or video ID.';
      return;
    }
    if (this.refs.some((r) => r.type === 'video' && r.id === id)) {
      this.videoError = 'That video is already linked.';
      return;
    }
    this.isAddingVideo = true;
    try {
      const data: any = await firstValueFrom(this.youtube.getYoutubeVideo(id));
      const title = data?.items?.[0]?.snippet?.title;
      if (!title) {
        this.videoError = 'YouTube has no public video with that ID.';
        return;
      }
      this.add({ type: 'video', id, title, element: this.videoElement });
      this.videoInput = '';
    } catch {
      this.videoError = 'Could not reach YouTube. Please try again.';
    } finally {
      this.isAddingVideo = false;
    }
  }

  remove(index: number): void {
    this.refs = this.refs.filter((_, i) => i !== index);
    this.emit();
  }

  move(index: number, delta: number): void {
    const target = index + delta;
    if (target < 0 || target >= this.refs.length) return;
    const next = [...this.refs];
    [next[index], next[target]] = [next[target], next[index]];
    this.refs = next;
    this.emit();
  }

  private add(ref: RelatedRef): void {
    if (this.isFull) return;
    this.refs = [...this.refs, ref];
    this.emit();
  }

  private emit(): void {
    this.onChange(this.refs);
    this.onTouched();
  }
}
