import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { WidgetCreateComponent } from './widget-create/widget-create.component'
import { WidgetDetailsComponent } from './widget-details/widget-details.component'
import { WidgetsComponent } from './widget-list/widgets.component'

const routes: Routes = [
    {
        path: 'widgets',
        children: [
            {
                path: '',
                component: WidgetsComponent,
            },
            {
                path: 'create',
                pathMatch: 'full',
                component: WidgetCreateComponent,
            },
            {
                path: ':id',
                component: WidgetDetailsComponent,
            },
        ],
    },
]

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class WidgetsRoutingModule {}
