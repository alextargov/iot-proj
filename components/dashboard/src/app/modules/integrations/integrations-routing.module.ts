import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IntegrationsListComponent } from './integrations-list/integrations-list.component';
import { IntegrationFormComponent } from './integration-form/integration-form.component';

const routes: Routes = [
    { path: '', component: IntegrationsListComponent },
    { path: 'create', component: IntegrationFormComponent },
    { path: ':id/edit', component: IntegrationFormComponent },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class IntegrationsRoutingModule {}
