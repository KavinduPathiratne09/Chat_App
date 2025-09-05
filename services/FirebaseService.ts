import Constants from 'expo-constants';
import { FirebaseApp, initializeApp } from 'firebase/app';
import {
    addDoc,
    collection,
    Firestore,
    getFirestore,
    onSnapshot,
    orderBy,
    query,
    Unsubscribe,
} from 'firebase/firestore';

import { ChatConnectionInfo, MessageEventData } from './MessagingService';

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
};

class FirebaseService {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private unsubMessages: Unsubscribe | null = null;
  private enabled = false;

  constructor() {
    const cfg = (Constants.expoConfig?.extra as any)?.firebase as FirebaseConfig | undefined;
    if (cfg && cfg.apiKey && cfg.projectId && cfg.appId) {
      try {
        this.app = initializeApp(cfg);
        this.db = getFirestore(this.app);
        this.enabled = true;
        // eslint-disable-next-line no-console
        console.log('Firebase enabled');
      } catch (e) {
        console.warn('Failed to init Firebase, falling back to local simulation:', e);
        this.enabled = false;
      }
    }
  }

  isEnabled() {
    return this.enabled && this.db !== null;
  }

  async connect(connection: ChatConnectionInfo): Promise<void> {
    if (!this.isEnabled()) throw new Error('Firebase not enabled');
    // Nothing to do for Firestore besides subscribing; writing happens on send.
  }

  subscribeMessages(sessionId: string, onMessage: (msg: MessageEventData) => void) {
    if (!this.db) return;
    if (this.unsubMessages) {
      this.unsubMessages();
      this.unsubMessages = null;
    }
    const colRef = collection(this.db, 'sessions', sessionId, 'messages');
    const q = query(colRef, orderBy('timestamp', 'asc'));
    this.unsubMessages = onSnapshot(q, (snap: any) => {
      (snap.docChanges() as any[]).forEach((change: any) => {
        if (change.type === 'added') {
          const d = change.doc.data() as any;
          if (d?.content && d?.sender && d?.timestamp) {
            const msg: MessageEventData = {
              sessionId,
              sender: d.sender,
              content: d.content,
              timestamp: typeof d.timestamp === 'number' ? d.timestamp : Date.now(),
              type: d.type || 'user',
              event: d.event,
            };
            onMessage(msg);
          }
        }
      });
    });
  }

  async sendMessage(sessionId: string, sender: string, content: string): Promise<void> {
    if (!this.db) throw new Error('Firebase not enabled');
    const colRef = collection(this.db, 'sessions', sessionId, 'messages');
    await addDoc(colRef, {
      sender,
      content,
      timestamp: Date.now(),
      type: 'user',
    });
  }

  async sendSystemEvent(sessionId: string, event: string, actor: string): Promise<void> {
    if (!this.db) throw new Error('Firebase not enabled');
    const colRef = collection(this.db, 'sessions', sessionId, 'messages');
    let content = `${actor}: ${event}`;
    if (event === 'disconnected') {
      content = `${actor} has disconnected. You can no longer send messages.`;
    } else if (event === 'joined') {
      content = `${actor} joined the chat.`;
    }
    await addDoc(colRef, {
      sender: 'system',
      content,
      timestamp: Date.now(),
      type: 'system',
      event,
    });
  }

  disconnect() {
    if (this.unsubMessages) {
      this.unsubMessages();
      this.unsubMessages = null;
    }
  }
}

export default new FirebaseService();
