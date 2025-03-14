export enum MessageType {
  USER = 'user',
  AI = 'ai'
}

export interface ChatMessage {
  content: string;
  type: MessageType;
  timestamp: Date;
}
