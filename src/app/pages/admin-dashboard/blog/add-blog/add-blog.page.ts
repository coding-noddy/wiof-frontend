import { Component, OnDestroy, OnInit, HostListener } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, throwError, of, interval, firstValueFrom } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';
import {
  ELEMENT_BLOG_CATEGORY,
  UI_MESSAGES,
  ITEMS
} from 'src/app/app.constants';
import { Blog } from 'src/app/models/Blog';
import { BlogService } from 'src/app/services/blog.service';
import { AppUtilService } from 'src/app/util/AppUtilService';
import { UiUtilService } from 'src/app/util/UiUtilService';
import Quill from 'quill';
import { compressImage } from 'src/app/util/image-compression.util';
import 'src/app/util/quill-global';
import ImageResize from 'quill-image-resize-module';

Quill.register('modules/imageResize', ImageResize);

@Component({
  selector: 'app-add-blog',
  templateUrl: './add-blog.page.html',
  styleUrls: ['./add-blog.page.scss']
})
export class AddBlogPage implements OnInit, OnDestroy {
  categories: string[] = Object.values(ELEMENT_BLOG_CATEGORY);
  addBlogForm: FormGroup;
  imageToDisplay: string;
  imageToSave: any;
  loader: any;
  destroy$: Subject<boolean> = new Subject();
  isEditMode = false;
  blog: Blog = {} as Blog;
  editor: any;
  readonly MAX_IMAGE_BYTES = 2 * 1024 * 1024;
  readonly maxImageMB = 2;
  private readonly DRAFT_KEY = 'wiof_blog_draft';

  // Editor config
  quillModules: any = {
    toolbar: {
      container: [
        [{ font: [] }, { size: ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ header: [1, 2, 3, 4, false] }],
        [{ align: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ indent: '-1' }, { indent: '+1' }],
        [{ color: [] }, { background: [] }],
        ['blockquote', 'code-block'],
        ['link', 'image', 'video'],
        ['clean']
      ],
      handlers: {
        image: this.imageHandler.bind(this)
      }
    },
    history: { delay: 1000, maxStack: 50, userOnly: true },
    imageResize: {}
  };

  // Writer stats
  wordCount = 0;
  charCount = 0;
  readTime = 0;

  // Draft & save state
  isDirty = false;
  lastSavedAt: Date = null;
  autoSaveEnabled = true;
  showPreview = false;
  slugPreview = '';
  isSaving = false;

  // Keyboard shortcuts info
  showShortcuts = false;
  shortcuts = [
    { keys: 'Ctrl + B', action: 'Bold' },
    { keys: 'Ctrl + I', action: 'Italic' },
    { keys: 'Ctrl + U', action: 'Underline' },
    { keys: 'Ctrl + Z', action: 'Undo' },
    { keys: 'Ctrl + Y', action: 'Redo' },
    { keys: 'Ctrl + Shift + 7', action: 'Ordered list' },
    { keys: 'Ctrl + Shift + 8', action: 'Bullet list' },
  ];

