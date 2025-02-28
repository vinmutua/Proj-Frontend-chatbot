// Base User Interface
export interface User {
    id: string;
    email: string;
    firstName?: string;
    photoUrl?: string;
}

// Authentication Interfaces
export interface AuthResponse {
    token: string;
    user: User;
}

export interface LoginData {
    email: string;
    password: string;
    remember?: boolean;
}

export interface SignupData {
    email: string;
    password: string;
    confirmPassword: string;
    terms: boolean;
}

// Google Authentication Interfaces
export interface GoogleAuthData {
    googleId: string;
    email: string;
    name: string;
    photoUrl: string;
    idToken: string;
}

// Single GoogleUser interface combining both definitions
export interface GoogleUser {
    getBasicProfile(): {
        getId(): string;
        getEmail(): string;
        getName(): string;
        getImageUrl(): string;
    };
    getAuthResponse(): {
        id_token: string;
    };
}
export interface AuthError {
    message: string;
    code: string;
    status: number;
  }