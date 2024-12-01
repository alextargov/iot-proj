import { NgModule } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { MatToolbarModule } from '@angular/material/toolbar'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { NgxBlocklyComponent1 } from './ngx-blockly/ngx-blockly.component'
import { MaterialModule } from '../material.module'
import { AppRoutingModule } from 'src/app/app-routing.module'
import { ContentHeaderComponent } from './content-header/content-header.component'

import 'blockly/blocks'
import { NgxBlocklyModule } from 'ngx-blockly'
import {LoginDialogComponent} from "./login/login-dialog.component";
import {ReactiveFormsModule} from "@angular/forms";

@NgModule({
    imports: [
        MatIconModule,
        MatToolbarModule,
        BrowserAnimationsModule,
        BrowserModule,
        MaterialModule,
        AppRoutingModule,
        NgxBlocklyModule,
        ReactiveFormsModule
    ],
    declarations: [NgxBlocklyComponent1, ContentHeaderComponent, LoginDialogComponent],
    exports: [NgxBlocklyComponent1, ContentHeaderComponent, LoginDialogComponent],
})
export class ComponentsModule {}
