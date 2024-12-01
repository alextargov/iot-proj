import { BreakpointObserver } from '@angular/cdk/layout'
import { Component, ViewChild } from '@angular/core'
import { NavigationEnd, Router } from '@angular/router'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import {
    Button,
    Category,
    COLOUR_CATEGORY,
    CustomBlock,
    FUNCTIONS_CATEGORY,
    Label,
    LISTS_CATEGORY,
    LOGIC_CATEGORY,
    LOOP_CATEGORY,
    MATH_CATEGORY,
    NgxBlocklyComponent,
    NgxBlocklyConfig,
    NgxBlocklyGenerator,
    NgxBlocklyToolbox,
    Separator,
    TEXT_CATEGORY,
    VARIABLES_CATEGORY,
    Blockly,
} from 'ngx-blockly'
import {delay, filter, forkJoin} from 'rxjs'
import {LoginDialogComponent} from "./shared/components/login/login-dialog.component";
import {MatDialog} from "@angular/material/dialog";
import {AuthService} from "./shared/services/auth/auth.service";
import {EventBusService} from "./shared/services/eventbus/eventbus.service";

@UntilDestroy()
@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent {
    title = 'dashboard'
    public isLoggedIn: boolean = false

    public readOnly = false
    constructor(
        private authService: AuthService,
        private eventBusService: EventBusService,
        private observer: BreakpointObserver,
        private router: Router,
        private dialog: MatDialog,
    ) {}

    ngOnInit(): void {
        this.isLoggedIn = this.authService.isLoggedIn();

        this.eventBusService.on('onLoginChange').subscribe({
            next: () => {
                this.isLoggedIn = this.authService.isLoggedIn();
                console.log(this.isLoggedIn);
            }
        })
    }

    ngAfterViewInit(): void {
        this.observer
            .observe(['(max-width: 800px)'])
            .pipe(delay(1), untilDestroyed(this))
            .subscribe((res) => {})

        this.router.events
            .pipe(
                untilDestroyed(this),
                filter((e) => e instanceof NavigationEnd)
            )
            .subscribe(() => {})
    }

    onCode(code: string) {
        console.log(code)
    }

    public onLoginClick(): void {
        const dialogRef = this.dialog.open(LoginDialogComponent, {
            width: '400px',
            disableClose: true
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                console.log('Dialog closed with result:', result);
                // Handle login logic here
            }
        });
    }

    public onLogoutClick(): void {
        this.authService.logout();
        this.eventBusService.emit('onLoginChange', {});
    }
}
