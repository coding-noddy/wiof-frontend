import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { EarthPage } from "./earth.page";

const routes: Routes = [
  {
    path: "",
    component: EarthPage
  },
  {
    path: "blog",
    loadChildren: () =>
      import("../blog-post/blog-post.module").then((m) => m.BlogPostPageModule)
  },
  {
    path: "video",
    loadChildren: () =>
      import("../video-post/video-post.module").then(
        (m) => m.VideoPostPageModule
      )
  },
  {
    path: "take-action",
    loadChildren: () =>
      import("../take-action/take-action.module").then(
        (m) => m.TakeActionPageModule
      )
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EarthPageRoutingModule {}
