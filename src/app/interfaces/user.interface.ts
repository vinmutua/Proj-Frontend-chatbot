/**
 * Core user data structure
 */
export interface User {
    id: string;
    email: string;
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
    confirmPassword?: string;  
    terms: boolean;           
}

export interface AuthFormError {
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
    general?: string;
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
    | 'NETWORK_ERROR'
    | 'UNKNOWN_ERROR';

export interface AuthError {
    message: string;
    code: ErrorCode;
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

export interface Environment {
    production: boolean;
    apiUrl: string;
    encryptionKey: string;
    auth: {
        tokenRefreshInterval: number;
        sessionTimeout: number;
        refreshTokenPath: string;
        loginPath: string;
        signupPath: string;
        logoutPath: string;
        tokenStorage: {
            accessToken: string;
            refreshToken: string;
        };
        endpoints: {
            [key: string]: string;
        };
    };
}