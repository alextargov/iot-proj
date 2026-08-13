import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WidgetCreateComponent } from './widget-create/widget-create.component';
import { WidgetDetailsComponent } from './widget-details/widget-details.component';
import { WidgetsComponent } from './widget-list/widgets.component';

const routes: Routes = [
    {
        path: '',
        component: WidgetsComponent,
    },
    {
        path: 'create',
        component: WidgetCreateComponent,
    },
    {
        path: ':id',
        component: WidgetDetailsComponent,
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class WidgetsRoutingModule {}
