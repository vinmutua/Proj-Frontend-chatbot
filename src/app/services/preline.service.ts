import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PrelineService {
  init(): void {
    // Don't initialize Preline if we're on an auth page
    if (window.location.pathname.includes('login') || 
        window.location.pathname.includes('signup')) {
      return;
    }
    console.log('Preline initialized via CDN');
  }
}