import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { 
  AuthResponse, 
  LoginData, 
  SignupData, 
  GoogleAuthData, 
  User, 
  TokenResponse,
  AuthError,  // Add this import
  ErrorCode,   // Add this import
  GoogleAuthError,    // Add this
  GoogleAuthErrorCode // Add this
} from '../interfaces/user.interface';
import { environment } from '../../environments/environment';
import { CookieService } from './cookie.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Core properties
  private readonly API_URL = environment.apiUrl;
  private readonly AUTH_ENDPOINTS = {
    signup: `${this.API_URL}/auth/signup`,
    login: `${this.API_URL}/auth/login`,
    googleLogin: `${this.API_URL}/auth/google`,
    googleSignup: `${this.API_URL}/auth/google/signup`,
    logout: `${this.API_URL}/auth/logout`,
    refreshToken: `${this.API_URL}/auth/refresh-token`,
    forgotPassword: `${this.API_URL}/auth/forgot-password`,
    resetPassword: `${this.API_URL}/auth/reset-password`,
    verifyEmail: `${this.API_URL}/auth/verify-email`
  };
  
  private readonly GOOGLE_INIT_RETRIES = 3;
  private readonly GOOGLE_INIT_RETRY_DELAY = 1000;
  private isGoogleInitialized = false;

  // State management
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isAuthenticated = new BehaviorSubject<boolean>(false);
  private refreshTokenTimeout: any;

  constructor(
    private http: HttpClient,
    private router: Router,
    private cookieService: CookieService
  ) {
    this.initializeSessionManagement();
  }

  // ==================
  // Sign Up Methods
  // ==================

  // Traditional Signup
  async traditionalSignup(userData: SignupData): Promise<void> {
    try {
        const response = await firstValueFrom(
            this.http.post<TokenResponse>(this.AUTH_ENDPOINTS.signup, userData)
        );
        // Handle authentication immediately
        this.handleAuthentication(response);
    } catch (error) {
        throw this.handleError(error);
    }
  }

  // ==================
  // Login Methods
  // ==================

  // Traditional Login
  async traditionalLogin(loginData: LoginData): Promise<void> {
    try {
        const response = await firstValueFrom(
            this.http.post<TokenResponse>(this.AUTH_ENDPOINTS.login, loginData)
        );
        this.handleAuthentication(response);
        
        // Handle "remember me" option
        if (loginData.remember) {
            this.setupPersistentSession();
        }
    } catch (error) {
        throw this.handleError(error);
    }
  }

  // Google Login
  private async googleLogin(googleData: GoogleAuthData): Promise<void> {
    try {
        const response = await firstValueFrom(
            this.http.post<TokenResponse>(this.AUTH_ENDPOINTS.googleLogin, googleData)
        );
        this.handleAuthentication(response);
    } catch (error) {
        throw this.handleError(error);
    }
  }

  // ==================
  // Google Auth Methods
  // ==================

  async initGoogleAuth(): Promise<void> {
    if (this.isGoogleInitialized) return;

    if (!environment.googleClientId) {
      throw this.handleError({
        error: {
          message: 'Google Client ID is not configured',
          code: 'GOOGLE_INIT_FAILED',
          status: 500
        }
      });
    }

    let retries = this.GOOGLE_INIT_RETRIES;
    
    while (retries > 0) {
      try {
        await new Promise<void>((resolve, reject) => {
          window.gapi.load('auth2', async () => {
            try {
              await window.gapi.auth2.init({
                client_id: environment.googleClientId,
                scope: 'email profile'
              });
              this.isGoogleInitialized = true;
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        });
        return;
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw this.handleError({
            error: {
              message: 'Failed to initialize Google Auth',
              code: 'GOOGLE_INIT_FAILED',
              status: 500
            }
          });
        }
        await new Promise(resolve => setTimeout(resolve, this.GOOGLE_INIT_RETRY_DELAY));
      }
    }
  }

  async googleSignIn(): Promise<void> {
    try {
        // Check and initialize Google Auth if needed
        if (!window.gapi?.auth2) {
            await this.initGoogleAuth();
        }

        const googleAuth = window.gapi.auth2.getAuthInstance();
        const googleUser = await googleAuth.signIn();
        const profile = googleUser.getBasicProfile();
        const authResponse = googleUser.getAuthResponse();
        
        if (!profile || !authResponse) {
            throw this.handleError({
                error: {
                    message: 'Failed to get Google profile',
                    code: 'GOOGLE_PROFILE_ERROR',
                    status: 400
                }
            });
        }

        const googleAuthData: GoogleAuthData = {
            googleId: profile.getId(),
            email: profile.getEmail(),
            idToken: authResponse.id_token
        };
    
        // Use single endpoint for Google auth
        await this.googleLogin(googleAuthData);
    } catch (error) {
        if (error instanceof Error) {
            switch (true) {
                case error.message.includes('popup_closed_by_user'):
                    throw this.handleError({
                        error: {
                            message: 'Google sign-in was cancelled',
                            code: 'GOOGLE_SIGNIN_CANCELLED',
                            status: 400
                        }
                    });
                case error.message.includes('popup_blocked_by_browser'):
                    throw this.handleError({
                        error: {
                            message: 'Popup blocked by browser. Please allow popups for this site',
                            code: 'POPUP_BLOCKED',
                            status: 400
                        }
                    });
                default:
                    throw this.handleError({
                        error: {
                            message: 'Google sign-in failed',
                            code: 'NETWORK_ERROR',
                            status: 500
                        }
                    });
            }
        }
        throw this.handleError(error);
    }
  }

  // ==================
  // Auth State Methods
  // ==================

  private handleAuthentication(response: TokenResponse): void {
    // Store tokens in HTTP-only cookies
    this.handleTokenResponse(response);
    
    // Update user state
    this.currentUserSubject.next(response.user);
    this.isAuthenticated.next(true);
    
    // Start token refresh cycle
    this.startRefreshTokenTimer(response.expiresIn);
  }

  private handleTokenResponse(response: TokenResponse): void {
    const now = Date.now();
    
    // Store access token in HTTP-only cookie
    this.cookieService.setCookie('access_token', response.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      path: '/',
      expires: new Date(now + response.expiresIn * 1000)
    });

    // Store refresh token in HTTP-only cookie
    this.cookieService.setCookie('refresh_token', response.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      path: '/auth',
      expires: new Date(now + 7 * 24 * 60 * 60 * 1000)
    });
  }

  // Session Management Methods
  private initializeSessionManagement(): void {
    fromEvent(document, 'visibilitychange').subscribe(() => {
      if (!document.hidden) {
        this.checkAuthentication();
      }
    });
  }

  private checkAuthentication(): void {
    const accessToken = this.cookieService.getCookie('access_token');
    if (!accessToken) {
      this.logout();
    }
  }

  // Token Refresh Methods
  private startRefreshTokenTimer(expiresIn: number): void {
    this.stopRefreshTokenTimer();
    const timeout = (expiresIn - 60) * 1000; // Refresh 1 minute before expiry
    this.refreshTokenTimeout = setTimeout(() => this.refreshToken(), timeout);
  }

  private stopRefreshTokenTimer(): void {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }
  }

  async refreshToken(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.post<TokenResponse>(this.AUTH_ENDPOINTS.refreshToken, {})
      );
      this.handleAuthentication(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Utility Methods
  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post<void>(this.AUTH_ENDPOINTS.logout, {}));
      this.cookieService.deleteCookie('access_token');
      this.cookieService.deleteCookie('refresh_token');
      this.currentUserSubject.next(null);
      this.isAuthenticated.next(false);
      this.stopRefreshTokenTimer();
      this.router.navigate(['/login']);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  getToken(): string | null {
    return this.cookieService.getCookie('access_token');
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated.value;
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

  // Add method for persistent sessions
  private setupPersistentSession(): void {
    this.cookieService.setCookie('refresh_token', this.cookieService.getCookie('refresh_token') || '', {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        path: '/auth',
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });
  }
}
