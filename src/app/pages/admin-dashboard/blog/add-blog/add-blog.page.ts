import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, throwError, of } from 'rxjs';
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
  loader;
  destroy$: Subject<boolean> = new Subject();
  isEditMode = false;
  blog: Blog = {} as Blog;
  editor: any;
  readonly MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB
  readonly maxImageMB = 2;
  quillModules: any = {
    toolbar: {
      container: [
        ['bold', 'italic', 'underline', 'strike'],
        [{ header: [1, 2, 3, false] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image']
      ],
      handlers: {
        image: this.imageHandler.bind(this)
      }
    }
  };

  pageContent = {
    addBlogTitle: 'Add Blog',
    editBlogTitle: 'Edit Blog',
    titleLabel: 'Title',
    shortDescriptionLabel: 'Short Description',
    saveBlogLabel: 'Save',
    cancelLabel: 'Cancel'
  };

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
        this.blog.image$.subscribe((imageData) => {
          this.imageToDisplay = imageData.toString();
        });
        console.log('Edit mode blog fetched',this.blog)
        if (!this.blog) {
          this.router.navigateByUrl('/admin-dashboard/manage-blog');
          return;
        }
        this.isEditMode = true;
        this.addBlogForm = this.initFormByBlog(this.blog);
      } else {
        this.isEditMode = false;
        this.addBlogForm = this.initForm();
      }
    });
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
      shortDescription: new FormControl(blog.shortDescription, [
        Validators.required
      ]),
      content: new FormControl(blog.content, [Validators.required])
    });
  }

  onFileSelected(event) {
    const file = event.target.files?.[0];
    if (file && !this.isImageUnderSize(file)) {
      event.target.value = '';
      return;
    }
    this.appUtil.onFileSelected(event, this);
  }

  private isImageUnderSize(file: File): boolean {
    if (!file) {
      return true;
    }
    if (file.size <= this.MAX_IMAGE_BYTES) {
      return true;
    }
    this.uiUtil.presentAlert(
      'Image too large',
      'Please upload images smaller than 2 MB.',
      ['OK']
    );
    return false;
  }

  async onSubmit() {
    if (this.addBlogForm.valid) {
      this.blog = this.createByForm(
        this.addBlogForm,
        this.blog,
        this.isEditMode
      );
      this.loader = await this.uiUtil.showLoader(
        UI_MESSAGES.SAVE_IN_PROGRESS.replace(
          UI_MESSAGES.PLACEHOLDER,
          ITEMS.BLOG
        )
      );
      this.blogService
        .saveBlog(this.blog)
        .pipe(
          switchMap((data) => {
            console.log(data);
            if (this.imageToSave !== undefined) {
              return this.blogService.saveBlogImage(
                this.imageToSave,
                this.blog.imageName
              );
            } else {
              return of(true);
            }
          }),
          takeUntil(this.destroy$),
          catchError((err) => {
            return throwError(err);
          })
        )
        .subscribe(
          (response) => {
            console.log(response);
            this.loader.dismiss();
            if (!this.isEditMode) {
              this.addBlogForm.reset();
              this.imageToDisplay = null;
              this.imageToSave = null;
            }
            this.uiUtil.presentAlert(
              UI_MESSAGES.SUCCESS_HEADER,
              UI_MESSAGES.SUCCESS_ADD_ITEM_DESC.replace(
                UI_MESSAGES.PLACEHOLDER,
                ITEMS.BLOG
              ),
              [UI_MESSAGES.SUCCESS_CTA_TEXT]
            );
          },
          (error) => {
            this.loader.dismiss();
            this.uiUtil.presentAlert(
              UI_MESSAGES.FAILURE_HEADER,
              UI_MESSAGES.FAILURE_ADD_ITEM_DESC.replace(
                UI_MESSAGES.PLACEHOLDER,
                ITEMS.BLOG
              ),
              [UI_MESSAGES.FAILURE_CTA_TEXT]
            );
          }
        );
    }
  }

  private createByForm(
    addBlogForm: FormGroup,
    blog: Blog,
    isEditMode: boolean
  ) {
    const contentDelta = this.editor ? this.editor.getContents() : null;
    // Ensure delta is pure JSON (no prototypes, functions) so Firestore accepts it
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
    // If editing an existing blog, paste current HTML into the editor to preserve formatting
    if (this.isEditMode && this.blog && this.blog.content) {
      try {
        // Use Quill clipboard to paste HTML and preserve formatting
        this.editor.clipboard.dangerouslyPasteHTML(this.blog.content);
      } catch (e) {
        // Fallback: set innerHTML
        this.editor.root.innerHTML = this.blog.content;
      }
    }

    // Attach paste handler to clean MS Word/Office markup and normalize HTML
    try {
      this.editor.root.addEventListener('paste', (evt: ClipboardEvent) => {
        evt.preventDefault();
        const clipboard = (evt.clipboardData || (window as any).clipboardData);
        if (!clipboard) return;
        const html = clipboard.getData('text/html');
        const text = clipboard.getData('text/plain');
        const rangeIndex = (this.editor.getSelection && this.editor.getSelection(true)?.index) ?? this.editor.getLength();
        if (html) {
          const cleaned = this.cleanPastedHTML(html);
          // Paste cleaned HTML at current selection
          this.editor.clipboard.dangerouslyPasteHTML(rangeIndex, cleaned);
        } else if (text) {
          this.editor.insertText(rangeIndex, text, 'user');
        }
      });
    } catch (e) {
      // ignore if attaching listener fails in some environments
    }
  }

  /**
   * Basic cleanup for HTML pasted from Word/Office or other sources.
   * Removes MS-specific tags, inline styles and empty spans, and strips comments.
   */
  cleanPastedHTML(html: string): string {
    if (!html) return '';
    let out = html;
    // Remove XML namespaces and comments
    out = out.replace(/<!--([\s\S]*?)-->/gi, '');
    out = out.replace(/<\?xml[^>]*>/gi, '');
    out = out.replace(/<\w+:\w[^>]*>[\s\S]*?<\/\w+:\w>/gi, '');

    // Remove Office tags like o:p, v:, w:
    out = out.replace(/<\/?o:p[^>]*>/gi, '');
    out = out.replace(/<\/?v:[^>]*>/gi, '');
    out = out.replace(/<\/?w:[^>]*>/gi, '');

    // Remove mso-xxx styles
    out = out.replace(/mso-[^:;"']+:[^;"']+;?/gi, '');

    // Remove style attributes and class attributes (keep inline formatting that is simple)
    out = out.replace(/\sstyle=("|')([^"']*)("|')/gi, '');
    out = out.replace(/\sclass=("|')([^"']*)("|')/gi, '');

    // Remove empty spans and unnecessary tags
    out = out.replace(/<span[^>]*>\s*<\/span>/gi, '');
    out = out.replace(/<\/?meta[^>]*>/gi, '');

    // Strip <!--[if ...]> conditional comments
    out = out.replace(/<\!\[if[^\]]*\]>[\s\S]*?<\!\[endif\]>/gi, '');

    // Normalize multiple breaks
    out = out.replace(/(\r|\n)+/g, '\n');

    // Trim outer body tags if present
    out = out.replace(/^\s*<body[^>]*>/i, '');
    out = out.replace(/<\/body>\s*$/i, '');

    return out;
  }

  imageHandler() {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }
      if (!this.isImageUnderSize(file)) {
        input.value = '';
        return;
      }

      const imageName = this.appUtil.formatImageName('blog_inline_', file);
      // show loader
      this.loader = await this.uiUtil.showLoader('Uploading image 0%');

      const { task, downloadUrl$ } = this.blogService.saveBlogInlineImageWithProgress(
        file,
        imageName
      );

      // subscribe to progress
      const progressSub = (task as any).percentageChanges().subscribe((p: number) => {
        try {
          const percent = Math.round(p || 0);
          if (this.loader) this.loader.message = `Uploading image ${percent}%`;
        } catch (err) {
          // ignore update errors
        }
      });

      downloadUrl$.subscribe(
        async (downloadUrl) => {
          progressSub.unsubscribe();
          try {
            const range = this.editor?.getSelection(true);
            const index = range?.index ?? this.editor?.getLength() ?? 0;
            this.editor.insertEmbed(index, 'image', downloadUrl, 'user');
            this.editor.setSelection(index + 1, 0, 'silent');
          } catch (e) {
            console.error('Insert image failed', e);
          }
          if (this.loader) this.loader.dismiss();
        },
        async (error) => {
          progressSub.unsubscribe();
          console.error('Inline image upload failed', error);
          if (this.loader) this.loader.dismiss();
          await this.uiUtil.presentAlert(
            'Image upload failed',
            'Could not upload the image. Please try again.',
            ['OK']
          );
        }
      );
    };
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