  constructor(
    private blogService: BlogService,
    private uiUtil: UiUtilService,
    private appUtil: AppUtilService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.blog = {} as Blog;
    this.route.paramMap.subscribe((param) => {
      if (param.has('mode') && param.get('mode') === 'edit') {
        this.blog = this.blogService.getViewEditModeBlog();
        if (!this.blog) {
          this.router.navigateByUrl('/admin-dashboard/manage-blog');
          return;
        }
        this.blog.image$.subscribe((imageData) => {
          this.imageToDisplay = imageData.toString();
        });
        this.isEditMode = true;
        this.addBlogForm = this.initFormByBlog(this.blog);
        this.slugPreview = this.blog.slug || Blog.generateSlug(this.blog.title);
      } else {
        this.isEditMode = false;
        this.addBlogForm = this.initForm();
        this.restoreDraft();
      }
    });

    // Auto-save every 30 seconds (only for new blogs)
    if (this.autoSaveEnabled) {
      interval(30000).pipe(takeUntil(this.destroy$)).subscribe(() => {
        if (!this.isEditMode && this.isDirty) {
          this.saveDraft();
        }
      });
    }

    // Watch title changes for slug preview
    this.addBlogForm?.get('title')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(title => {
      this.slugPreview = Blog.generateSlug(title);
      this.isDirty = true;
    });

    // Mark dirty on any form change
    this.addBlogForm?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.isDirty = true;
    });
  }

  // Unsaved changes guard
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.isDirty && !this.isSaving) {
      event.preventDefault();
      event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    }
  }

  // Auto-save draft to localStorage
  private saveDraft() {
    if (this.isEditMode) return;
    const draft = {
      formValue: this.addBlogForm.getRawValue(),
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(this.DRAFT_KEY, JSON.stringify(draft));
    this.lastSavedAt = new Date();
  }

  // Restore draft from localStorage
  private restoreDraft() {
    const saved = localStorage.getItem(this.DRAFT_KEY);
    if (!saved) return;
    try {
      const draft = JSON.parse(saved);
      const formValue = draft.formValue;
      if (formValue && formValue.title) {
        // Ask user if they want to restore
        this.uiUtil.presentAlert(
          'Draft Found',
          `You have an unsaved draft from ${new Date(draft.savedAt).toLocaleString()}. Would you like to restore it?`,
          [
            { text: 'Discard', role: 'cancel', handler: () => this.clearDraft() },
            { text: 'Restore', handler: () => {
              this.addBlogForm.patchValue(formValue);
              this.slugPreview = Blog.generateSlug(formValue.title);
              this.lastSavedAt = new Date(draft.savedAt);
            }}
          ]
        );
      }
    } catch (e) {
      // Invalid draft, clear it
      this.clearDraft();
    }
  }

  clearDraft() {
    localStorage.removeItem(this.DRAFT_KEY);
    this.lastSavedAt = null;
  }

  private initForm() {
    return new FormGroup({
      title: new FormControl('', [Validators.required]),
      authorName: new FormControl('', [Validators.required]),
      aboutAuthor: new FormControl('', [Validators.required]),
      category: new FormControl('', [Validators.required]),
      subCategory: new FormControl('', [Validators.required]),
      image: new FormControl('', [Validators.required]),
      shortDescription: new FormControl('', [Validators.required]),
      content: new FormControl('', [Validators.required])
    });
  }

  private initFormByBlog(blog: Blog) {
    return new FormGroup({
      title: new FormControl(blog.title, [Validators.required]),
      authorName: new FormControl(blog.author, [Validators.required]),
      aboutAuthor: new FormControl(blog.aboutAuthor, [Validators.required]),
      category: new FormControl(blog.category, [Validators.required]),
      subCategory: new FormControl(blog.subCategory, [Validators.required]),
      image: new FormControl(blog.imageName, [Validators.required]),
      shortDescription: new FormControl(blog.shortDescription, [Validators.required]),
      content: new FormControl(blog.content, [Validators.required])
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file && !this.isImageUnderSize(file)) {
      event.target.value = '';
      return;
    }
    this.appUtil.onFileSelected(event, this);
    this.isDirty = true;
  }

  private isImageUnderSize(file: File): boolean {
    if (!file) return true;
    if (file.size <= this.MAX_IMAGE_BYTES) return true;
    this.uiUtil.presentToast(`Please upload images smaller than ${this.maxImageMB} MB.`, 'error');
    return false;
  }

  togglePreview() {
    this.showPreview = !this.showPreview;
  }

  async onSubmit() {
    if (this.addBlogForm.valid) {
      this.isSaving = true;
      this.loader = await this.uiUtil.showLoader(
        UI_MESSAGES.SAVE_IN_PROGRESS.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.BLOG)
      );
      try {
        await this.uploadEmbeddedImages();
      } catch (e) {
        this.loader.dismiss();
        this.isSaving = false;
        await this.uiUtil.presentToast('Could not upload an image in the blog. Please try again.', 'error');
        return;
      }
      this.blog = this.createByForm(this.addBlogForm, this.blog, this.isEditMode);
      // Cover image first, then the blog: the onBlogWritten function reads the
      // image's download token when the blog is saved, for the blog lists.
      const coverUpload$: Observable<unknown> = this.imageToSave
        ? this.blogService.saveBlogImage(this.imageToSave, this.blog.imageName)
        : of(true);
      coverUpload$.pipe(
        switchMap(() => this.blogService.saveBlog(this.blog)),
        takeUntil(this.destroy$),
        catchError((err) => throwError(err))
      ).subscribe(
        () => {
          this.loader.dismiss();
          this.isSaving = false;
          this.isDirty = false;
          this.clearDraft();
          if (!this.isEditMode) {
            this.addBlogForm.reset();
            this.imageToDisplay = null;
            this.imageToSave = null;
            this.wordCount = 0;
            this.charCount = 0;
            this.readTime = 0;
            this.slugPreview = '';
          }
          this.uiUtil.presentToast(
            UI_MESSAGES.SUCCESS_ADD_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.BLOG),
            'success'
          );
        },
        () => {
          this.loader.dismiss();
          this.isSaving = false;
          this.uiUtil.presentToast(
            UI_MESSAGES.FAILURE_ADD_ITEM_DESC.replace(UI_MESSAGES.PLACEHOLDER, ITEMS.BLOG),
            'error'
          );
        }
      );
    }
  }

  private createByForm(addBlogForm: FormGroup, blog: Blog, isEditMode: boolean) {
    const contentDelta = this.editor ? this.editor.getContents() : null;
    const safeContentDelta = contentDelta ? JSON.parse(JSON.stringify(contentDelta)) : null;
    const result = new Blog(
      isEditMode ? blog.id : null,
      addBlogForm.value.title,
      addBlogForm.value.authorName,
      addBlogForm.value.aboutAuthor,
      addBlogForm.value.category,
      addBlogForm.value.subCategory,
      isEditMode && blog.imageName !== undefined
        ? blog.imageName
        : this.appUtil.formatImageName('blog_', this.imageToSave),
      addBlogForm.value.shortDescription,
      addBlogForm.value.content
    );
    result.contentDelta = safeContentDelta;
    return result;
  }

  onEditorCreated(editor: any) {
    this.editor = editor;
    if (this.isEditMode && this.blog && this.blog.content) {
      try {
        this.editor.clipboard.dangerouslyPasteHTML(this.blog.content);
      } catch (e) {
        this.editor.root.innerHTML = this.blog.content;
      }
    }

    // Word count tracking
    this.updateWordCount();
    this.editor.on('text-change', () => {
      this.updateWordCount();
      this.isDirty = true;
    });

    // Add tooltips to toolbar buttons
    this.addToolbarTooltips();

    // Paste handler for Word/Office cleanup
    try {
      this.editor.root.addEventListener('paste', (evt: ClipboardEvent) => {
        evt.preventDefault();
        const clipboard = (evt.clipboardData || (window as any).clipboardData);
        if (!clipboard) return;
        const html = clipboard.getData('text/html');
        const text = clipboard.getData('text/plain');
        const rangeIndex = (this.editor.getSelection && this.editor.getSelection(true)?.index) ?? this.editor.getLength();
        // A copied image (screenshot, "Copy image") arrives as a file with no
        // HTML: upload it like the toolbar's image button does.
        const imageFile = Array.from(clipboard.files || []).find((f: File) => f.type.startsWith('image/'));
        if (imageFile && !html) {
          this.insertUploadedImage(imageFile as File);
        } else if (html) {
          this.editor.clipboard.dangerouslyPasteHTML(rangeIndex, this.cleanPastedHTML(html));
        } else if (text) {
          this.editor.insertText(rangeIndex, text, 'user');
        }
      });
    } catch (e) { /* ignore */ }
  }

  private updateWordCount() {
    if (!this.editor) return;
    const text = this.editor.getText().trim();
    this.charCount = text.length;
    this.wordCount = text ? text.split(/\s+/).filter((w: string) => w.length > 0).length : 0;
    this.readTime = Math.max(1, Math.ceil(this.wordCount / 200));
  }

  private addToolbarTooltips() {
    const tooltipMap: { [selector: string]: string } = {
      '.ql-bold': 'Bold (Ctrl+B)',
      '.ql-italic': 'Italic (Ctrl+I)',
      '.ql-underline': 'Underline (Ctrl+U)',
      '.ql-strike': 'Strikethrough',
      '.ql-blockquote': 'Blockquote',
      '.ql-code-block': 'Code Block',
      '.ql-link': 'Insert Link (Ctrl+K)',
      '.ql-image': 'Insert Image',
      '.ql-video': 'Embed Video',
      '.ql-clean': 'Clear Formatting',
      '.ql-list[value="ordered"]': 'Numbered List',
      '.ql-list[value="bullet"]': 'Bullet List',
      '.ql-indent[value="-1"]': 'Decrease Indent',
      '.ql-indent[value="+1"]': 'Increase Indent',
      '.ql-header': 'Heading Size',
      '.ql-align': 'Text Alignment',
      '.ql-color': 'Text Color',
      '.ql-background': 'Background Color',
      '.ql-font': 'Font Family',
      '.ql-size': 'Font Size',
    };

    try {
      const toolbar = this.editor.container.previousSibling || 
                      document.querySelector('.ql-toolbar');
      if (!toolbar) return;

      Object.entries(tooltipMap).forEach(([selector, tooltip]) => {
        const buttons = toolbar.querySelectorAll(selector);
        buttons.forEach((btn: HTMLElement) => {
          btn.setAttribute('title', tooltip);
        });
      });
    } catch (e) { /* ignore if toolbar not accessible */ }
  }

  cleanPastedHTML(html: string): string {
    if (!html) return '';
    let out = html;
    out = out.replace(/<!--([\s\S]*?)-->/gi, '');
    out = out.replace(/<\?xml[^>]*>/gi, '');
    out = out.replace(/<\w+:\w[^>]*>[\s\S]*?<\/\w+:\w>/gi, '');
    out = out.replace(/<\/?o:p[^>]*>/gi, '');
    out = out.replace(/<\/?v:[^>]*>/gi, '');
    out = out.replace(/<\/?w:[^>]*>/gi, '');
    out = out.replace(/mso-[^:;"']+:[^;"']+;?/gi, '');
    out = out.replace(/\sstyle=("|')([^"']*)("|')/gi, '');
    out = out.replace(/\sclass=("|')([^"']*)("|')/gi, '');
    out = out.replace(/<span[^>]*>\s*<\/span>/gi, '');
    out = out.replace(/<\/?meta[^>]*>/gi, '');
    out = out.replace(/<\!\[if[^\]]*\]>[\s\S]*?<\!\[endif\]>/gi, '');
    out = out.replace(/(\r|\n)+/g, '\n');
    out = out.replace(/^\s*<body[^>]*>/i, '');
    out = out.replace(/<\/body>\s*$/i, '');
    return out;
  }

  imageHandler() {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (!this.isImageUnderSize(file)) { input.value = ''; return; }
      this.insertUploadedImage(file);
    };
  }

  /** Uploads an image to Storage and inserts it at the cursor, with upload progress. */
  private async insertUploadedImage(file: File) {
    if (!this.isImageUnderSize(file)) return;
    const imageName = this.appUtil.formatImageName('blog_inline_', file);
    this.loader = await this.uiUtil.showLoader('Uploading image 0%');

    const image = await compressImage(file);
    const { task, downloadUrl$ } = this.blogService.saveBlogInlineImageWithProgress(image, imageName);

    const progressSub = (task as any).percentageChanges().subscribe((p: number) => {
      try {
        if (this.loader) this.loader.message = `Uploading image ${Math.round(p || 0)}%`;
      } catch (err) { /* ignore */ }
    });

    downloadUrl$.subscribe(
      async (downloadUrl) => {
        progressSub.unsubscribe();
        try {
          const range = this.editor?.getSelection(true);
          const index = range?.index ?? this.editor?.getLength() ?? 0;
          this.editor.insertEmbed(index, 'image', downloadUrl, 'user');
          this.editor.setSelection(index + 1, 0, 'silent');
        } catch (e) { console.error('Insert image failed', e); }
        if (this.loader) this.loader.dismiss();
      },
      async () => {
        progressSub.unsubscribe();
        if (this.loader) this.loader.dismiss();
        await this.uiUtil.presentToast('Could not upload the image. Please try again.', 'error');
      }
    );
  }

  /**
   * Images pasted as HTML or dropped into the editor are embedded as
   * `data:`/`blob:` URLs, which stored the whole image inside the blog doc
   * (one blog reached 800 KB, near Firestore's 1 MB doc limit). Before
   * saving, each one is compressed, uploaded to Storage and swapped for its
   * download URL, keeping its size/alignment attributes. Runs from the last
   * image back so earlier editor indexes stay valid.
   */
  private async uploadEmbeddedImages() {
    if (!this.editor) return;
    const Delta = Quill.import('delta');
    const embedded: { index: number; src: string; attributes: any }[] = [];
    let index = 0;
    for (const op of this.editor.getContents().ops) {
      const src = op.insert?.image;
      if (typeof src === 'string' && /^(data|blob):/.test(src)) {
        embedded.push({ index, src, attributes: op.attributes });
      }
      index += typeof op.insert === 'string' ? op.insert.length : 1;
    }
    for (const image of embedded.reverse()) {
      const compressed = await compressImage(await this.embeddedImageBlob(image.src));
      const ext = (compressed.type.split('/')[1] || 'png').replace('jpeg', 'jpg').replace(/\+.*/, '');
      const imageName = `blog_inline_${Date.now()}_${image.index}.${ext}`;
      const url = await firstValueFrom(this.blogService.saveBlogInlineImage(compressed as File, imageName));
      this.editor.updateContents(
        new Delta().retain(image.index).delete(1).insert({ image: url }, image.attributes),
        'user'
      );
    }
  }

  /**
   * The image behind a data:/blob: URL. Not fetch(): the CSP's connect-src
   * doesn't allow data:/blob:, but img-src does, so a blob: URL is read
   * back through an <img> and a canvas.
   */
  private async embeddedImageBlob(src: string): Promise<Blob> {
    if (src.startsWith('data:')) {
      const [header, base64] = src.split(',');
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      return new Blob([bytes], { type: header.match(/^data:([^;]+)/)?.[1] || 'image/png' });
    }
    const img = new Image();
    img.src = src;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d').drawImage(img, 0, 0);
    return new Promise((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not read image'))), 'image/png')
    );
  }

  ngOnDestroy(): void {
    // Save draft one last time if dirty
    if (!this.isEditMode && this.isDirty) {
      this.saveDraft();
    }
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
