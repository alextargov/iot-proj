import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AlertsListComponent } from './alerts-list/alerts-list.component';
import { AlertFormComponent } from './alert-form/alert-form.component';
import { AlertEventsComponent } from './alert-events/alert-events.component';

const routes: Routes = [
    {
        path: '',
        component: AlertsListComponent,
    },
    {
        path: 'create',
        component: AlertFormComponent,
    },
    {
        path: ':id/edit',
        component: AlertFormComponent,
    },
    {
        path: ':id/events',
        component: AlertEventsComponent,
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AlertsRoutingModule {}
