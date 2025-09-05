import AppLogo from '@/components/AppLogo';
import ChatHistory from '@/components/ChatHistory';
import ChatInterface from '@/components/ChatInterface';
import InAppNotification from '@/components/InAppNotification';
import QRGenerator from '@/components/QRGenerator';
import QRScanner from '@/components/QRScanner';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Card } from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors, DesignTokens } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import DatabaseService from '@/services/DatabaseService';
import MessagingService, { MessageEventData } from '@/services/MessagingService';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AppState = 'menu' | 'generate' | 'scan' | 'chat' | 'history';

// Removed unused screenWidth

export default function HomeScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  

  
  const [appState, setAppState] = useState<AppState>('menu');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [notification, setNotification] = useState<{ visible: boolean; title: string; message: string; sessionId?: string } | null>(null);
  const appStateRef = useRef<AppState>(appState);
  const currentSessionIdRef = useRef<string | null>(currentSessionId);

  useEffect(() => {
    initializeApp();
    const onMessage = (msg: MessageEventData) => {
      // Ignore own messages
      const me = MessagingService.getCurrentUserName?.();
      if (me && msg.sender === me) return;
      // Show only when not already inside the same chat screen
      const state = appStateRef.current;
      const sid = currentSessionIdRef.current;
      if (state !== 'chat' || (sid && sid !== msg.sessionId)) {
        setNotification({
          visible: true,
          title: `${msg.sender}`,
          message: msg.content,
          sessionId: msg.sessionId,
        });
      }
    };
    MessagingService.addMessageListener(onMessage);
    return () => {
      MessagingService.removeMessageListener(onMessage);
    };
  }, []);

  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  const initializeApp = async () => {
    try {
      // Initialize database
      await DatabaseService.initialize();
      
      // Try to restore connection if exists
      await MessagingService.restoreConnection();
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing app:', error);
      Alert.alert('Initialization Error', 'Failed to initialize the app. Please restart.');
    }
  };

  const handleConnectionEstablished = async (sessionId: string, participantName?: string) => {
    setCurrentSessionId(sessionId);
    setAppState('chat');

    // Save chat session so it appears in history
    try {
      const now = Date.now();
      const currentUserName = MessagingService.getCurrentUserName();
      
      // Save session with both participant names
      await DatabaseService.saveChatSession({
        sessionId,
        participantName: participantName || currentUserName || 'Unknown',
        createdAt: now,
        lastMessageAt: now,
      });
      
      // Also save the current user's name to the session
      if (currentUserName) {
        await DatabaseService.updateSessionParticipantName(sessionId, currentUserName);
      }
    } catch (err) {
      console.warn('Failed to save chat session:', err);
    }
  };

  const handleDisconnect = () => {
    setCurrentSessionId(null);
    setAppState('menu');
  };

  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setAppState('chat');
  };

  if (!isInitialized) {
    return (
      <ThemedView style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <AppLogo size="large" />
        <ThemedText type="body" variant="muted" style={styles.loadingText}>
          Initializing...
        </ThemedText>
      </ThemedView>
    );
  }

  const renderContent = () => {
    switch (appState) {
      case 'generate':
        return (
          <QRGenerator 
            onConnectionEstablished={handleConnectionEstablished}
          />
        );
      
      case 'scan':
        return (
          <QRScanner 
            onConnectionEstablished={handleConnectionEstablished}
          />
        );
      
      case 'chat':
        return currentSessionId ? (
          <ChatInterface 
            sessionId={currentSessionId}
            onDisconnect={handleDisconnect}
            onBack={() => setAppState('menu')}
          />
        ) : null;
      
      case 'history':
        return (
          <ChatHistory 
            onSessionSelect={handleSessionSelect}
          />
        );
      
      default:
        return (
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Enhanced Header */}
            <ThemedView style={styles.header}>
              <AppLogo size="medium" />
              <ThemedText 
                type="small" 
                variant="muted" 
                align="center"
                style={styles.subtitle}
              >
                Connect instantly with QR codes
              </ThemedText>
            </ThemedView>

            {/* Enhanced Menu Container */}
            <View style={styles.menuContainer}>
              <View style={styles.gridItem}>
                <MenuCard
                title="Generate QR Code"
                subtitle="Create a QR code for others to scan"
                icon="qrcode"
                onPress={() => setAppState('generate')}
                variant="primary"
                />
              </View>

              <View style={styles.gridItem}>
                <MenuCard
                title="Scan QR Code"
                subtitle="Scan QR code to connect"
                icon="camera"
                onPress={() => setAppState('scan')}
                variant="secondary"
                />
              </View>

              <View style={styles.gridItemFull}>
                <MenuCard
                title="Chat History"
                subtitle="View your previous conversations"
                icon="clock"
                onPress={() => setAppState('history')}
                variant="outline"
                />
              </View>
            </View>

            {/* Spacer below grid to avoid overlap with toggle */}
            <View style={{ height: DesignTokens.spacing.xl }} />

            {/* Theme Toggle Section */}
            <ThemedView style={styles.themeToggleContainer}>
              <ThemeToggle size="medium" />
            </ThemedView>

            {/* Footer Info */}
            <ThemedView style={styles.footer}>
              <ThemedText type="small" variant="muted" align="center">
                Secure • Fast • Private
              </ThemedText>
            </ThemedView>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {notification?.visible && (
        <InAppNotification
          visible={notification.visible}
          title={notification.title}
          message={notification.message}
          onPress={() => {
            if (notification.sessionId) {
              setCurrentSessionId(notification.sessionId);
              setAppState('chat');
            }
            setNotification(null);
          }}
          onClose={() => setNotification(null)}
        />
      )}
      {appState !== 'menu' && appState !== 'chat' && (
        <ThemedView 
          style={[
            styles.backButton, 
            { 
              backgroundColor: colors.cardBackground,
              borderColor: colors.borderColor,
            }
          ]}
        >
          <TouchableOpacity 
            onPress={() => setAppState('menu')}
            style={styles.backButtonTouchable}
            activeOpacity={0.8}
          >
            <ThemedText 
              type="bodyBold" 
              variant="primary"
              style={styles.backText}
            >
              Back
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      )}
      {renderContent()}
    </SafeAreaView>
  );
}

