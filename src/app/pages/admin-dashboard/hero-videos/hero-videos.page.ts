import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HeroVideo } from 'src/app/models/HeroVideo';
import { HeroVideoService } from 'src/app/services/hero-video.service';
import { UiUtilService } from 'src/app/util/UiUtilService';
import { HERO_VIDEO_SLOTS } from 'src/app/app.constants';

interface HeroVideoSlotForm {
  slot: typeof HERO_VIDEO_SLOTS[number];
  saved: HeroVideo;
  title: string;
  urlInput: string;
  saving: boolean;
}

/**
 * One edit card per fixed hero video slot (5 element pages + Our Purpose).
 * The slots themselves are fixed by HERO_VIDEO_SLOTS — there is no add or
 * delete, only "change which video plays here".
 */
@Component({
  selector: 'app-hero-videos',
  templateUrl: './hero-videos.page.html',
  styleUrls: ['./hero-videos.page.scss']
})
export class HeroVideosPage implements OnInit, OnDestroy {
  destroy$: Subject<boolean> = new Subject();

  isLoading = true;
  loadError = false;
  forms: HeroVideoSlotForm[] = [];

  constructor(
    private heroVideoService: HeroVideoService,
    private uiUtil: UiUtilService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    this.loadError = false;
    this.heroVideoService.getAllHeroVideos().pipe(takeUntil(this.destroy$)).subscribe(
      (videos) => {
        this.forms = HERO_VIDEO_SLOTS.map((slot) => {
          const saved = videos.find((v) => v.id === slot.id);
          return {
            slot,
            saved,
            title: saved.title,
            urlInput: saved.videoId,
            saving: false
          };
        });
        this.isLoading = false;
      },
      () => {
        this.isLoading = false;
        this.loadError = true;
      }
    );
  }

  parsedId(form: HeroVideoSlotForm): string | null {
    return HeroVideoService.parseYoutubeId(form.urlInput);
  }

  isDirty(form: HeroVideoSlotForm): boolean {
    return (
      form.saved.isDefault ||
      form.title.trim() !== form.saved.title ||
      this.parsedId(form) !== form.saved.videoId
    );
  }

  canSave(form: HeroVideoSlotForm): boolean {
    return !form.saving && !!form.title.trim() && !!this.parsedId(form) && this.isDirty(form);
  }

  thumbnailUrl(videoId: string | null): string {
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
  }

  watchUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  reset(form: HeroVideoSlotForm) {
    form.title = form.saved.title;
    form.urlInput = form.saved.videoId;
  }

  async save(form: HeroVideoSlotForm) {
    const videoId = this.parsedId(form);
    if (!this.canSave(form) || !videoId) return;
    form.saving = true;
    this.heroVideoService
      .saveHeroVideo(form.slot.id, form.title, videoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        () => {
          form.saving = false;
          form.saved = { id: form.slot.id, title: form.title.trim(), videoId, updatedAt: new Date() };
          form.title = form.saved.title;
          form.urlInput = videoId;
          this.uiUtil.presentToast(`${form.slot.label} hero video saved`, 'success');
        },
        () => {
          form.saving = false;
          this.uiUtil.presentToast(`Couldn't save the ${form.slot.label} hero video. Please try again.`, 'error');
        }
      );
  }

  updatedAtDate(video: HeroVideo): Date | null {
    const value = video?.updatedAt;
    if (!value) return null;
    return typeof value.toDate === 'function' ? value.toDate() : value;
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
