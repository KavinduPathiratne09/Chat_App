import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Socket } from 'socket.io-client';
import DatabaseService from './DatabaseService';
import FirebaseService from './FirebaseService';
// NotificationService import removed

export interface ChatConnectionInfo {
  sessionId: string;
  userName: string;
  serverUrl: string;
}

export interface MessageEventData {
  sessionId: string;
  sender: string;
  content: string;
  timestamp: number;
  type?: 'user' | 'system';
  event?: string;
}

/**
 * MessagingService - Handles real-time chat functionality and connection management
 * 
 * This service manages:
 * - WebSocket/Firebase connections for real-time messaging
 * - Message routing and delivery
 * - Connection state management
 * - Local message persistence for notifications
 */
class MessagingService {
  private socket: Socket | null = null;
  private currentSessionId: string | null = null;
  private currentUserName: string | null = null;
  private messageListeners: ((message: MessageEventData) => void)[] = [];
  private connectionListeners: ((connected: boolean) => void)[] = [];
  private isAndroid = Platform.OS === 'android';
  private firebaseSubscribedForSession: string | null = null;

  /**
   * Initializes a new chat connection with the provided connection info
   * @param connectionInfo - Session details including sessionId, userName, and serverUrl
   * @returns Promise<boolean> - True if connection successful, false otherwise
   */
  async initializeConnection(connectionInfo: ChatConnectionInfo): Promise<boolean> {
    try {
      console.log('Initializing connection with:', connectionInfo);
      // Android-specific initialization with timeout guard to prevent hanging
      if (this.isAndroid) {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout on Android')), 10000);
        });
        const connectionPromise = this.establishConnection(connectionInfo);
        await Promise.race([connectionPromise, timeoutPromise]);
      } else {
        await this.establishConnection(connectionInfo);
      }
      console.log('Connection initialized successfully');
      return true;
    } catch (error) {
      console.error('Connection initialization error:', error);
      this.notifyConnectionListeners(false);
      return false;
    }
  }

  /**
   * Establishes the actual connection and sets up Firebase listeners
   * @param connectionInfo - Connection configuration
   */
  private async establishConnection(connectionInfo: ChatConnectionInfo): Promise<void> {
    console.log('Establishing connection...');
    this.currentSessionId = connectionInfo.sessionId;
    this.currentUserName = connectionInfo.userName;

    // Store connection info for reconnection attempts
    await AsyncStorage.setItem('currentConnection', JSON.stringify(connectionInfo));

    if (FirebaseService.isEnabled()) {
      console.log('Firebase is enabled, connecting...');
      await FirebaseService.connect(connectionInfo);
      // Subscribe to Firestore messages once per session to avoid duplicates
      if (this.firebaseSubscribedForSession !== connectionInfo.sessionId) {
        console.log('Subscribing to Firebase messages for session:', connectionInfo.sessionId);
        FirebaseService.subscribeMessages(connectionInfo.sessionId, (msg) => {
          console.log('Received Firebase message:', msg);
          this.notifyMessageListeners(msg);
        });
        this.firebaseSubscribedForSession = connectionInfo.sessionId;
      }
    } else {
      console.log('Firebase is not enabled, using local-only mode');
    }

    // Connection success - notify listeners
    this.notifyConnectionListeners(true);
    console.log(
      'Chat connection initialized for session:',
      connectionInfo.sessionId,
      FirebaseService.isEnabled() ? '(Firebase)' : '(Local-only)'
    );
  }

  /**
   * Disconnects from the current chat session and cleans up resources
   */
  disconnect(): void {
    try {
      // Before disconnecting locally, send a system event so peer is notified
      if (FirebaseService.isEnabled() && this.currentSessionId && this.currentUserName) {
        // Fire and forget
        FirebaseService.sendSystemEvent(this.currentSessionId, 'disconnected', this.currentUserName)
          .catch(err => console.warn('Failed to send disconnect event:', err));
      }
      
      // Save the current user name to the session before disconnecting
      if (this.currentSessionId && this.currentUserName) {
        DatabaseService.updateSessionParticipantName(this.currentSessionId, this.currentUserName)
          .catch(err => console.warn('Failed to save user name on disconnect:', err));
      }
      
      // Persist a local session-ended flag so UI stays disabled across navigations
      if (this.currentSessionId) {
        AsyncStorage.setItem(`sessionEnded:${this.currentSessionId}`, '1').catch(() => {});
      }
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
      if (FirebaseService.isEnabled()) {
        FirebaseService.disconnect();
        this.firebaseSubscribedForSession = null;
      }

      this.currentSessionId = null;
      this.currentUserName = null;
      this.notifyConnectionListeners(false);

      // Clean up stored connection info
      AsyncStorage.removeItem('currentConnection').catch(error => {
        console.error('Error removing connection info:', error);
      });

      console.log('Disconnected from chat session');
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  }

  /**
   * Sends a message to the current chat session
   * @param content - The message text to send
   * @returns Promise<boolean> - True if message sent successfully
   */
  async sendMessage(content: string): Promise<boolean> {
    if (!this.currentSessionId || !this.currentUserName) {
      console.error('No active session for sending message');
      return false;
    }

    try {
      const messageData: MessageEventData = {
        sessionId: this.currentSessionId,
        sender: this.currentUserName,
        content,
        timestamp: Date.now(),
      };

      console.log('Sending message:', messageData);

      if (FirebaseService.isEnabled()) {
        console.log('Sending via Firebase...');
        await FirebaseService.sendMessage(
          messageData.sessionId,
          messageData.sender,
          messageData.content
        );
        console.log('Message sent via Firebase successfully');
        // Delivery handled by Firestore onSnapshot on each device
      } else {
        console.log('Sending via local-only mode...');
        // Local-only fallback: deliver to this device listeners
        if (this.isAndroid) {
          // Android-specific retry logic for reliability
          const maxRetries = 3;
          let retries = 0;
          while (retries < maxRetries) {
            try {
              await this.processMessage(messageData);
              break;
            } catch (error) {
              retries++;
              if (retries >= maxRetries) throw error;
              console.warn(`Message send retry ${retries} on Android`);
              await new Promise(resolve => setTimeout(resolve, 1000 * retries));
            }
          }
        } else {
          await this.processMessage(messageData);
        }
        console.log('Message sent via local mode successfully');
      }

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  /**
   * Sends a system event (e.g., joined/disconnected) so peers can update state
   */
  async sendSystemEvent(event: string, actorName?: string): Promise<void> {
    if (!this.currentSessionId) return;
    if (!FirebaseService.isEnabled()) return;
    try {
      const actor = actorName || this.currentUserName || 'system';
      await FirebaseService.sendSystemEvent(this.currentSessionId, event, actor);
    } catch (e) {
      console.warn('sendSystemEvent failed', e);
    }
  }

  /**
   * Processes a message locally (used for local-only mode)
   * @param messageData - The message to process
   */
  private async processMessage(messageData: MessageEventData): Promise<void> {
    // In a real app, emit to socket server; here we just notify local listeners
    await new Promise(resolve => setTimeout(resolve, 100));
    this.notifyMessageListeners(messageData);
  }

  addMessageListener(listener: (message: MessageEventData) => void): void {
    this.messageListeners.push(listener);
  }

  removeMessageListener(listener: (message: MessageEventData) => void): void {
    this.messageListeners = this.messageListeners.filter(l => l !== listener);
  }

  addConnectionListener(listener: (connected: boolean) => void): void {
    this.connectionListeners.push(listener);
  }

  removeConnectionListener(listener: (connected: boolean) => void): void {
    this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
  }

  /**
   * Notifies all message listeners with incoming message data
   * Also handles message persistence and notifications for non-own messages
   * @param message - The message data to broadcast
   */
  private notifyMessageListeners(message: MessageEventData): void {
    this.messageListeners.forEach(listener => {
      try {
        listener(message);
      } catch (error) {
        console.error('Error in message listener:', error);
      }
    });

    // Trigger persistence for messages received from others (including system)
    if (message.sender !== this.currentUserName) {
      // Persist incoming message so it appears when user opens chat later
      DatabaseService.saveMessage({
        sessionId: message.sessionId,
        content: message.content,
        sender: message.sender,
        timestamp: message.timestamp,
        isOwn: false,
      }).catch(err => console.error('Error persisting incoming message:', err));

      // Update session last message time for history ordering
      DatabaseService.updateSessionLastMessage(message.sessionId, message.timestamp)
        .catch(err => console.error('Error updating session last message:', err));

      // Ensure the chat session stores the participant name
      if (message.type !== 'system' && message.sender && message.sender !== 'system') {
        DatabaseService.updateSessionParticipantName(message.sessionId, message.sender)
          .catch(() => {});
      } else if (message.type === 'system' && message.event === 'joined') {
        // For join events, the 'sender' carries the actor name of the joiner
        if (message.sender && message.sender !== 'system') {
          DatabaseService.updateSessionParticipantName(message.sessionId, message.sender)
            .catch(() => {});
        }
      }
    }
  }

  /**
   * Notifies all connection state listeners
   * @param connected - Current connection status
   */
  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach(listener => {
      try {
        listener(connected);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }

  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  getCurrentUserName(): string | null {
    return this.currentUserName;
  }

  isConnected(): boolean {
    return this.currentSessionId !== null;
  }

  // Method to restore connection on app resume
  async restoreConnection(): Promise<boolean> {
    try {
      const connectionInfoStr = await AsyncStorage.getItem('currentConnection');
      if (connectionInfoStr) {
        const connectionInfo: ChatConnectionInfo = JSON.parse(connectionInfoStr);
        return await this.initializeConnection(connectionInfo);
      }
      return false;
    } catch (error) {
      console.error('Error restoring connection:', error);
      return false;
    }
  }
}

export default new MessagingService();
