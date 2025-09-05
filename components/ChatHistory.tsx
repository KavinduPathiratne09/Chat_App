import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import DatabaseService, { ChatSession } from '@/services/DatabaseService';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface ChatHistoryProps {
  onSessionSelect: (sessionId: string) => void;
}

export default function ChatHistory({ onSessionSelect }: ChatHistoryProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadChatSessions();
  }, []);

  const loadChatSessions = async () => {
    try {
      const chatSessions = await DatabaseService.getChatSessions();
      setSessions(chatSessions);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      Alert.alert('Error', 'Failed to load chat history');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadChatSessions();
    setIsRefreshing(false);
  };

  const deleteSession = (sessionId: string, participantName: string) => {
    Alert.alert(
      'Delete Chat',
      `Are you sure you want to delete the chat with ${participantName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteChatSession(sessionId);
              setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
            } catch (error) {
              console.error('Error deleting session:', error);
              Alert.alert('Error', 'Failed to delete chat session');
            }
          }
        }
      ]
    );
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderSession = ({ item }: { item: ChatSession }) => (
    <TouchableOpacity
      style={[styles.sessionItem, { borderBottomColor: colors.borderColor }]}
      onPress={() => onSessionSelect(item.sessionId)}
      onLongPress={() => deleteSession(item.sessionId, item.participantName)}
    >
      <View style={styles.sessionInfo}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {item.participantName.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.sessionDetails}>
          <Text style={[styles.participantName, { color: colors.text }]}>
            {item.participantName}
          </Text>
          <Text style={[styles.sessionId, { color: colors.placeholderText }]}>
            Session: {item.sessionId.substring(0, 8)}...
          </Text>
        </View>
      </View>

      <View style={styles.sessionMeta}>
        <Text style={[styles.sessionDate, { color: colors.placeholderText }]}>
          {formatDate(item.lastMessageAt)}
        </Text>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteSession(item.sessionId, item.participantName)}
        >
          <IconSymbol name="trash" size={16} color={colors.placeholderText} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading chat history...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>Chat History</Text>
        <TouchableOpacity
          onPress={async () => {
            if (sessions.length === 0) return;
            Alert.alert(
              'Clear All Chats',
              'This will permanently delete all chat sessions and messages on this device.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete All',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      for (const s of sessions) {
                        await DatabaseService.deleteChatSession(s.sessionId);
                      }
                      setSessions([]);
                    } catch (error) {
                      console.error('Error clearing all sessions:', error);
                      Alert.alert('Error', 'Failed to clear chat history');
                    }
                  },
                },
              ]
            );
          }}
          disabled={sessions.length === 0}
          style={[styles.clearAllButton, { opacity: sessions.length === 0 ? 0.4 : 1 }]}
        >
          <Text style={[styles.clearAllText, { color: colors.tint }]}>Clear All</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={(item) => item.sessionId}
        style={styles.sessionsList}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <IconSymbol 
              name="message" 
              size={64} 
              color={colors.placeholderText} 
              style={styles.emptyIcon}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Chat History
            </Text>
            <Text style={[styles.emptyText, { color: colors.placeholderText }]}>
              Your chat sessions will appear here once you start chatting with someone.
            </Text>
          </View>
        }
      />
    </View>
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 20,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sessionsList: {
    flex: 1,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  sessionDetails: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  sessionId: {
    fontSize: 12,
  },
  sessionMeta: {
    alignItems: 'flex-end',
    gap: 8,
  },
  sessionDate: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    paddingTop: 100,
  },
  emptyIcon: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});
