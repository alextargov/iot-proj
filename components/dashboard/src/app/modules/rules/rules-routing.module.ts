import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RulesListComponent } from './rules-list/rules-list.component';
import { RuleFormComponent } from './rule-form/rule-form.component';
import { unsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';

const routes: Routes = [
    { path: '', component: RulesListComponent },
    {
        path: 'create',
        component: RuleFormComponent,
        canDeactivate: [unsavedChangesGuard],
    },
    {
        path: ':id/edit',
        component: RuleFormComponent,
        canDeactivate: [unsavedChangesGuard],
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class RulesRoutingModule {}
