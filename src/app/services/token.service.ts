import { Injectable } from '@angular/core';
import { TOKEN_KEYS,AUTH_ENDPOINTS } from '../core/constants/auth.constants';
import { TokenResponse } from '../interfaces/user.interface';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class TokenService {
    private storage: Storage = window.localStorage;
    private refreshTokenTimeout: any;

    constructor(private http: HttpClient) {}

    setTokens(response: TokenResponse): void {
        const now = Date.now();
        this.storage.setItem(TOKEN_KEYS.ACCESS_TOKEN, response.accessToken);
        this.storage.setItem(TOKEN_KEYS.REFRESH_TOKEN, response.refreshToken);
        this.storage.setItem(TOKEN_KEYS.EXPIRY, String(now + response.expiresIn * 1000));
        this.startRefreshTokenTimer(response.expiresIn);
    }

    setRefreshToken(token: string): void {
        this.storage.setItem(TOKEN_KEYS.REFRESH_TOKEN, token);
    }

    async refreshToken(refreshToken: string): Promise<void> {
        try {
            const response = await this.http.post<TokenResponse>(
                AUTH_ENDPOINTS.REFRESH,  // Now using the correct endpoint
                { refreshToken }
            ).toPromise();

            if (response) {
                this.setTokens(response);
            }
        } catch (error) {
            this.clearTokens();
            throw error;
        }
    }

    getAccessToken(): string | null {
        return this.storage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
    }

    getRefreshToken(): string | null {
        return this.storage.getItem(TOKEN_KEYS.REFRESH_TOKEN);
    }

    clearTokens(): void {
        this.storage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
        this.storage.removeItem(TOKEN_KEYS.REFRESH_TOKEN);
        this.storage.removeItem(TOKEN_KEYS.EXPIRY);
        this.stopRefreshTokenTimer();
    }

    isTokenValid(): boolean {
        const expiry = this.storage.getItem(TOKEN_KEYS.EXPIRY);
        return expiry ? Date.now() < Number(expiry) : false;
    }

    getAuthHeader(): string | null {
        const token = this.getAccessToken();
        return token ? `Bearer ${token}` : null;
    }

    isAuthenticated(): boolean {
        const token = this.getAccessToken();
        const expiry = localStorage.getItem(TOKEN_KEYS.EXPIRY);
        return !!(token && expiry && Date.now() < Number(expiry));
    }

    startRefreshTokenTimer(expiresIn: number): void {
        this.stopRefreshTokenTimer();
        const refreshTime = (expiresIn - 60) * 1000;
        
        this.refreshTokenTimeout = setTimeout(async () => {
            if (this.isTokenValid()) {
                try {
                    await this.refreshToken(this.getRefreshToken()!);
                } catch (error) {
                    this.clearTokens();
                    throw error;
                }
            }
        }, refreshTime);
    }

    private stopRefreshTokenTimer(): void {
        if (this.refreshTokenTimeout) {
            clearTimeout(this.refreshTokenTimeout);
        }
    }
}
