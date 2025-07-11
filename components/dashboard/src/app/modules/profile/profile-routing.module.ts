import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { ProfileComponent } from './profile.component'
import {AuthGuard} from "../../shared/guards/auth.guard";

const routes: Routes = [
    { path: 'profile', pathMatch: 'full', component: ProfileComponent, canActivate: [AuthGuard] },
]

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class ProfileRoutingModule {}
