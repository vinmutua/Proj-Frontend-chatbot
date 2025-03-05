import { Component, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-messenger-chat',
  standalone: true,
  template: `
    <div id="fb-root"></div>
    <div 
      class="fb-customerchat" 
      attribution="biz_inbox" 
      page_id="626968417157832">
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
    }

    .fb_dialog,
    .fb-customerchat {
      z-index: 10000 !important;
    }
  `]
})
export class MessengerChatComponent implements OnInit {
  ngOnInit() {
    // Verify FB SDK is loaded
    if (!(window as any).FB) {
      console.error('Facebook SDK not loaded');
    }
  }
}
