import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentsModule } from './shared/components/components.module';
import { MaterialModule } from './shared/material.module';
import { CoreModule } from './core/core.module';

import { SharedModule } from './shared/shared.module';
import { HttpClientModule } from '@angular/common/http';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';

@NgModule({
    declarations: [AppComponent],
    imports: [
        BrowserModule,
        AppRoutingModule,
        HttpClientModule,

        SharedModule,
        CoreModule,
        BrowserAnimationsModule,
        ComponentsModule,
        MaterialModule,

        MonacoEditorModule.forRoot({
            baseUrl: '/assets/monaco-editor/min/vs',
        }),
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
