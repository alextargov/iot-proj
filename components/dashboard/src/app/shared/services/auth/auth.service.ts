import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {AppConfigService} from "../app-config/app-config.service";
import {ApiService} from "../api/api.service";

interface ILoginResponse {
    id: string;
    token: string;
    username: string;
    createdAt: Date;
    updatedAt: Date;
}

// interface IUser {
//     id: string;
//     token: string;
//     username: string;
//     createdAt: Date;
//     updatedAt: Date;
// }

@Injectable({
    providedIn: 'root'
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
        private readonly appConfigService: AppConfigService,
    ) {
        this.apiURLUserLogin = this.appConfigService.get('APP_LOGIN_URL');
        this.apiURLUserRegister = this.appConfigService.get('APP_REGISTER_URL');
    }

    public loginUser(username: string, password: string): Observable<ILoginResponse> {
        return this.apiService.request<ILoginResponse>(this.apiURLUserLogin, { method: 'POST', data: {username, password }})
            .pipe(
                tap(user => {
                    if (!user) {
                        return
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
        return sessionStorage.getItem(this.TOKEN_KEY) || localStorage.getItem(this.TOKEN_KEY);
    }

    public logout(): void {
        this.removeStorageItem(this.TOKEN_KEY);
        this.removeStorageItem(this.USER_DATA_KEY);
        sessionStorage.removeItem(this.SESSION_EXPIRY_KEY);
        this.clearSessionStorage();
        this.isAuthenticated = false;
        this.authToken = null;
    }

    private setUserSession(user: ILoginResponse): void {
        if (user.token) {
            const data = {
                name: user.username,
                token: user.token,
                userId: user.id,
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
