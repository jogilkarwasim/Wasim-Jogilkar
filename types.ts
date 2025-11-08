export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface StoryPage {
  id: string;
  text: string;
  imageUrl?: string;
  audioBuffer?: AudioBuffer;
}
