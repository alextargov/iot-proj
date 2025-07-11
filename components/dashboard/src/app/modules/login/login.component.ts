import {
    Component,
    OnInit,
} from '@angular/core'
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {AuthService} from "../../shared/services/auth/auth.service";
import {EventBusService} from "../../shared/services/eventbus/eventbus.service";
import {ToastrService} from "../../shared/services/toastr/toastr.service";
import {Router} from "@angular/router";

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
    loginForm: FormGroup;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private eventBusService: EventBusService,
        private toast: ToastrService,
        private router: Router,
    ) {
        this.loginForm = this.fb.group({
            username: ['', [Validators.required]],
            password: ['', [Validators.required]],
        });
    }

    onSubmit() {
        if (this.loginForm.invalid) {
            return;
        }

        this.authService.loginUser(this.loginForm.get("username").value, this.loginForm.get("password").value)
            .subscribe({
                next: () => {
                    this.eventBusService.emit('onLoginChange', {});
                    this.router.navigate(['/dashboard']);
                },
                error: () => {
                    this.toast.showError("An error has occurred while logging in!.");
                },
            })
    }

    ngOnInit(): void {
    }
}
