import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import {FormBuilder, UntypedFormGroup, Validators} from "@angular/forms";
import {AuthService} from "../../services/auth/auth.service";
import {ToastrService} from "../../services/toastr/toastr.service";
import {EventBusService} from "../../services/eventbus/eventbus.service";

@Component({
    selector: 'app-login-dialog',
    templateUrl: './login-dialog.component.html',
    styleUrls: ['./login-dialog.component.scss']
})
export class LoginDialogComponent {
    public readonly NAME_MAX_LENGTH = 128
    public loginFormGroup: UntypedFormGroup

    constructor(
        private readonly dialogRef: MatDialogRef<LoginDialogComponent>,
        private readonly formBuilder: FormBuilder,
        private readonly toast: ToastrService,
        private readonly authService: AuthService,
        private readonly eventBusService: EventBusService,
    ) {}

    public ngOnInit(): void {
        this.loginFormGroup = this.formBuilder.group({
            username: [
                '',
                [
                    Validators.required,
                    Validators.maxLength(this.NAME_MAX_LENGTH),
                ],
            ],
            password: [
                '',
            ]
        })
    }

    onSubmit(): void {
        if (this.loginFormGroup.invalid) {
            return;
        }

        this.authService.loginUser(this.loginFormGroup.get("username").value, this.loginFormGroup.get("password").value)
            .subscribe({
                next: () => {
                    this.eventBusService.emit('onLoginChange', {});
                    this.dialogRef.close();
                },
                error: () => {
                    this.toast.showError("An error has occurred while logging in!.");
                },
            })
    }
}
