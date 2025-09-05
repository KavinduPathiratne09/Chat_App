import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Message {
  id?: number;
  sessionId: string;
  sender: string;
  content: string;
  timestamp: number;
  isOwn: boolean;
}

export interface ChatSession {
  id?: number;
  sessionId: string;
  participantName: string;
  createdAt: number;
  lastMessageAt: number;
}

class WebDatabaseService {
  private isInitialized = false;

  async initialize() {
    try {
      // For web, we just need to ensure AsyncStorage is available
      this.isInitialized = true;
      console.log('Web Database (AsyncStorage) initialized successfully');
    } catch (error) {
      console.error('Web Database initialization error:', error);
      throw error;
    }
  }

  private async getStoredData<T>(key: string): Promise<T[]> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Error getting stored data for ${key}:`, error);
      return [];
    }
  }

  private async setStoredData<T>(key: string, data: T[]): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error storing data for ${key}:`, error);
      throw error;
    }
  }

  async saveMessage(message: Message): Promise<number> {
    if (!this.isInitialized) throw new Error('Database not initialized');
    
    try {
      const messages = await this.getStoredData<Message>('messages');
      const newMessage = {
        ...message,
        id: Date.now() + Math.random() // Simple ID generation for web
      };
      
      messages.push(newMessage);
      await this.setStoredData('messages', messages);
      
      return newMessage.id as number;
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }

  async getMessages(sessionId: string): Promise<Message[]> {
    if (!this.isInitialized) throw new Error('Database not initialized');
    
    try {
      const messages = await this.getStoredData<Message>('messages');
      return messages
        .filter(msg => msg.sessionId === sessionId)
        .sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  async saveChatSession(session: ChatSession): Promise<void> {
    if (!this.isInitialized) throw new Error('Database not initialized');
    
    try {
      const sessions = await this.getStoredData<ChatSession>('chat_sessions');
      const existingIndex = sessions.findIndex(s => s.sessionId === session.sessionId);
      
      if (existingIndex >= 0) {
        sessions[existingIndex] = session;
      } else {
        sessions.push({
          ...session,
          id: Date.now() + Math.random()
        });
      }
      
      await this.setStoredData('chat_sessions', sessions);
    } catch (error) {
      console.error('Error saving chat session:', error);
      throw error;
    }
  }

  async getChatSessions(): Promise<ChatSession[]> {
    if (!this.isInitialized) throw new Error('Database not initialized');
    
    try {
      const sessions = await this.getStoredData<ChatSession>('chat_sessions');
      return sessions.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      throw error;
    }
  }

  async updateSessionLastMessage(sessionId: string, timestamp: number): Promise<void> {
    if (!this.isInitialized) throw new Error('Database not initialized');
    
    try {
      const sessions = await this.getStoredData<ChatSession>('chat_sessions');
      const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
      
      if (sessionIndex >= 0) {
        sessions[sessionIndex].lastMessageAt = timestamp;
        await this.setStoredData('chat_sessions', sessions);
      }
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  }

  async updateSessionParticipantName(sessionId: string, participantName: string): Promise<void> {
    if (!this.isInitialized) throw new Error('Database not initialized');
    try {
      const sessions = await this.getStoredData<ChatSession>('chat_sessions');
      const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
      if (sessionIndex >= 0) {
        sessions[sessionIndex].participantName = participantName;
        await this.setStoredData('chat_sessions', sessions);
      }
    } catch (error) {
      console.error('Error updating participant name:', error);
      throw error;
    }
  }

  async deleteChatSession(sessionId: string): Promise<void> {
    if (!this.isInitialized) throw new Error('Database not initialized');
    
    try {
      // Delete messages
      const messages = await this.getStoredData<Message>('messages');
      const filteredMessages = messages.filter(msg => msg.sessionId !== sessionId);
      await this.setStoredData('messages', filteredMessages);
      
      // Delete session
      const sessions = await this.getStoredData<ChatSession>('chat_sessions');
      const filteredSessions = sessions.filter(s => s.sessionId !== sessionId);
      await this.setStoredData('chat_sessions', filteredSessions);
    } catch (error) {
      console.error('Error deleting chat session:', error);
      throw error;
    }
  }
}

export default new WebDatabaseService();
