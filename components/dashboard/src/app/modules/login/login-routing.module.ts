import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { LoginComponent } from './login.component'
import { LoginGuard } from "../../shared/guards/login.guard";

const routes: Routes = [
    { path: 'login', pathMatch: 'full', component: LoginComponent, canActivate: [LoginGuard] },
]

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class LoginRoutingModule {}
