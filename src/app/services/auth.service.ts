import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
import { TokenService } from '../services/token.service';
import { AUTH_CONFIG, AUTH_ENDPOINTS } from '../core/constants/auth.constants';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Core properties
  private readonly API_URL = environment.apiUrl;
  private readonly AUTH_ENDPOINTS = {
    signup: `${this.API_URL}/users/signup`,
    login: `${this.API_URL}/users/login`,
    googleLogin: `${this.API_URL}/users/google`,
    googleSignup: `${this.API_URL}/users/google/signup`,
    logout: `${this.API_URL}/users/logout`,
    refreshToken: `${this.API_URL}/users/refresh-token`,
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

  private readonly GOOGLE_INIT_RETRIES = 3;
  private readonly GOOGLE_INIT_RETRY_DELAY = 1000;
  private isGoogleInitialized = false;

  // State management
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private authState = new BehaviorSubject<boolean>(false);  // Rename this
  public isAuthenticated$ = this.authState.asObservable();  // Add this
  private refreshTokenTimeout: any;

  constructor(
    private http: HttpClient,
    private router: Router,
    private tokenService: TokenService
  ) {
    this.initializeSessionManagement();
  }

  // ==================
  // Sign Up Methods
  // ==================

  // Traditional Signup
  async traditionalSignup(userData: SignupData): Promise<void> {
    try {
      // Remove confirmPassword and terms before sending to backend
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
      console.error('Signup error:', error); // Add this for debugging
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
        this.http.post<TokenResponse>(
          this.AUTH_ENDPOINTS.login, 
          loginData,
          this.httpOptions
        )
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
        this.http.post<TokenResponse>(
          this.AUTH_ENDPOINTS.googleLogin, 
          googleData,
          this.httpOptions
        )
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
    // Store tokens
    this.tokenService.setTokens(response);

    // Update state
    this.currentUserSubject.next(response.user);
    this.authState.next(true);  // Updated

    // Add delay before starting refresh timer
    setTimeout(() => {
        this.startRefreshTokenTimer(response.expiresIn);
    }, AUTH_CONFIG.INITIAL_REFRESH_DELAY);
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
    const accessToken = this.tokenService.getAccessToken();
    if (!accessToken) {
      this.logout();
    }
  }

  // Token Refresh Methods
  private startRefreshTokenTimer(expiresIn: number): void {
    this.stopRefreshTokenTimer();
    
    // Calculate next refresh time (1 minute before expiry)
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
    // ... rest of the code
  }

  private handleRefreshError(error: any): void {
    console.error('Token refresh failed:', error);
    this.tokenService.clearTokens();
    this.currentUserSubject.next(null);
    this.authState.next(false);
    this.router.navigate(['/login']);
  }

  // Utility Methods
  async logout(skipApi: boolean = false): Promise<void> {
    try {
        // Only make API call if we have a valid token
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
                // Ignore logout API errors
                console.warn('Logout API call failed:', error);
            }
        }
    } finally {
        // Always clear local state
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

  // Add method for persistent sessions
  private setupPersistentSession(): void {
    const refreshToken = this.tokenService.getRefreshToken();
    if (refreshToken) {
      this.tokenService.setRefreshToken(refreshToken);
    }
  }
}
