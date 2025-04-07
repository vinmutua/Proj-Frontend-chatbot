import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface WindowWithFB extends Window {
  FB?: any;
}

@Component({
  selector: 'app-facebook-chat',
  standalone: true,
  imports: [CommonModule],
  template: `<div id="fb-customer-chat" class="fb-customerchat"></div>`
})
export class FacebookChatComponent implements AfterViewInit {
  ngAfterViewInit() {
    // Log the status of the plugin
    console.log('Chat component initializing');
    
    // Set attributes programmatically
    const chatbox = document.getElementById('fb-customer-chat');
    if (chatbox) {
      chatbox.setAttribute("page_id", "626968417157832");
      chatbox.setAttribute("attribution", "biz_inbox");
      // Remove the test HTML - no longer needed
      // chatbox.innerHTML = '<div style="position:fixed; bottom:20px; right:20px; background:red; color:white; padding:10px; z-index:9999;">im feeling woo sana</div>';
    }
    
    // Initialize FB after a short delay
    setTimeout(() => {
      const windowWithFB = window as WindowWithFB;
      if (windowWithFB.FB) {
        console.log('Facebook SDK loaded, parsing XFBML');
        windowWithFB.FB.XFBML.parse();
      } else {
        console.error('Facebook SDK not loaded properly');
      }
    }, 1000);
  }
}
