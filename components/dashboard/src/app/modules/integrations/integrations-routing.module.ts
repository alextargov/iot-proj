import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IntegrationsListComponent } from './integrations-list/integrations-list.component';
import { IntegrationFormComponent } from './integration-form/integration-form.component';
import { unsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';

const routes: Routes = [
    { path: '', component: IntegrationsListComponent },
    {
        path: 'create',
        component: IntegrationFormComponent,
        canDeactivate: [unsavedChangesGuard],
    },
    {
        path: ':id/edit',
        component: IntegrationFormComponent,
        canDeactivate: [unsavedChangesGuard],
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class IntegrationsRoutingModule {}
