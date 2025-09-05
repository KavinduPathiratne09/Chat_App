import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import DatabaseService, { Message } from '@/services/DatabaseService';
import MessagingService, { MessageEventData } from '@/services/MessagingService';
import QRCodeService from '@/services/QRCodeService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    ToastAndroid,
    TouchableOpacity,
    Vibration,
    View
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface ChatInterfaceProps {
  sessionId: string;
  onDisconnect: () => void;
  onBack: () => void;
}

export default function ChatInterface({ sessionId, onDisconnect, onBack }: ChatInterfaceProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [peerDisconnected, setPeerDisconnected] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const [hostName, setHostName] = useState('');
  const [participantName, setParticipantName] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  
  // Animation values for visual feedback
  const sendButtonScale = useRef(new Animated.Value(1)).current;
  const messageBubbleScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    initializeChat();
    
    // Set up message listener
    const messageListener = (messageData: MessageEventData) => {
      handleIncomingMessage(messageData);
    };

    const connectionListener = (connected: boolean) => {
      setIsConnected(connected);
      if (connected) {
        showToast('Connected to chat session');
      } else {
        showToast('Disconnected from chat session');
      }
    };

    MessagingService.addMessageListener(messageListener);
    MessagingService.addConnectionListener(connectionListener);

    return () => {
      MessagingService.removeMessageListener(messageListener);
      MessagingService.removeConnectionListener(connectionListener);
    };
  }, [sessionId]);

  const initializeChat = async () => {
    try {
      setIsLoading(true);
      setPeerDisconnected(false);
      setSessionEnded(false);
      
      // Load existing messages from database
      const existingMessages = await DatabaseService.getMessages(sessionId);
      setMessages(existingMessages);

      // If a system disconnect already occurred earlier, keep UI disabled
      try {
        const flag = await AsyncStorage.getItem(`sessionEnded:${sessionId}`);
        if (flag === '1') {
          setPeerDisconnected(true);
          setSessionEnded(true);
        }
      } catch {}
      
      // Check if messaging service is connected
      setIsConnected(MessagingService.isConnected());
      
      // Try to recreate QR code for current session
      await generateSessionQR();

      // Load saved session info to show participant name if available
      try {
        const sessions = await DatabaseService.getChatSessions();
        const s = sessions.find(ss => ss.sessionId === sessionId);
        if (s) {
          setParticipantName(s.participantName || null);
        } else {
          // If no session found, create one with current user's name
          const currentUserName = MessagingService.getCurrentUserName();
          if (currentUserName) {
            await DatabaseService.saveChatSession({
              sessionId,
              participantName: currentUserName,
              createdAt: Date.now(),
              lastMessageAt: Date.now(),
            });
            setParticipantName(currentUserName);
          }
        }
      } catch (e) {
        console.warn('Error loading/saving session info:', e);
      }
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
      
    } catch (error) {
      console.error('Error initializing chat:', error);
      Alert.alert('Error', 'Failed to load chat history');
    } finally {
      setIsLoading(false);
    }
  };

  const generateSessionQR = async () => {
    try {
      const currentUserName = MessagingService.getCurrentUserName();
      if (currentUserName) {
        // Create QR data for current session
        const qrData = QRCodeService.generateQRCodeData(currentUserName);
        qrData.sessionId = sessionId;
        qrData.timestamp = Date.now();
        
        const qrString = JSON.stringify(qrData);
        setQrValue(qrString);
        setHostName(currentUserName);
      }
    } catch (error) {
      console.error('Error generating session QR:', error);
    }
  };

  const handleIncomingMessage = (messageData: MessageEventData) => {
    if (messageData.sessionId === sessionId) {
      // Ignore echoes of our own messages (e.g., from Firebase listeners)
      const currentUser = MessagingService.getCurrentUserName();
      if (currentUser && messageData.sender === currentUser) {
        return;
      }

      // Handle system events
      if (messageData.type === 'system') {
        if (messageData.event === 'disconnected') {
          setPeerDisconnected(true);
          setSessionEnded(true);
          // Persist flag locally so it remains across navigations
          AsyncStorage.setItem(`sessionEnded:${sessionId}`, '1').catch(() => {});
        } else if (messageData.event === 'joined') {
          if (messageData.sender && messageData.sender !== 'system') {
            setParticipantName(messageData.sender);
            DatabaseService.updateSessionParticipantName(sessionId, messageData.sender).catch(() => {});
          }
        }
      }

      // If name missing or still placeholder, set it from first real incoming message
      if ((!participantName || participantName === 'Unknown') && messageData.sender && messageData.type !== 'system' && messageData.sender !== 'system') {
        setParticipantName(messageData.sender);
        DatabaseService.updateSessionParticipantName(sessionId, messageData.sender).catch(() => {});
      }
      const newMessage: Message = {
        sessionId,
        content: messageData.content,
        sender: messageData.sender,
        timestamp: messageData.timestamp,
        isOwn: false,
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isSending) return;
    if (peerDisconnected) {
      Alert.alert('Partner disconnected', 'You cannot send messages anymore in this session.');
      return;
    }
    if (!MessagingService.isConnected()) {
      Alert.alert('Not connected', 'Please wait until the chat connects.');
      return;
    }

    // Visual feedback: button press animation
    Animated.sequence([
      Animated.timing(sendButtonScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(sendButtonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Haptic feedback
    if (Platform.OS === 'ios') {
      Vibration.vibrate(50);
    }
    
    const messageText = inputText.trim();
    setInputText('');
    setIsSending(true);
    
    try {
      // Create message object
      const currentUserName = MessagingService.getCurrentUserName() || 'me';
      const message: Message = {
        sessionId,
        content: messageText,
        sender: currentUserName,
        timestamp: Date.now(),
        isOwn: true,
      };
      
      // Add to local state immediately
      setMessages(prev => [...prev, message]);
      
      // Save to database
      await DatabaseService.saveMessage(message);
      
      // Update session last message time
      await DatabaseService.updateSessionLastMessage(sessionId, Date.now());
      
      // Send via messaging service
      await MessagingService.sendMessage(messageText);
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      
      // Remove from local state if failed
      setMessages(prev => prev.filter(m => m.timestamp !== Date.now()));
    } finally {
      setIsSending(false);
    }
  };

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      // For iOS, you might want to use a different notification method
      console.log('Toast:', message);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect',
      'Are you sure you want to disconnect from this chat session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            MessagingService.disconnect();
            onDisconnect();
          }
        }
      ]
    );
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <Animated.View 
      style={[
        styles.messageContainer,
        item.isOwn ? styles.ownMessage : styles.otherMessage,
        {
          transform: [{ scale: messageBubbleScale }]
        }
      ]}
    >
      {!item.isOwn && participantName && (
        <Text 
          style={[styles.senderName, { color: colors.text }]}
        >
          {participantName}
        </Text>
      )}
      
      <View
        style={[
          styles.messageBubble,
          item.isOwn ? styles.ownMessageBubble : styles.otherMessageBubble,
          {
            backgroundColor: item.isOwn ? colors.myMessage : colors.otherMessage,
            borderColor: item.isOwn ? colors.myMessage : colors.borderColor,
          }
        ]}
      >
        <Text
          style={[
            styles.messageText,
            {
              color: item.isOwn ? colors.myMessageText : colors.otherMessageText,
            }
          ]}
        >
          {item.content}
        </Text>
        
        <Text
          style={[
            styles.messageTime,
            {
              color: item.isOwn ? colors.myMessageText + '80' : colors.otherMessageText + '80',
            }
          ]}
        >
          {formatTime(item.timestamp)}
        </Text>
      </View>
    </Animated.View>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading chat...
          </Text>
          <Text style={[styles.loadingSubtext, { color: colors.placeholderText }]}>
            Connecting to your conversation
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderColor }]}>
        <View style={styles.headerLeftRow}>
          <TouchableOpacity 
            onPress={onBack}
            style={[
              styles.backPill,
              { borderColor: colors.borderColor, backgroundColor: colors.cardBackground }
            ]}
            activeOpacity={0.8}
          >
            <Text style={[styles.backPillText, { color: colors.text }]}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleDisconnect}
            disabled={!isConnected || peerDisconnected || sessionEnded}
            style={[
              styles.backPill,
              { 
                borderColor: colors.borderColor, 
                backgroundColor: colors.cardBackground,
                opacity: (!isConnected || peerDisconnected || sessionEnded) ? 0.5 : 1,
              }
            ]}
            activeOpacity={0.8}
          >
            <IconSymbol name="xmark" size={20} color={colors.text} />
            <Text style={[styles.backPillText, { color: colors.text }]}>
              {peerDisconnected || sessionEnded ? 'Disconnected' : 'Disconnect'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {participantName && participantName !== 'Unknown' ? participantName : 'Chat Session'}
          </Text>
        </View>
        {/* Removed QR button */}
      </View>

      {/* Peer status banner */}
      {peerDisconnected && (
        <View style={[styles.peerBanner, { backgroundColor: colors.cardBackground, borderColor: colors.borderColor }]}> 
          <Text style={{ color: colors.text }}>
            Your chat partner has disconnected. You can no longer send messages.
          </Text>
        </View>
      )}

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => `${item.sessionId}-${item.timestamp}-${item.isOwn ? 'me' : item.sender}-${item.id ?? index}`}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyContent}>
              <IconSymbol 
                name="message.circle" 
                size={80} 
                color={colors.placeholderText} 
                style={styles.emptyIcon}
              />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Start the Conversation!
              </Text>
              <Text style={[styles.emptyText, { color: colors.placeholderText }]}>
                Send your first message to begin chatting with {participantName || 'your partner'}
              </Text>
            </View>
          </View>
        }
      />

      {/* Input Area */}
      <View style={[styles.inputContainer, { borderTopColor: colors.borderColor }]}>
        <TextInput
          style={[
            styles.textInput,
            {
              borderColor: colors.borderColor,
              color: colors.text,
              backgroundColor: colors.cardBackground
            }
          ]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor={colors.placeholderText}
          multiline
          maxLength={1000}
          onSubmitEditing={sendMessage}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { 
              backgroundColor: colors.primary,
              opacity: (!inputText.trim() || isSending || peerDisconnected) ? 0.4 : 1,
              transform: [{ scale: sendButtonScale }]
            }
          ]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isSending || peerDisconnected}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <IconSymbol name="paperplane.fill" size={18} color="white" />
          )}
        </TouchableOpacity>
      </View>

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <View />
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {qrValue && (
              <View style={styles.qrModalContainer}>
                <View style={styles.qrCodeWrapper}>
                  <QRCode
                    value={qrValue}
                    size={240}
                    color={colors.text}
                    backgroundColor="white"
                  />
                </View>
                {/* Labels removed for a cleaner QR-only view */}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  loadingSubtext: {
    marginTop: 4,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 999,
  },
  backPillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qrButton: {
    padding: 4,
  },
  // removed connectionIndicator styles
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  messageContainer: {
    marginVertical: 4,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  ownMessageBubble: {
    borderTopRightRadius: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  otherMessageBubble: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 16,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    opacity: 0.8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'right',
    opacity: 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    gap: 10,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 0,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  qrModalContainer: {
    padding: 20,
    alignItems: 'center',
  },
  qrCodeWrapper: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  qrInstructions: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  sessionInfo: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  hostInfo: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
  },
  peerBanner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
});
