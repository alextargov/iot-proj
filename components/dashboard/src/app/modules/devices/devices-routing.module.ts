import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DevicesListComponent } from './devices-list/devices-list.component';
import { DeviceCreateComponent } from './device-create/device-create.component';
import { DeviceDetailComponent } from './device-detail/device-detail.component';

const routes: Routes = [
    {
        path: '',
        component: DevicesListComponent,
    },
    {
        path: 'create',
        component: DeviceCreateComponent,
    },
    {
        path: ':id',
        component: DeviceDetailComponent,
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class DevicesRoutingModule {}
