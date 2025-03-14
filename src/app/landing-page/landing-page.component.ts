
// Angular imports
import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

// Service 
import { ChatService } from '../services/chat.service';

// Model 
import { ChatMessage, MessageType } from '../../models/chat-message.model';

// Third-party libraries
import * as AOS from 'aos';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule
  ],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.css']
})
export class LandingPageComponent implements OnInit, AfterViewChecked {
  // ======== CHAT PROPERTIES ========
 
  MessageType = MessageType;
  
  /** List of chat messages */
  messages: ChatMessage[] = [];
  
  /** Form control for the message input */
  messageInput = new FormControl('', [Validators.required]);
  
  /** Flag to track loading state during message sending */
  isLoading = false;
  
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  
  /** Controls auto-scroll behavior */
  private shouldAutoScroll = true;

  // ======== UI PROPERTIES ========
 
  displayedText: string = 'KaziBot AI Assistant';
  
  /** Tracks if the menu is open */
  isMenuOpen: boolean = false;
  
  /** Controls the bouncing animation */
  isBouncing: boolean = true;

  // ======== TYPEWRITER EFFECT PROPERTIES ========
  /** Words to display in the typewriter animation */
  words: string[] = ['KaziBot AI Assistant', 'Ask me anything!', 'Let\'s chat!'];
  
 
  i: number = 0;
  j: number = 0;

  isDeleting: boolean = false;

  
  constructor(private chatService: ChatService) { }

  // ======== LIFECYCLE METHODS ========
  /**
   * Initialize the component
   */
  ngOnInit() {
    this.initializeAOS();
    this.subscribeToMessages();
    this.initializeUIEffects();
    this.initializeScrollBehavior();
  }

 
  ngAfterViewChecked() {
    // Only auto-scroll when appropriate
    if (this.shouldAutoScroll) {
      this.scrollToBottom();
    }
  }

  // ======== INITIALIZATION METHODS ========
  /**
   * Initialize AOS animations
   */
  private initializeAOS() {
    AOS.init({
      duration: 1000,
      easing: 'ease-in-out',
      once: false
    });
  }

  /**
   * Subscribe to chat messages from the service
   */
  private subscribeToMessages() {
    this.chatService.messages$.subscribe(messages => {
      this.messages = messages;
    });
  }

  /**
   * Initialize UI effects like bouncing and typewriter
   */
  private initializeUIEffects() {
    // Stop bouncing after 4 seconds
    setTimeout(() => {
      this.isBouncing = false;
    }, 4000);

    // Start the typewriter effect
    this.type();
  }

  /**
   * Initialize scroll behavior and detection
   */
  private initializeScrollBehavior() {
    setTimeout(() => {
      if (this.chatContainer && this.chatContainer.nativeElement) {
        this.chatContainer.nativeElement.addEventListener('scroll', () => {
          const element = this.chatContainer.nativeElement;
          
          // More precise scroll position detection
          const scrollPosition = element.scrollHeight - element.clientHeight - element.scrollTop;
          
          // Only consider "at bottom" if within 20px of actual bottom
          this.shouldAutoScroll = scrollPosition < 20;
        });
      }
      
      // Initial scroll to bottom when chat opens
      this.scrollToBottom(false); // Use instant scroll on initial load
    }, 500);
  }

  // ======== SCROLL CONTROL METHODS ========
  /**
   * Scroll the chat container to the bottom
   * @param smooth Whether to use smooth scrolling
   */
  private scrollToBottom(smooth: boolean = true) {
    try {
      const element = this.chatContainer.nativeElement;
      element.scrollTo({
        top: element.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    } catch (err) {
      console.error('Error scrolling:', err);
    }
  }

  /**
   * Disable auto-scrolling
   */
  disableScroll(): void {
    this.shouldAutoScroll = false;
    document.body.style.overflow = 'hidden';
  }

  /**
   * Enable auto-scrolling
   */
  enableScroll(): void {
    this.shouldAutoScroll = true;
    this.scrollToBottom();
    document.body.style.overflow = 'auto';
  }

  // ======== CHAT FUNCTIONALITY ========
  /**
   * Send a message to the chat
   * @param event Optional event object
   * @returns false to prevent form submission
   */
  sendMessage(event?: Event): boolean {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (this.messageInput.invalid || this.isLoading) return false;

    const message = this.messageInput.value;
    if (message === null) return false;

    // Clear input field immediately for better UX
    this.messageInput.setValue('');
    this.isLoading = true;

    this.chatService.sendMessage(message).subscribe({
      next: (response) => {
        // Handle response
        this.chatService.handleResponse(response);
        this.isLoading = false;
        
        // Force scroll to bottom with new message arrival
        this.shouldAutoScroll = true;
        
        // Combine setTimeout operations
        setTimeout(() => {
          this.scrollToBottom(true);  // Use smooth scrolling
          AOS.refresh();  // Refresh animations
        }, 100);
      },
      error: (error) => {
        console.error('Error sending message:', error);
        this.chatService.handleResponse({
          response: "Sorry, I'm having trouble connecting to the service. Please try again later."
        });
        this.isLoading = false;
        
        // Ensure error messages are also visible
        setTimeout(() => {
          this.shouldAutoScroll = true;
          this.scrollToBottom(true);
        }, 100);
      }
    });

    return false;
  }

  // ======== UI CONTROL METHODS ========
  /**
   * Toggle the menu open/closed state
   */
  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  /**
   * Implement typewriter text effect
   */
  type(): void {
    const currentWord = this.words[this.i];

    if (this.isDeleting) {
      // Delete characters one by one
      this.displayedText = currentWord.substring(0, this.j - 1);
      this.j--;

      // If the word is fully deleted, move to the next word
      if (this.j === 1) {
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
}
