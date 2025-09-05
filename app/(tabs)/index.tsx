import AppLogo from '@/components/AppLogo';
import ChatHistory from '@/components/ChatHistory';
import ChatInterface from '@/components/ChatInterface';
import InAppNotification from '@/components/InAppNotification';
import QRGenerator from '@/components/QRGenerator';
import QRScanner from '@/components/QRScanner';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemeToggle } from '@/components/ThemeToggle';
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
            {/* New Hero Section */}
            <ThemedView style={styles.heroSection}>
              <View style={styles.heroContent}>
                <View style={styles.logoContainer}>
                  <AppLogo size="large" />
                </View>
                <ThemedText 
                  type="h2" 
                  weight="bold"
                  style={[styles.heroTitle, { color: colors.text }]}
                >
                  Instant Connect
                </ThemedText>
                <ThemedText 
                  type="body" 
                  variant="muted" 
                  align="center"
                  style={styles.heroSubtitle}
                >
                  Share, scan, and chat instantly with QR codes
                </ThemedText>
              </View>
              <View style={[styles.heroDecoration, { backgroundColor: colors.primary + '10' }]} />
            </ThemedView>

            {/* New Action Cards Section */}
            <View style={styles.actionsSection}>
              <ThemedText 
                type="h3" 
                weight="semibold"
                style={[styles.sectionTitle, { color: colors.text }]}
              >
                Quick Actions
              </ThemedText>
              
              <View style={styles.actionCardsContainer}>
                <View style={styles.primaryActions}>
                  <ActionCard
                    title="Generate"
                    subtitle="Create QR"
                    icon="qrcode"
                    onPress={() => setAppState('generate')}
                    variant="primary"
                    size="large"
                  />
                  <ActionCard
                    title="Scan"
                    subtitle="Connect"
                    icon="camera"
                    onPress={() => setAppState('scan')}
                    variant="secondary"
                    size="large"
                  />
                </View>
                
                <ActionCard
                  title="Chat History"
                  subtitle="View previous conversations"
                  icon="clock"
                  onPress={() => setAppState('history')}
                  variant="outline"
                  size="full"
                />
              </View>
            </View>

            {/* New Bottom Section */}
            <View style={styles.bottomSection}>
              <View style={styles.themeSection}>
                <ThemeToggle size="large" />
                <ThemedText 
                  type="small" 
                  variant="muted" 
                  style={styles.themeLabel}
                >
                  Theme
                </ThemedText>
              </View>
              
              <View style={styles.footerInfo}>
                <View style={styles.featureTags}>
                  <FeatureTag text="Secure" />
                  <FeatureTag text="Fast" />
                  <FeatureTag text="Private" />
                </View>
              </View>
            </View>
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

interface ActionCardProps {
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'large' | 'full';
}

const ActionCard: React.FC<ActionCardProps> = ({ title, subtitle, icon, onPress, variant, size = 'large' }) => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
          shadowColor: colors.primary,
        };
      case 'secondary':
        return {
          backgroundColor: colors.secondary,
          borderColor: colors.secondary,
          shadowColor: colors.secondary,
        };
      case 'outline':
        return {
          backgroundColor: colors.cardBackground,
          borderColor: colors.borderColor,
          shadowColor: colors.text,
        };
      default:
        return {
          backgroundColor: colors.cardBackground,
          borderColor: colors.borderColor,
          shadowColor: colors.text,
        };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
      case 'secondary':
        return colors.background;
      default:
        return colors.text;
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'primary':
      case 'secondary':
        return colors.background;
      default:
        return colors.text;
    }
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View
        style={[
          styles.actionCard,
          size === 'full' ? styles.actionCardFull : styles.actionCardLarge,
          getVariantStyles(),
        ]}
      >
        <View style={styles.actionCardContent}>
          <View style={[styles.actionIconContainer, { backgroundColor: getIconColor() + '20' }]}>
            <IconSymbol 
              name={icon} 
              size={size === 'full' ? 24 : 32} 
              color={getIconColor()}
            />
          </View>
          <View style={styles.actionTextContainer}>
            <ThemedText 
              type={size === 'full' ? 'h4' : 'h3'} 
              weight="bold"
              style={[styles.actionTitle, { color: getTextColor() }]}
            >
              {title}
            </ThemedText>
            <ThemedText 
              type="small" 
              variant={variant === 'outline' ? 'muted' : undefined}
              style={[styles.actionSubtitle, { color: getTextColor() }]}
            >
              {subtitle}
            </ThemedText>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

interface FeatureTagProps {
  text: string;
}

const FeatureTag: React.FC<FeatureTagProps> = ({ text }) => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  return (
    <View style={[styles.featureTag, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
      <ThemedText 
        type="small" 
        weight="medium"
        style={[styles.featureTagText, { color: colors.primary }]}
      >
        {text}
      </ThemedText>
    </View>
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
  
  // New Hero Section Styles
  heroSection: {
    paddingTop: DesignTokens.spacing.xl,
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingBottom: DesignTokens.spacing.xl,
    position: 'relative',
    overflow: 'hidden',
  },
  heroContent: {
    alignItems: 'center',
    zIndex: 2,
  },
  logoContainer: {
    marginBottom: DesignTokens.spacing.lg,
  },
  heroTitle: {
    fontSize: 32,
    marginBottom: DesignTokens.spacing.sm,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: DesignTokens.spacing.md,
  },
  heroDecoration: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.3,
  },
  
  // New Actions Section Styles
  actionsSection: {
    flex: 1,
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingBottom: DesignTokens.spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: DesignTokens.spacing.lg,
    textAlign: 'left',
  },
  actionCardsContainer: {
    gap: DesignTokens.spacing.lg,
  },
  primaryActions: {
    flexDirection: 'row',
    gap: DesignTokens.spacing.md,
  },
  
  // New Action Card Styles
  actionCard: {
    borderRadius: DesignTokens.borderRadius.xlarge,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  actionCardLarge: {
    flex: 1,
    height: 140,
  },
  actionCardFull: {
    height: 80,
  },
  actionCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: DesignTokens.spacing.lg,
    gap: DesignTokens.spacing.md,
  },
  actionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: DesignTokens.borderRadius.large,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextContainer: {
    flex: 1,
    gap: DesignTokens.spacing.xs,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  actionSubtitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  
  // New Bottom Section Styles
  bottomSection: {
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingBottom: DesignTokens.spacing.xl,
    gap: DesignTokens.spacing.lg,
  },
  themeSection: {
    alignItems: 'center',
    gap: DesignTokens.spacing.sm,
  },
  themeLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footerInfo: {
    alignItems: 'center',
  },
  featureTags: {
    flexDirection: 'row',
    gap: DesignTokens.spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  featureTag: {
    paddingHorizontal: DesignTokens.spacing.md,
    paddingVertical: DesignTokens.spacing.xs,
    borderRadius: DesignTokens.borderRadius.round,
    borderWidth: 1,
  },
  featureTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Legacy styles for other screens
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
