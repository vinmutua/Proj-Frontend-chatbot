import { Injectable } from '@angular/core';

declare global {
  interface Window {
    HSStaticMethods: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class PrelineService {
  init() {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.HSStaticMethods) {
        window.HSStaticMethods.autoInit();
      }
    });
  }
}