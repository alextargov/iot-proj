import { Injectable } from '@angular/core';
import {
    Router,
    CanActivate,
    ActivatedRouteSnapshot,
    RouterStateSnapshot,
} from '@angular/router';
import { AuthService, Role } from '../services/auth/auth.service';

/**
 * RoleGuard restricts a route to users with at least the role listed in the
 * route's `data.minimumRole`. Unauthenticated users are sent to /login;
 * authenticated-but-under-privileged users are sent to /home.
 *
 * Usage in a routing module:
 *   { path: 'create', component: FooComponent, canActivate: [RoleGuard],
 *     data: { minimumRole: 'OPERATOR' } }
 */
@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
    constructor(private router: Router, private authService: AuthService) {}

    canActivate(route: ActivatedRouteSnapshot, _state: RouterStateSnapshot) {
        if (!this.authService.isLoggedIn()) {
            this.router.navigate(['/login']);
            return false;
        }

        const minimumRole = route.data['minimumRole'] as Role | undefined;
        if (!minimumRole || this.authService.hasRole(minimumRole)) {
            return true;
        }

        // Authenticated but insufficient role.
        this.router.navigate(['/home']);
        return false;
    }
}
