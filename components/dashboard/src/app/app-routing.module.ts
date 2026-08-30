import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './shared/guards/auth.guard';
import { LoginGuard } from './shared/guards/login.guard';
import { RoleGuard } from './shared/guards/role.guard';

const routes: Routes = [
    {
        path: 'home',
        loadChildren: () =>
            import('./modules/home/home.module').then((m) => m.HomeModule),
        canActivate: [AuthGuard],
    },
    {
        path: 'dashboard',
        loadChildren: () =>
            import('./modules/dashboard/dashboard.module').then((m) => m.DashboardModule),
        canActivate: [AuthGuard],
    },
    {
        path: 'devices',
        loadChildren: () =>
            import('./modules/devices/devices.module').then((m) => m.DevicesModule),
        canActivate: [AuthGuard],
    },
    {
        path: 'widgets',
        loadChildren: () =>
            import('./modules/widgets/widgets.module').then((m) => m.WidgetsModule),
        canActivate: [AuthGuard],
    },
    {
        path: 'datamodel',
        loadChildren: () =>
            import('./modules/datamodel/datamodel.module').then((m) => m.DatamodelModule),
        canActivate: [AuthGuard],
    },
    {
        path: 'profile',
        loadChildren: () =>
            import('./modules/profile/profile.module').then((m) => m.ProfileModule),
        canActivate: [AuthGuard],
    },
    {
        path: 'alerts',
        loadChildren: () =>
            import('./modules/alerts/alerts.module').then((m) => m.AlertsModule),
        canActivate: [AuthGuard],
    },
    {
        path: 'rules',
        loadChildren: () =>
            import('./modules/rules/rules.module').then((m) => m.RulesModule),
        canActivate: [AuthGuard],
    },
    {
        path: 'integrations',
        loadChildren: () =>
            import('./modules/integrations/integrations.module').then(
                (m) => m.IntegrationsModule
            ),
        canActivate: [AuthGuard],
    },
    {
        path: 'admin',
        loadChildren: () =>
            import('./modules/admin/admin.module').then((m) => m.AdminModule),
        canActivate: [AuthGuard, RoleGuard],
        data: { minimumRole: 'ADMIN' },
    },
    {
        path: 'login',
        loadChildren: () =>
            import('./modules/login/login.module').then((m) => m.LoginModule),
        canActivate: [LoginGuard],
    },
    { path: '', redirectTo: '/home', pathMatch: 'full' },
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule],
})
export class AppRoutingModule {}
