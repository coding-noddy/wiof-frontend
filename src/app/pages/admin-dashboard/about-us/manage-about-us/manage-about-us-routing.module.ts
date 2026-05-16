import { NgModule } from "@angular/core";
import { Routes,RouterModule } from "@angular/router";
import { ManageAboutUsPage } from "./manage-about-us.page";

const routes : Routes = [
    {
        path:'',
        component:ManageAboutUsPage
    }
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})

export class ManageAboutUsPageRoutingModule{} 