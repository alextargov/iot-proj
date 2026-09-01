import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AlertsListComponent } from './alerts-list/alerts-list.component';
import { AlertFormComponent } from './alert-form/alert-form.component';
import { AlertEventsComponent } from './alert-events/alert-events.component';
import { unsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';

const routes: Routes = [
    {
        path: '',
        component: AlertsListComponent,
    },
    {
        path: 'create',
        component: AlertFormComponent,
        canDeactivate: [unsavedChangesGuard],
    },
    {
        path: ':id/edit',
        component: AlertFormComponent,
        canDeactivate: [unsavedChangesGuard],
    },
    {
        path: ':id/:deviceId/events',
        component: AlertEventsComponent,
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AlertsRoutingModule {}
