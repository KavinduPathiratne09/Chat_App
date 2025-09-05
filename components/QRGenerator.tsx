import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import MessagingService from '@/services/MessagingService';
import QRCodeService from '@/services/QRCodeService';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface QRGeneratorProps {
  onConnectionEstablished: (sessionId: string, participantName?: string) => void;
}

export default function QRGenerator({ onConnectionEstablished }: QRGeneratorProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const [userName, setUserName] = useState('');
  const [qrValue, setQrValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isWaitingForConnection, setIsWaitingForConnection] = useState(false);
  const [generatedSessionId, setGeneratedSessionId] = useState<string | null>(null);

  const generateQRCode = async () => {
    if (!userName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setIsGenerating(true);
    try {
      const qrString = await QRCodeService.createQRCodeString(userName.trim());
      setQrValue(qrString);
      setIsWaitingForConnection(true);
      
      // Parse the QR data to get session ID
      const qrData = QRCodeService.parseQRCodeData(qrString);
      if (qrData) {
        setGeneratedSessionId(qrData.sessionId);
        // Initialize connection for the host
        const connected = await MessagingService.initializeConnection({
          sessionId: qrData.sessionId,
          userName: userName.trim(),
          serverUrl: qrData.serverUrl
        });

        // Keep QR visible; user will choose when to open chat.
        // We still show controls below (share/copy/open chat).
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      Alert.alert('Error', 'Failed to generate QR code. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (qrString: string) => {
    try {
      await Clipboard.setStringAsync(qrString);
      Alert.alert('Copied!', 'QR code data copied to clipboard. You can share it manually.');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('Error', 'Failed to copy to clipboard.');
    }
  };

  const shareQRCode = async (qrString: string) => {
    try {
      const qrData = QRCodeService.parseQRCodeData(qrString);
      if (!qrData) {
        Alert.alert('Error', 'Invalid QR code data');
        return;
      }

      // Create a user-friendly sharing message
      const shareMessage = `🚀 Join my InstantChat session!

👤 Host: ${qrData.userName}
📱 Session ID: ${qrData.sessionId}
⏰ Valid until: ${new Date(qrData.timestamp + 60 * 60 * 1000).toLocaleString()}

📋 To join:
1. Open InstantChat app
2. Tap "Scan QR Code"
3. Tap "Enter Code Manually"
4. Paste this data: ${qrString}

Or scan the QR code directly!`;

      await Share.share({
        message: shareMessage,
        title: 'Join my InstantChat session!'
      });
    } catch (error) {
      console.error('Error sharing QR code:', error);
      Alert.alert('Error', 'Failed to share QR code. Please try again.');
    }
  };

  const resetQRCode = () => {
    setQrValue('');
    setIsWaitingForConnection(false);
    setGeneratedSessionId(null);
    MessagingService.disconnect();
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
            setQrValue('');
            setIsWaitingForConnection(false);
            setGeneratedSessionId(null);
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!qrValue ? (
        <View style={styles.setupContainer}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.heroIcon, { color: colors.primary }]}>📱</Text>
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>
              Create QR Code
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.text }]}>
              Generate a QR code for others to scan and join your chat
            </Text>
          </View>

          {/* Input Section */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              What's your name?
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.cardBackground, borderColor: colors.borderColor }]}>
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                value={userName}
                onChangeText={setUserName}
                placeholder="Enter your name"
                placeholderTextColor={colors.placeholderText}
                maxLength={50}
                autoCapitalize="words"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.generateButton,
                { backgroundColor: colors.primary },
                isGenerating && styles.disabledButton
              ]}
              onPress={generateQRCode}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Text style={styles.buttonIcon}>🚀</Text>
                  <Text style={styles.buttonText}>Generate QR Code</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.qrContainer}>
          {/* QR Display Section */}
          <View style={styles.qrDisplaySection}>
            <View style={[styles.qrCodeWrapper, { backgroundColor: colors.cardBackground }]}>
              <QRCode
                value={qrValue}
                size={200}
                color={colors.text}
                backgroundColor={colors.cardBackground}
              />
            </View>
            <Text style={[styles.qrTitle, { color: colors.text }]}>
              Your QR Code is Ready!
            </Text>
            <Text style={[styles.qrSubtitle, { color: colors.text }]}>
              Share this code with friends to start chatting
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <View style={styles.primaryActions}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (generatedSessionId) {
                    onConnectionEstablished(generatedSessionId);
                  }
                }}
              >
                <Text style={styles.primaryButtonIcon}>💬</Text>
                <Text style={styles.primaryButtonText}>Open Chat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.secondary }]}
                onPress={() => shareQRCode(qrValue)}
              >
                <Text style={styles.primaryButtonIcon}>📤</Text>
                <Text style={styles.primaryButtonText}>Share</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.secondaryActions}>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.borderColor }]}
                onPress={() => copyToClipboard(qrValue)}
              >
                <Text style={[styles.secondaryButtonIcon, { color: colors.text }]}>📋</Text>
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Copy Code</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.borderColor }]}
                onPress={resetQRCode}
              >
                <Text style={[styles.secondaryButtonIcon, { color: colors.text }]}>🔄</Text>
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>New Code</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.dangerButton, { borderColor: colors.danger }]}
              onPress={handleDisconnect}
            >
              <Text style={[styles.dangerButtonIcon, { color: colors.danger }]}>❌</Text>
              <Text style={[styles.dangerButtonText, { color: colors.danger }]}>Disconnect</Text>
            </TouchableOpacity>
          </View>

          {/* Status Indicator */}
          {isWaitingForConnection && (
            <View style={[styles.statusContainer, { backgroundColor: colors.success + '10', borderColor: colors.success + '30' }]}>
              <ActivityIndicator 
                size="small" 
                color={colors.success} 
                style={styles.statusSpinner}
              />
              <Text style={[styles.statusText, { color: colors.success }]}>
                QR is active. Ask your friend to scan, then tap "Open Chat"
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  
  // Setup Container (Before QR Generation)
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  heroIcon: {
    fontSize: 40,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  inputSection: {
    width: '100%',
    maxWidth: 320,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputWrapper: {
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  textInput: {
    padding: 20,
    fontSize: 16,
    borderRadius: 12,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonIcon: {
    fontSize: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  
  // QR Container (After QR Generation)
  qrContainer: {
    flex: 1,
    alignItems: 'center',
  },
  qrDisplaySection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  qrCodeWrapper: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 24,
  },
  qrTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  qrSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 22,
  },
  
  // Action Buttons
  actionButtonsContainer: {
    width: '100%',
    maxWidth: 320,
    gap: 16,
  },
  primaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
  },
  primaryButtonIcon: {
    fontSize: 18,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 6,
  },
  secondaryButtonIcon: {
    fontSize: 16,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 6,
  },
  dangerButtonIcon: {
    fontSize: 16,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Status Indicator
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  statusSpinner: {
    marginRight: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});
