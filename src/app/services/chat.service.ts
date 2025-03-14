import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { ChatMessage, MessageType } from '../../models/chat-message.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  public messages$ = this.messagesSubject.asObservable();
  private sessionId: string | null = null;

  constructor(private http: HttpClient) {
    // Initialize with welcome message
    this.addMessage({
      content: "Hi there! I'm KaziBot. How can I help you today?",
      type: MessageType.AI,
      timestamp: new Date()
    });
  }

  // Send a message to the Dialogflow backend
  sendMessage(message: string): Observable<any> {
    // Add user message to the chat immediately
    this.addMessage({
      content: message,
      type: MessageType.USER,
      timestamp: new Date()
    });

    // Prepare the API request
    const payload = {
      message,
      sessionId: this.sessionId
    };

    // Send to backend API - using the correct endpoint path
    return this.http.post<any>(`${environment.apiUrl}/messages`, payload);
  }

  // Handle the AI response
  handleResponse(response: any): void {
    // Store session ID for conversation continuity
    if (response.sessionId) {
      this.sessionId = response.sessionId;
    }

    // Add AI message to the chat
    this.addMessage({
      content: response.response || "Sorry, I couldn't understand that.",
      type: MessageType.AI,
      timestamp: new Date()
    });
  }

  // Add a message to the messages array
  private addMessage(message: ChatMessage): void {
    const currentMessages = this.messagesSubject.getValue();
    this.messagesSubject.next([...currentMessages, message]);
  }

  // Clear chat history
  clearChat(): void {
    this.messagesSubject.next([]);
    this.sessionId = null;
  }
}
