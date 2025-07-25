import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import {AuthService} from "../services/auth/auth.service";


@Injectable({ providedIn: 'root' })
export class LoginGuard implements CanActivate {
    constructor(
        private router: Router,
        private authService: AuthService
    ) {}

    canActivate() {
        const isLoggedIn = this.authService.isLoggedIn();
        if (!isLoggedIn) {
            return true;
        }

        this.router.navigate(['/']);
        return false;
    }
}
