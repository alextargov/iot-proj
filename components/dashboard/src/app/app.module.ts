import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentsModule } from './shared/components/components.module';
import { MaterialModule } from './shared/material.module';
import { CoreModule } from './core/core.module';

import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SharedModule } from './shared/shared.module';
import { ProfileModule } from './modules/profile/profile.module';
import { WidgetsModule } from './modules/widgets/widgets.module';

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,

    SharedModule,
    DashboardModule,
    ProfileModule,
    WidgetsModule,

    CoreModule,
    BrowserAnimationsModule,
    ComponentsModule,
    MaterialModule,
  ],
  providers: [],
  exports: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
