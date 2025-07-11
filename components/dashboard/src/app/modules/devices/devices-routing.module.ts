import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { DevicesListComponent } from './devices-list/devices-list.component'
import { DeviceCreateComponent } from './device-create/device-create.component'
import {AuthGuard} from "../../shared/guards/auth.guard";

const routes: Routes = [
    {
        path: 'devices',
        children: [
            {
                path: '',
                component: DevicesListComponent,
            },
            {
                path: 'create',
                pathMatch: 'full',
                component: DeviceCreateComponent,
            },
            // {
            //   path: ':id',
            //   component: WidgetDetailsComponent,
            // }
        ],
        canActivate: [AuthGuard],
    },
]

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class DevicesRoutingModule {}
