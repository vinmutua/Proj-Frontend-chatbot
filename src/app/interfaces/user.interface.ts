/**
 * Core user data structure
 */
export interface User {
    id: string;
    email: string;
    // Removed name as it's not essential
    photoUrl?: string;    // Optional for both auth methods
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

export interface AuthFormError {
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
    general?: string;
}

// Google Authentication Interfaces
export interface GoogleAuthData {
    email: string;
    idToken: string;      // Required for verification
    googleId: string;     // Required for user identification
}

export interface GoogleProfile {
    getId(): string;
    getEmail(): string;
    getImageUrl(): string;
}

export interface GoogleAuthResponse {
    id_token: string;
}

export interface GoogleUser {
    getBasicProfile(): GoogleProfile;
    getAuthResponse(): GoogleAuthResponse;
}

/**
 * Represents the response from token-based authentication
 */
export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: User;
}

export type TokenType = 'access' | 'refresh';

export interface TokenData {
    token: string;
    type: TokenType;
    expiresAt: number;
}

export interface TokenPair {
    accessToken: TokenData;
    refreshToken: TokenData;
}

// Token-related error types
export type TokenErrorCode = 
    | 'TOKEN_EXPIRED'
    | 'INVALID_TOKEN'
    | 'REFRESH_FAILED'
    | 'NETWORK_ERROR';

export interface TokenError {
    code: TokenErrorCode;
    message: string;
    tokenType?: TokenType;
}

export type ErrorCode = 
    | 'INVALID_CREDENTIALS'
    | 'EMAIL_NOT_VERIFIED'
    | 'ACCOUNT_DISABLED'
    | 'RATE_LIMIT_EXCEEDED'
    | 'NETWORK_ERROR'  // Add this
    | 'UNKNOWN_ERROR';

export type GoogleAuthErrorCode = 
    | 'GOOGLE_INIT_FAILED'
    | 'GOOGLE_SIGNIN_CANCELLED'
    | 'GOOGLE_PROFILE_ERROR'
    | 'POPUP_BLOCKED'
    | 'NETWORK_ERROR';

export interface AuthError {
    message: string;
    code: ErrorCode | GoogleAuthErrorCode; // Update this
    status: number;
    details?: any;
}

export interface GoogleAuthError {
    message: string;
    code: GoogleAuthErrorCode;
    status: number;
    details?: any;
}

export function isTokenResponse(obj: any): obj is TokenResponse {
    return (
        typeof obj === 'object' &&
        typeof obj.accessToken === 'string' &&
        typeof obj.refreshToken === 'string' &&
        typeof obj.expiresIn === 'number' &&
        obj.user && typeof obj.user.id === 'string'
    );
}