import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RulesListComponent } from './rules-list/rules-list.component';
import { RuleFormComponent } from './rule-form/rule-form.component';

const routes: Routes = [
    { path: '', component: RulesListComponent },
    { path: 'create', component: RuleFormComponent },
    { path: ':id/edit', component: RuleFormComponent },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class RulesRoutingModule {}
