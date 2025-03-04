import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap, delay, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Provider } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, retryWhen } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    
    if (!req.url.includes('/auth/')) {
        const token = authService.getToken();
        if (token) {
            req = req.clone({
                setHeaders: {
                    Authorization: `Bearer ${token}`
                }
            });
        }
    }

    return next(req).pipe(
        retryWhen(errors$ => 
            errors$.pipe(
                delay(1000), // Wait 1 second before retrying
                take(3)     // Maximum 3 retries
            )
        ),
        catchError((error) => {
            if (error instanceof HttpErrorResponse) {
                if (error.status === 401) {
                    return from(authService.refreshToken()).pipe(
                        switchMap(() => {
                            const newToken = authService.getToken();
                            if (newToken) {
                                req = req.clone({
                                    setHeaders: {
                                        Authorization: `Bearer ${newToken}`
                                    }
                                });
                            }
                            return next(req);
                        }),
                        catchError((refreshError) => {
                            authService.logout();
                            return throwError(() => new Error('Session expired'));
                        })
                    );
                }
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
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY = 1000;

    constructor(private authService: AuthService) {}

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if (!request.url.includes('/auth/')) {
            request = this.addAuthHeader(request);
        }

        return next.handle(request).pipe(
            retryWhen(errors => 
                errors.pipe(
                    delay(this.RETRY_DELAY),
                    take(this.MAX_RETRIES)
                )
            ),
            catchError(error => {
                if (error instanceof HttpErrorResponse) {
                    switch (error.status) {
                        case 401:
                            return this.handle401Error(request, next);
                        case 403:
                            this.authService.logout();
                            return throwError(() => new Error('Access forbidden. Please login again.'));
                        case 404:
                            return throwError(() => new Error('Resource not found'));
                        case 500:
                            return throwError(() => new Error('Server error. Please try again later.'));
                        default:
                            return throwError(() => new Error('An unexpected error occurred'));
                    }
                }
                return throwError(() => error);
            })
        );
    }

    private addAuthHeader(request: HttpRequest<any>): HttpRequest<any> {
        const token = this.authService.getToken();
        if (token) {
            return request.clone({
                setHeaders: { 
                    Authorization: `Bearer ${token}`,
                    'X-Request-ID': this.generateRequestId()
                }
            });
        }
        return request;
    }

    private generateRequestId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Convert Promise to Observable using 'from'
        return from(this.authService.refreshToken()).pipe(
            switchMap(() => {
                request = this.addAuthHeader(request);
                return next.handle(request);
            }),
            catchError(error => {
                this.authService.logout();
                return throwError(() => new Error('Session expired. Please login again.'));
            })
        );
    }
}