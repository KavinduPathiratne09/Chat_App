import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import WebDatabaseService from './WebDatabaseService';

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

/**
 * DatabaseService - Handles local data persistence using SQLite (mobile) or AsyncStorage (web)
 * 
 * This service provides:
 * - Message storage and retrieval
 * - Chat session management
 * - Cross-platform database abstraction
 * - Automatic initialization and connection management
 */
class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private isWeb = Platform.OS === 'web';
  private isInitializedFlag: boolean = false;
  private initializePromise: Promise<void> | null = null;

  /**
   * Initializes the database and creates necessary tables
   * Uses singleton pattern to prevent multiple initializations
   */
  async initialize() {
    try {
      if (this.isInitializedFlag && (this.isWeb || this.db)) return;
      if (this.initializePromise) return this.initializePromise;
      this.initializePromise = (async () => {
        if (this.isWeb) {
          // Use AsyncStorage-based service for web compatibility
          await WebDatabaseService.initialize();
          console.log('Web Database (AsyncStorage) initialized successfully');
          this.isInitializedFlag = true;
          return;
        }

        // Use SQLite for mobile platforms with better performance
        this.db = await SQLite.openDatabaseAsync('instantchat.db');
        
        // Create chat sessions table for session management
        await this.db.execAsync(`
          CREATE TABLE IF NOT EXISTS chat_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sessionId TEXT UNIQUE NOT NULL,
            participantName TEXT NOT NULL,
            createdAt INTEGER NOT NULL,
            lastMessageAt INTEGER NOT NULL
          );
        `);

        // Create messages table with foreign key relationship
        await this.db.execAsync(`
          CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sessionId TEXT NOT NULL,
            sender TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            isOwn INTEGER NOT NULL,
            FOREIGN KEY (sessionId) REFERENCES chat_sessions (sessionId)
          );
        `);

        console.log('SQLite Database initialized successfully');
        this.isInitializedFlag = true;
      })();
      await this.initializePromise;
      this.initializePromise = null;
    } catch (error) {
      console.error('Database initialization error:', error);
      this.initializePromise = null;
      throw error;
    }
  }

  /**
   * Ensures database is initialized before any operation
   * Prevents race conditions during app startup
   */
  private async ensureInitialized() {
    if (!this.isInitializedFlag) {
      await this.initialize();
    }
  }

  /**
   * Saves a message to the local database
   * @param message - The message object to save
   * @returns Promise<number> - The ID of the saved message
   */
  async saveMessage(message: Message): Promise<number> {
    await this.ensureInitialized();
    if (this.isWeb) {
      return await WebDatabaseService.saveMessage(message);
    }

    if (!this.db) throw new Error('Database not initialized');
    
    try {
      const result = await this.db.runAsync(
        'INSERT INTO messages (sessionId, sender, content, timestamp, isOwn) VALUES (?, ?, ?, ?, ?)',
        [message.sessionId, message.sender, message.content, message.timestamp, message.isOwn ? 1 : 0]
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }

  /**
   * Retrieves all messages for a specific chat session
   * @param sessionId - The session ID to get messages for
   * @returns Promise<Message[]> - Array of messages in chronological order
   */
  async getMessages(sessionId: string): Promise<Message[]> {
    await this.ensureInitialized();
    if (this.isWeb) {
      return await WebDatabaseService.getMessages(sessionId);
    }

    if (!this.db) throw new Error('Database not initialized');
    
    try {
      const result = await this.db.getAllAsync(
        'SELECT * FROM messages WHERE sessionId = ? ORDER BY timestamp ASC',
        [sessionId]
      ) as any[];

      return result.map(row => ({
        id: row.id,
        sessionId: row.sessionId,
        sender: row.sender,
        content: row.content,
        timestamp: row.timestamp,
        isOwn: row.isOwn === 1
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  async saveChatSession(session: ChatSession): Promise<void> {
    await this.ensureInitialized();
    if (this.isWeb) {
      return await WebDatabaseService.saveChatSession(session);
    }

    if (!this.db) throw new Error('Database not initialized');
    
    try {
      await this.db.runAsync(
        'INSERT OR REPLACE INTO chat_sessions (sessionId, participantName, createdAt, lastMessageAt) VALUES (?, ?, ?, ?)',
        [session.sessionId, session.participantName, session.createdAt, session.lastMessageAt]
      );
    } catch (error) {
      console.error('Error saving chat session:', error);
      throw error;
    }
  }

  async getChatSessions(): Promise<ChatSession[]> {
    await this.ensureInitialized();
    if (this.isWeb) {
      return await WebDatabaseService.getChatSessions();
    }

    if (!this.db) throw new Error('Database not initialized');
    
    try {
      const result = await this.db.getAllAsync(
        'SELECT * FROM chat_sessions ORDER BY lastMessageAt DESC'
      ) as any[];

      return result.map(row => ({
        id: row.id,
        sessionId: row.sessionId,
        participantName: row.participantName,
        createdAt: row.createdAt,
        lastMessageAt: row.lastMessageAt
      }));
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      throw error;
    }
  }

  async updateSessionLastMessage(sessionId: string, timestamp: number): Promise<void> {
    await this.ensureInitialized();
    if (this.isWeb) {
      return await WebDatabaseService.updateSessionLastMessage(sessionId, timestamp);
    }

    if (!this.db) throw new Error('Database not initialized');
    
    try {
      await this.db.runAsync(
        'UPDATE chat_sessions SET lastMessageAt = ? WHERE sessionId = ?',
        [timestamp, sessionId]
      );
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  }

  async updateSessionParticipantName(sessionId: string, participantName: string): Promise<void> {
    await this.ensureInitialized();
    if (this.isWeb) {
      return await WebDatabaseService.updateSessionParticipantName(sessionId, participantName);
    }

    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        'UPDATE chat_sessions SET participantName = ? WHERE sessionId = ?',
        [participantName, sessionId]
      );
    } catch (error) {
      console.error('Error updating participant name:', error);
      throw error;
    }
  }

  async deleteChatSession(sessionId: string): Promise<void> {
    await this.ensureInitialized();
    if (this.isWeb) {
      return await WebDatabaseService.deleteChatSession(sessionId);
    }

    if (!this.db) throw new Error('Database not initialized');
    
    try {
      await this.db.runAsync('DELETE FROM messages WHERE sessionId = ?', [sessionId]);
      await this.db.runAsync('DELETE FROM chat_sessions WHERE sessionId = ?', [sessionId]);
    } catch (error) {
      console.error('Error deleting chat session:', error);
      throw error;
    }
  }
}

export default new DatabaseService();
