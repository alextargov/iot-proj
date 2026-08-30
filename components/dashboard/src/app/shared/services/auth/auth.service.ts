import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AppConfigService } from '../app-config/app-config.service';
import { ApiService } from '../api/api.service';

export type Role = 'ADMIN' | 'OPERATOR' | 'VIEWER';

// Role hierarchy rank used for @hasRole-style checks (higher = more privileged).
const ROLE_RANK: Record<Role, number> = {
    ADMIN: 3,
    OPERATOR: 2,
    VIEWER: 1,
};

interface ILoginResponse {
    id: string;
    token: string;
    username: string;
    role: Role;
    createdAt: Date;
    updatedAt: Date;
}

interface StoredUser {
    name: string;
    token: string;
    userId: string;
    role: Role;
    createdAt: Date;
}

interface JwtPayload {
    Username: string;
    Role?: Role;
    exp: number;
    iat: number;
    iss: string;
}

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private isAuthenticated = false;
    private redirectUrl: string | null = null;
    private authToken: string | null = null;

    private readonly TOKEN_KEY = 'token_Data';
    private readonly USER_DATA_KEY = 'user_Data';
    private readonly SESSION_EXPIRY_KEY = 'sessionExpiryData';
    private readonly SESSION_DURATION = 5 * 24 * 60 * 60 * 1000;

    private readonly apiURLUserLogin: string;
    private readonly apiURLUserRegister: string;

    constructor(
        private readonly apiService: ApiService,
        private readonly router: Router,
        private readonly appConfigService: AppConfigService
    ) {
        this.apiURLUserLogin = this.appConfigService.get('APP_LOGIN_URL');
        this.apiURLUserRegister = this.appConfigService.get('APP_REGISTER_URL');
    }

    public loginUser(
        username: string,
        password: string
    ): Observable<ILoginResponse> {
        return this.apiService
            .request<ILoginResponse>(this.apiURLUserLogin, {
                method: 'POST',
                data: { username, password },
            })
            .pipe(
                tap((user) => {
                    if (!user) {
                        return;
                    }

                    this.setUserSession(user);
                })
            );
    }

    public isLoggedIn(): boolean {
        this.checkSessionExpiry();
        this.authToken = this.getToken();
        return !!this.authToken;
    }

    public getToken(): string | null {
        const token =
            sessionStorage.getItem(this.TOKEN_KEY) ||
            localStorage.getItem(this.TOKEN_KEY);

        if (token && this.isTokenExpired(token)) {
            console.warn('JWT token is expired, clearing session');
            this.logout();
            return null;
        }

        return token;
    }

    public logout(): void {
        this.removeStorageItem(this.TOKEN_KEY);
        this.removeStorageItem(this.USER_DATA_KEY);
        sessionStorage.removeItem(this.SESSION_EXPIRY_KEY);
        this.clearSessionStorage();
        this.isAuthenticated = false;
        this.authToken = null;
    }

    private decodeJwtPayload(token: string): JwtPayload | null {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                return null;
            }

            // Decode base64url payload
            const payload = parts[1];
            const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );

            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error('Failed to decode JWT:', e);
            return null;
        }
    }

    private isTokenExpired(token: string): boolean {
        const payload = this.decodeJwtPayload(token);
        if (!payload || !payload.exp) {
            // If we can't decode or no exp, assume expired
            return true;
        }

        // exp is in seconds, Date.now() is in milliseconds
        const now = Math.floor(Date.now() / 1000);
        const isExpired = payload.exp < now;

        if (isExpired) {
            const expDate = new Date(payload.exp * 1000);
            console.warn(`Token expired at: ${expDate.toISOString()}`);
        }

        return isExpired;
    }

    private setUserSession(user: ILoginResponse): void {
        if (user.token) {
            const data: StoredUser = {
                name: user.username,
                token: user.token,
                userId: user.id,
                role: user.role,
                createdAt: user.createdAt,
            };
            this.authToken = user.token;
            this.setStorageItem(this.TOKEN_KEY, user.token);
            this.setStorageItem(this.USER_DATA_KEY, JSON.stringify(data));
            this.setSessionExpiry();
            this.isAuthenticated = true;
        } else {
            console.error('User token is undefined');
            this.isAuthenticated = false;
        }
    }

    /** Returns the persisted current user, or null if not logged in. */
    public getCurrentUser(): StoredUser | null {
        const raw =
            sessionStorage.getItem(this.USER_DATA_KEY) ||
            localStorage.getItem(this.USER_DATA_KEY);
        if (!raw) {
            return null;
        }
        try {
            return JSON.parse(raw) as StoredUser;
        } catch {
            return null;
        }
    }

    /** Returns the current user's display name, or null. */
    public getCurrentUsername(): string | null {
        return this.getCurrentUser()?.name ?? null;
    }

    /**
     * Returns the current user's role. Prefers the persisted user data and
     * falls back to the role claim embedded in the JWT.
     */
    public getCurrentUserRole(): Role | null {
        const stored = this.getCurrentUser();
        if (stored?.role) {
            return stored.role;
        }
        const token = this.getToken();
        if (token) {
            return this.decodeJwtPayload(token)?.Role ?? null;
        }
        return null;
    }

    /**
     * Reports whether the current user has at least the given role, using the
     * ADMIN > OPERATOR > VIEWER hierarchy.
     */
    public hasRole(minimum: Role): boolean {
        const role = this.getCurrentUserRole();
        if (!role) {
            return false;
        }
        return ROLE_RANK[role] >= ROLE_RANK[minimum];
    }

    private setStorageItem(key: string, value: string): void {
        localStorage.setItem(key, value);
        sessionStorage.setItem(key, value);
    }

    private removeStorageItem(key: string): void {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    }

    private setSessionExpiry(): void {
        const expiryTime = new Date().getTime() + this.SESSION_DURATION;
        sessionStorage.setItem(this.SESSION_EXPIRY_KEY, expiryTime.toString());
    }

    private checkSessionExpiry(): void {
        const expiryTime = sessionStorage.getItem(this.SESSION_EXPIRY_KEY);
        if (expiryTime) {
            const currentTime = new Date().getTime();
            if (currentTime >= +expiryTime) {
                this.logout();
            }
        }
    }

    private clearSessionStorage(): void {
        sessionStorage.clear();
    }
}
