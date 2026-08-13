import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DatamodelListComponent } from './datamodel-list/datamodel-list.component';
import { DatamodelCreateComponent } from './datamodel-create/datamodel-create.component';

const routes: Routes = [
    {
        path: '',
        component: DatamodelListComponent,
    },
    {
        path: 'create',
        component: DatamodelCreateComponent,
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class DatamodelRoutingModule {}
