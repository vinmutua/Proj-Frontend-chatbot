import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap, delay, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Provider } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, retryWhen, firstValueFrom } from 'rxjs';
import { TokenService } from '../services/token.service';
import { PUBLIC_ENDPOINTS, AUTH_ENDPOINTS } from '../core/constants/auth.constants';  // Updated import

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const tokenService = inject(TokenService);

    // Type check for url
    const url = req.url as string;

    // Skip authentication for public endpoints
    if (Object.values(PUBLIC_ENDPOINTS).some(endpoint => url.includes(endpoint))) {
        return next(req);
    }
    
    // Skip token for logout when not authenticated
    if (req.url.includes(AUTH_ENDPOINTS.LOGOUT) && !tokenService.isAuthenticated()) {
        return next(req);
    }

    const token = tokenService.getAccessToken();
    if (token && tokenService.isAuthenticated()) {
        req = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    return next(req).pipe(
        catchError((error) => {
            if (error instanceof HttpErrorResponse && error.status === 401) {
                return from(tokenService.refreshToken(tokenService.getRefreshToken() || '')).pipe(
                    switchMap(() => next(req)),
                    catchError((refreshError) => {
                        tokenService.clearTokens();
                        return throwError(() => refreshError);
                    })
                );
            }
            return throwError(() => error);
        })
    );
};

export const authInterceptorProvider = (): Provider => ({
    provide: HTTP_INTERCEPTORS,
    useClass: AuthInterceptor,
    multi: true
});

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(private tokenService: TokenService) {}

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Skip token for public endpoints
        if (this.isPublicEndpoint(request.url)) {
            return next.handle(request);
        }

        const token = this.tokenService.getAccessToken();
        if (token) {
            request = request.clone({
                setHeaders: {
                    Authorization: `Bearer ${token}`
                }
            });
        }

        return next.handle(request).pipe(
            catchError(error => {
                if (error instanceof HttpErrorResponse && error.status === 401) {
                    return this.handle401Error(request, next);
                }
                return throwError(() => error);
            })
        );
    }

    private isPublicEndpoint(url: string): boolean {
        return Object.values(PUBLIC_ENDPOINTS).some(endpoint => 
            url.includes(endpoint)
        );
    }

    private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Error: Cannot convert string|null to Observable
        const refreshToken = this.tokenService.getRefreshToken();
        
        if (!refreshToken) {
            return throwError(() => new Error('No refresh token available'));
        }

        // Convert to Observable using from()
        return from(this.refreshTokenAndRetry(request, next, refreshToken));
    }

    private async refreshTokenAndRetry(
        request: HttpRequest<any>, 
        next: HttpHandler,
        refreshToken: string
    ): Promise<HttpEvent<any>> {
        try {
            await this.tokenService.refreshToken(refreshToken);
            const newToken = this.tokenService.getAccessToken();
            
            const clonedRequest = request.clone({
                setHeaders: { Authorization: `Bearer ${newToken}` }
            });
            
            return firstValueFrom(next.handle(clonedRequest));
        } catch (error) {
            this.tokenService.clearTokens();
            throw error;
        }
    }
}