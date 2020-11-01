import { Component, OnDestroy, OnInit } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject, throwError } from "rxjs";
import { catchError, switchMap, takeUntil } from "rxjs/operators";
import { ELEMENT_BLOG_CATEGORY } from "src/app/app.constants";
import { Blog } from "src/app/models/Blog";
import { BlogService } from "src/app/services/blog.service";
import { AppUtilService } from "src/app/util/AppUtilService";
import { UiUtilService } from "src/app/util/UiUtilService";

@Component({
  selector: "app-add-blog",
  templateUrl: "./add-blog.page.html",
  styleUrls: ["./add-blog.page.scss"],
})
export class AddBlogPage implements OnInit, OnDestroy {
  categories: String[] = Object.values(ELEMENT_BLOG_CATEGORY);
  addBlogForm: FormGroup;
  imageToDisplay: string;
  imageToSave: any;
  loader;
  destroy$: Subject<boolean> = new Subject();
  isEditMode: boolean = false;
  blog: Blog = {} as Blog;

  pageContent = {
    addBlogTitle: "Add Blog",
    editBlogTitle: "Edit Blog",
    titleLabel: "Title",
    shortDescriptionLabel: "Short Description",
    saveBlogLabel: "Save",
    cancelLabel: "Cancel",
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
      if (param.has("mode") && param.get("mode") === "edit") {
        this.blog = this.blogService.getViewEditModeBlog();
        this.blog.image.subscribe((imageData) => {
          this.imageToDisplay = imageData;
        });
        if (!this.blog) {
          this.router.navigateByUrl("/admin-dashboard/manage-blog");
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
      title: new FormControl("", [Validators.required]),
      authorName: new FormControl("", [Validators.required]),
      aboutAuthor: new FormControl("", [Validators.required]),
      category: new FormControl("", [Validators.required]),
      subCategory: new FormControl("", [Validators.required]),
      image: new FormControl("", [Validators.required]),
      shortDescription: new FormControl("", [Validators.required]),
      content: new FormControl("", [Validators.required]),
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
        Validators.required,
      ]),
      content: new FormControl(blog.content, [Validators.required]),
    });
  }

  onFileSelected(event) {
    this.appUtil.onFileSelected(event, this);
  }

  async onSubmit() {
    if (this.addBlogForm.valid) {
      const blog = this.createByForm(
        this.addBlogForm,
        this.blog,
        this.isEditMode
      );
      this.loader = await this.uiUtil.showLoader("We are saving your blog...");
      this.blogService
        .saveBlogImage(this.imageToSave, this.blog.imageName)
        .pipe(
          switchMap((data) => {
            console.log(data);
            return this.blogService.saveBlog(this.blog);
          }),
          takeUntil(this.destroy$),
          catchError((err) => {
            return throwError(err);
          })
        )
        .subscribe(
          ([imgResp, blogResp]) => {
            this.loader.dismiss();
            this.addBlogForm.reset();
            this.uiUtil.presentAlert("Success", "We saved your blog!", [
              "Cool!",
            ]);
          },
          (error) => {
            this.loader.dismiss();
            this.uiUtil.presentAlert(
              "Error",
              "Uh oh! We could not save it. Please try again.",
              ["OK"]
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
    return new Blog(
      isEditMode ? blog.id : null,
      addBlogForm.value.title,
      addBlogForm.value.authorName,
      addBlogForm.value.aboutAuthor,
      addBlogForm.value.category,
      addBlogForm.value.subCategory,
      this.appUtil.formatImageName(addBlogForm.value.image),
      addBlogForm.value.shortDescription,
      addBlogForm.value.content
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
