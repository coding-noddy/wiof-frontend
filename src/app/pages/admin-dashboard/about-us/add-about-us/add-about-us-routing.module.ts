import { NgModule } from "@angular/core";
import { Routes,RouterModule } from "@angular/router"
import { AddAboutUsPage } from "./add-about-us.page";

const routes: Routes = [
    {
        path:'',
        component:AddAboutUsPage
    }
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})

export class AddAboutUsPageRoutingModule {}