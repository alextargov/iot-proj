import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../shared/services/auth/auth.service';
import { EventBusService } from '../../shared/services/eventbus/eventbus.service';
import { ToastrService } from '../../shared/services/toastr/toastr.service';
import { Router } from '@angular/router';

@Component({
    standalone: false,
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
    loginForm: FormGroup;
    public loading = false;
    public hidePassword = true;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private eventBusService: EventBusService,
        private toast: ToastrService,
        private router: Router
    ) {
        this.loginForm = this.fb.group({
            username: ['', [Validators.required]],
            password: ['', [Validators.required]],
        });
    }

    onSubmit() {
        if (this.loginForm.invalid || this.loading) {
            return;
        }

        this.loading = true;
        this.authService
            .loginUser(
                this.loginForm.get('username').value,
                this.loginForm.get('password').value
            )
            .subscribe({
                next: () => {
                    this.loading = false;
                    this.eventBusService.emit('onLoginChange', {});
                    this.router.navigate(['/dashboard']);
                },
                error: (err) => {
                    this.loading = false;
                    const status = err?.networkError?.status ?? err?.status;
                    if (status === 401 || status === 403) {
                        this.toast.showError('Invalid username or password');
                    } else {
                        this.toast.showError(
                            'Could not sign in. Please try again.'
                        );
                    }
                },
            });
    }
}