interface MenuCardProps {
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
}

const MenuCard: React.FC<MenuCardProps> = ({ title, subtitle, icon, onPress, variant }) => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primaryLight,
          borderColor: colors.primary,
        };
      case 'secondary':
        return {
          backgroundColor: colors.secondaryLight,
          borderColor: colors.secondary,
        };
      case 'outline':
        return {
          backgroundColor: colors.cardBackground,
          borderColor: colors.borderColor,
        };
      default:
        return {
          backgroundColor: colors.cardBackground,
          borderColor: colors.borderColor,
        };
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.secondary;
      default:
        return colors.text;
    }
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card
        variant="elevated"
        padding="large"
        margin="small"
        borderRadius="large"
        style={StyleSheet.flatten([
          styles.menuCard,
          getVariantStyles(),
        ])}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <View style={[styles.iconContainer, { backgroundColor: getIconColor() + '20' }]}>
              <IconSymbol 
                name={icon} 
                size={28} 
                color={getIconColor()}
              />
            </View>
          </View>
          <View style={styles.cardBottom}>
            <ThemedText 
              type="h4" 
              weight="semibold"
              style={[
                styles.cardTitle, 
                { color: getIconColor() }
              ]}
            >
              {title}
            </ThemedText>
            <ThemedText 
              type="small" 
              variant="muted"
              style={styles.cardSubtitle}
            >
              {subtitle}
            </ThemedText>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: DesignTokens.spacing.lg,
  },
  header: {
    paddingTop: DesignTokens.spacing.lg,
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingBottom: DesignTokens.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTitle: {
    marginTop: DesignTokens.spacing.sm,
    marginBottom: DesignTokens.spacing.xs,
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: DesignTokens.spacing.md,
    lineHeight: 24,
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: DesignTokens.spacing.sm,
    paddingVertical: DesignTokens.spacing.xs,
    gap: DesignTokens.spacing.sm,
    justifyContent: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: '48%',
  },
  gridItemFull: {
    width: '100%',
    marginBottom: DesignTokens.spacing.sm,
  },
  menuCard: {
    height: 200,
    borderWidth: 1,
  },
  cardContent: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: DesignTokens.spacing.sm,
  },
  cardTop: {
    alignItems: 'center',
  },
  cardBottom: {
    alignItems: 'center',
    gap: DesignTokens.spacing.xs,
    paddingBottom: DesignTokens.spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: DesignTokens.borderRadius.large,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    gap: DesignTokens.spacing.xs,
  },
  cardTitle: {
    marginBottom: DesignTokens.spacing.xs,
    textAlign: 'center',
  },
  cardSubtitle: {
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: DesignTokens.spacing.md,
  },
  footer: {
    paddingHorizontal: DesignTokens.spacing.md,
    paddingBottom: DesignTokens.spacing.md,
    alignItems: 'center',
  },
  themeToggleContainer: {
    paddingHorizontal: DesignTokens.spacing.md,
    paddingVertical: DesignTokens.spacing.md,
    marginTop: DesignTokens.spacing.xl,
    marginBottom: DesignTokens.spacing.sm,
    alignItems: 'center',
  },
  backButton: {
    paddingHorizontal: DesignTokens.spacing.md,
    paddingVertical: DesignTokens.spacing.sm,
    borderWidth: 1,
    borderRadius: DesignTokens.borderRadius.large,
    margin: DesignTokens.spacing.sm,
    alignSelf: 'flex-start',
  },
  backButtonTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DesignTokens.spacing.xs,
  },
  backText: {
    fontSize: 15,
  },
  loadingText: {
    marginTop: DesignTokens.spacing.lg,
  },
});
