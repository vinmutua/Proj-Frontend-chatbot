import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { AuthResponse, LoginData, SignupData, GoogleAuthData, User, GoogleUser,AuthError } from '../interfaces/user.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private readonly AUTH_ENDPOINTS = {
    signup: `${this.API_URL}/auth/signup`,
    login: `${this.API_URL}/auth/login`,
    googleLogin: `${this.API_URL}/auth/google`,
    logout: `${this.API_URL}/auth/logout`,
    refreshToken: `${this.API_URL}/auth/refresh-token`,
    forgotPassword: `${this.API_URL}/auth/forgot-password`,
    resetPassword: `${this.API_URL}/auth/reset-password`,
    verifyEmail: `${this.API_URL}/auth/verify-email`
  };
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isAuthenticated = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadStoredUser();
    //this.initGoogleAuth(); // Initialize Google Auth if needed
  }

  private loadStoredUser(): void {
    const storedUser = localStorage.getItem(this.USER_KEY);
    const storedToken = localStorage.getItem(this.TOKEN_KEY);
    if (storedUser && storedToken) {
      this.currentUserSubject.next(JSON.parse(storedUser));
      this.isAuthenticated.next(true);
    }
  }

  async signup(userData: SignupData): Promise<AuthResponse> {
    return firstValueFrom(
      this.http.post<AuthResponse>(this.AUTH_ENDPOINTS.signup, userData)
    );
  }

  async login(email: string, password: string): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(this.AUTH_ENDPOINTS.login, { email, password })
      );
      this.handleAuthentication(response);
    } catch (error) {
      throw new Error('Login failed. Please check your credentials.');
    }
  }

  async googleLogin(googleData: GoogleAuthData): Promise<AuthResponse> {
    return firstValueFrom(
      this.http.post<AuthResponse>(this.AUTH_ENDPOINTS.googleLogin, googleData)
    );
  }

  async initGoogleAuth(): Promise<void> {
    if (!environment.googleClientId) {
      throw new Error('Google Client ID is not configured');
    }
  
    return new Promise<void>((resolve) => {
      window.gapi.load('auth2', () => {
        window.gapi.auth2
          .init({
            client_id: environment.googleClientId,
            scope: 'email profile'
          })
          .then(() => resolve());
      });
    });
  }

  async googleSignIn(): Promise<void> {
    try {
      const googleAuth = window.gapi.auth2.getAuthInstance();
      const googleUser = await googleAuth.signIn();
      const profile = googleUser.getBasicProfile();
      
      const googleAuthData: GoogleAuthData = {
        googleId: profile.getId(),
        email: profile.getEmail(),
        name: profile.getName(),
        photoUrl: profile.getImageUrl(),
        idToken: googleUser.getAuthResponse().id_token
      };
  
      const response = await this.googleLogin(googleAuthData);
      this.handleAuthentication(response);
    } catch (error) {
      this.handleError(error);
    }
  }

  async refreshToken(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(this.AUTH_ENDPOINTS.refreshToken, {})
      );
      this.handleAuthentication(response);
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleAuthentication(response: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
    this.currentUserSubject.next(response.user);
    this.isAuthenticated.next(true);
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post<void>(this.AUTH_ENDPOINTS.logout, {}));
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      this.currentUserSubject.next(null);
      this.isAuthenticated.next(false);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
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
}
