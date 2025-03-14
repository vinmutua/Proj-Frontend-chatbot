import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import {
  LoginData,
  SignupData,
  User,
  TokenResponse,
  AuthError,  
} from '../interfaces/user.interface';
import { environment } from '../../environments/environment';
import { TokenService } from '../services/token.service';
import { AUTH_CONFIG, AUTH_ENDPOINTS } from '../core/constants/auth.constants';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient,
    private router: Router,
    private tokenService: TokenService
  ) {
    this.initializeSessionManagement();
  }

  private readonly environment = environment;
  private readonly API_URL = environment.apiUrl;
  private readonly AUTH_ENDPOINTS = {
    signup: `${this.API_URL}${this.environment.auth.endpoints['signup']}`,
    login: `${this.API_URL}${this.environment.auth.endpoints['login']}`,
    logout: `${this.API_URL}${this.environment.auth.endpoints['logout']}`,
    refreshToken: `${this.API_URL}${this.environment.auth.endpoints['refresh']}`,
    // Keep these as they are if you don't have environment config for them
    forgotPassword: `${this.API_URL}/auth/forgot-password`,
    resetPassword: `${this.API_URL}/auth/reset-password`,
    verifyEmail: `${this.API_URL}/auth/verify-email`
  };

  private readonly httpOptions = {
    withCredentials: true,
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private authState = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.authState.asObservable();
  private refreshTokenTimeout: any;

  // Traditional Signup
  async traditionalSignup(userData: SignupData): Promise<void> {
    try {
      const { confirmPassword, terms, ...signupData } = userData;
      
      const response = await firstValueFrom(
        this.http.post<TokenResponse>(
          this.AUTH_ENDPOINTS.signup, 
          signupData,
          this.httpOptions
        )
      );
      this.handleAuthentication(response);
    } catch (error) {
      console.error('Signup error:', error);
      throw this.handleError(error);
    }
  }

  // Traditional Login
  async traditionalLogin(loginData: LoginData): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.post<TokenResponse>(
          this.AUTH_ENDPOINTS.login, 
          loginData,
          this.httpOptions
        )
      );
      this.handleAuthentication(response);

      if (loginData.remember) {
        this.setupPersistentSession();
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleAuthentication(response: TokenResponse): void {
    this.tokenService.setTokens(response);
    this.currentUserSubject.next(response.user);
    this.authState.next(true);
    
    setTimeout(() => {
        this.startRefreshTokenTimer(response.expiresIn);
    }, AUTH_CONFIG.INITIAL_REFRESH_DELAY);
  }

  private initializeSessionManagement(): void {
    fromEvent(document, 'visibilitychange').subscribe(() => {
      if (!document.hidden) {
        this.checkAuthentication();
      }
    });
  }

  private checkAuthentication(): void {
    const accessToken = this.tokenService.getAccessToken();
    if (!accessToken) {
      this.logout();
    }
  }

  private startRefreshTokenTimer(expiresIn: number): void {
    this.stopRefreshTokenTimer();
    const refreshTime = (expiresIn - 60) * 1000;
    
    this.refreshTokenTimeout = setTimeout(async () => {
      if (this.tokenService.isTokenValid()) {
        try {
          await this.refreshToken();
        } catch (error) {
          this.handleRefreshError(error);
        }
      }
    }, refreshTime);
  }

  private stopRefreshTokenTimer(): void {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }
  }

  async refreshToken(): Promise<void> {
    const refreshToken = this.tokenService.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await firstValueFrom(
        this.http.post<TokenResponse>(
          this.AUTH_ENDPOINTS.refreshToken,
          { refreshToken },
          this.httpOptions
        )
      );
      this.handleRefreshToken(response);
    } catch (error) {
      this.handleRefreshError(error);
    }
  }

  private handleRefreshToken(response: TokenResponse): void {
    this.tokenService.setTokens(response);
  }

  private handleRefreshError(error: any): void {
    console.error('Token refresh failed:', error);
    this.tokenService.clearTokens();
    this.currentUserSubject.next(null);
    this.authState.next(false);
    this.router.navigate(['/login']);
  }

  async logout(skipApi: boolean = false): Promise<void> {
    try {
      if (!skipApi && this.tokenService.isAuthenticated()) {
        try {
          await firstValueFrom(
            this.http.post<void>(
              AUTH_ENDPOINTS.LOGOUT,
              {},
              {
                headers: new HttpHeaders({
                  'Authorization': `Bearer ${this.tokenService.getAccessToken()}`
                })
              }
            )
          );
        } catch (error) {
          console.warn('Logout API call failed:', error);
        }
      }
    } finally {
      this.tokenService.clearTokens();
      this.currentUserSubject.next(null);
      this.authState.next(false);
      await this.router.navigate(['/login']);
    }
  }

  getToken(): string | null {
    return this.tokenService.getAccessToken();
  }

  isLoggedIn(): boolean {
    return this.authState.value && this.tokenService.isTokenValid();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  private handleError(error: any): never {
    const authError: AuthError = {
      message: error.error?.message || 'An unknown error occurred',
      code: error.error?.code || 'UNKNOWN_ERROR',
      status: error.status || 500
    };
    throw authError;
  }

  private setupPersistentSession(): void {
    const refreshToken = this.tokenService.getRefreshToken();
    if (refreshToken) {
      this.tokenService.setRefreshToken(refreshToken);
    }
  }
}
