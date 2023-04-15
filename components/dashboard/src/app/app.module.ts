import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'

import { AppRoutingModule } from './app-routing.module'
import { AppComponent } from './app.component'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { ComponentsModule } from './shared/components/components.module'
import { MaterialModule } from './shared/material.module'
import { CoreModule } from './core/core.module'

import { DashboardModule } from './modules/dashboard/dashboard.module'
import { SharedModule } from './shared/shared.module'
import { ProfileModule } from './modules/profile/profile.module'
import { WidgetsModule } from './modules/widgets/widgets.module'
import { DevicesListComponent } from './modules/devices/devices-list/devices-list.component'
import { DevicesModule } from './modules/devices/devices.module'
import { HttpClientModule } from '@angular/common/http'
import { ToastrModule } from 'ngx-toastr'

@NgModule({
    declarations: [AppComponent],
    imports: [
        BrowserModule,
        AppRoutingModule,
        HttpClientModule,

        SharedModule,
        DashboardModule,
        ProfileModule,
        WidgetsModule,
        DevicesModule,

        CoreModule,
        BrowserAnimationsModule,
        ComponentsModule,
        MaterialModule,
    ],
    providers: [
        {
            provide: 'app.config',
            // tslint:disable-next-line no-string-literal
            useFactory: () => window['_env_'],
        },
    ],
    exports: [],
    bootstrap: [AppComponent],
})
export class AppModule {}
