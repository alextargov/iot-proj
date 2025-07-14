import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { DatamodelListComponent } from './datamodel-list/datamodel-list.component'
import { DatamodelCreateComponent } from './datamodel-create/datamodel-create.component'
import {AuthGuard} from "../../shared/guards/auth.guard";
import {DatamodelResolver} from "./datamodel-resolver.service";

const routes: Routes = [
    {
        path: 'datamodel',
        children: [
            {
                path: '',
                component: DatamodelListComponent,
                resolve: {
                    dataModels: DatamodelResolver
                }
            },
            {
                path: 'create',
                pathMatch: 'full',
                component: DatamodelCreateComponent,
            },
        ],
        canActivate: [AuthGuard],
    },
]

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class DatamodelRoutingModule {}
