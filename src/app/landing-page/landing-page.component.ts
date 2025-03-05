import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MessengerChatComponent } from '../components/messenger-chat/messenger-chat.component';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MessengerChatComponent
  ],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.css']
})
export class LandingPageComponent implements OnInit {
  //  START NAV
  isMenuOpen = false;

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }
    //  END NAV


// GETTING STARTED BOUNCE
isBouncing = true; // Start bouncing

// TYPE EFFECT
words: string[] = ["INTELLIGENT BOT", "SMART SOLUTIONS"];
displayedText: string = ""; // Holds the current displayed text
i: number = 0; // Index for the current word
j: number = 0; // Index for the current character
isDeleting: boolean = false; // Flag to check if deleting

ngOnInit(): void {
  // Stop bouncing after 3 seconds
  setTimeout(() => {
    this.isBouncing = false;
  }, 4000);

  this.type(); // Start the typewriter effect
}

type(): void {
  const currentWord = this.words[this.i];

  if (this.isDeleting) {
    // Delete characters one by one
    this.displayedText = currentWord.substring(0, this.j - 1);
    this.j--;

    // If the word is fully deleted, move to the next word
    if (this.j === 1) {  // Changed from 0 to 1
      this.isDeleting = false;
      this.i++;

      // Reset to the first word if we reach the end of the array
      if (this.i === this.words.length) {
      this.i = 0;
      }
    }
  } else {
    // Add characters one by one
    this.displayedText = currentWord.substring(0, this.j + 1);
    this.j++;

    // If the word is fully typed, start deleting
    if (this.j === currentWord.length) {
      this.isDeleting = true;
    }
  }

  // Call the function again after a delay
  setTimeout(() => this.type(), 200);
}

// END TYPE EFFECT
disablePageScroll(disable: boolean) {
  if (disable) {
    document.body.style.overflow = 'hidden'; // Disable scrolling
  } else {
    document.body.style.overflow = 'auto'; // Enable scrolling
  }
}

disableScroll(): void {
  document.body.style.overflow = 'hidden';
}

enableScroll(): void {
  document.body.style.overflow = 'auto';
}

}
