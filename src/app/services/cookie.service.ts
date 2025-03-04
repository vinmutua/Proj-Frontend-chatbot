import { Injectable } from '@angular/core';

interface CookieOptions {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
    expires?: Date;
    path?: string;
}

@Injectable({
    providedIn: 'root'
})
export class CookieService {
    setCookie(name: string, value: string, options: CookieOptions = {}) {
        let cookie = `${name}=${value}`;
        
        if (options.httpOnly) cookie += '; HttpOnly';
        if (options.secure) cookie += '; Secure';
        if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
        if (options.expires) cookie += `; Expires=${options.expires.toUTCString()}`;
        if (options.path) cookie += `; Path=${options.path}`;
        
        document.cookie = cookie;
    }

    getCookie(name: string): string | null {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [cookieName, cookieValue] = cookie.split('=').map(c => c.trim());
            if (cookieName === name) return cookieValue;
        }
        return null;
    }

    deleteCookie(name: string) {
        this.setCookie(name, '', { expires: new Date(0) });
    }
}
