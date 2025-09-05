import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import MessagingService from '@/services/MessagingService';
import QRCodeService from '@/services/QRCodeService';
import { BarcodeScanningResult, CameraView } from 'expo-camera';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface QRScannerProps {
  onConnectionEstablished: (sessionId: string, participantName?: string) => void;
}

export default function QRScanner({ onConnectionEstablished }: QRScannerProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [userName, setUserName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);

  useEffect(() => {
    checkCameraPermissions();
  }, []);

  const checkCameraPermissions = async () => {
    const { granted } = await QRCodeService.checkCameraPermissions();
    setHasPermission(granted);
  };

  const requestPermission = async () => {
    const granted = await QRCodeService.requestCameraPermissions();
    setHasPermission(granted);
    
    if (!granted) {
      Alert.alert(
        'Camera Permission Required',
        'This app needs camera access to scan QR codes. Please enable camera permission in your device settings.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    // Only handle when scanning view is active and we're not already processing a scan
    if (!scanning || isProcessingScan) return;

    setIsProcessingScan(true);
    setScanning(false); // hide camera immediately to pause further scans
    processQRCode(data);
  };

  const processQRCode = (qrData: string) => {
    const parsedData = QRCodeService.parseQRCodeData(qrData);
    
    if (!parsedData) {
    Alert.alert(
        'Invalid QR Code',
        'This QR code is not valid for InstantChat or has expired.',
        [
      { text: 'Try Again', onPress: () => { setIsProcessingScan(false); setScanning(true); } },
          { text: 'Cancel' }
        ]
      );
      return;
    }

    setScannedData(parsedData);
    setShowNameInput(true);
  };

  const processManualCode = () => {
    if (!manualCode.trim()) {
      Alert.alert('Error', 'Please enter the QR code data');
      return;
    }

  processQRCode(manualCode.trim());
    setShowManualInput(false);
    setManualCode('');
  };

  const connectToChat = async () => {
    if (!userName.trim() || !scannedData) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setIsConnecting(true);
    
    try {
      const connected = await MessagingService.initializeConnection({
        sessionId: scannedData.sessionId,
        userName: userName.trim(),
        serverUrl: scannedData.serverUrl
      });

      if (connected) {
        // Go straight to chat for a smoother UX
        setShowNameInput(false);
        onConnectionEstablished(scannedData.sessionId, scannedData.userName);
        // Inform the host of the joiner name so their history updates immediately
        await MessagingService.sendSystemEvent('joined', userName.trim());
      } else {
        throw new Error('Failed to establish connection');
      }
    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert(
        'Connection Failed',
        'Unable to connect to the chat session. Please try again.',
        [
          { text: 'Retry', onPress: connectToChat },
          { text: 'Cancel', onPress: () => setShowNameInput(false) }
        ]
      );
    } finally {
      setIsConnecting(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <View style={[styles.loadingIcon, { backgroundColor: colors.primary + '15' }]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Checking camera permissions...
          </Text>
        </View>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}> 
        <View style={styles.permissionContainer}>
          <View style={[styles.permissionIcon, { backgroundColor: colors.warning + '15' }]}>
            <Text style={[styles.permissionIconText, { color: colors.warning }]}>📷</Text>
          </View>
          <Text style={[styles.permissionTitle, { color: colors.text }]}>
            Camera Access Required
          </Text>
          <Text style={[styles.permissionText, { color: colors.text }]}>
            We need access to your camera to scan QR codes and connect with others
          </Text>
          
          <View style={styles.permissionButtons}>
            <TouchableOpacity
              style={[styles.permissionButton, { backgroundColor: colors.primary }]}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonIcon}>🔓</Text>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.manualButton, { borderColor: colors.borderColor }]}
              onPress={() => setShowManualInput(true)}
            >
              <Text style={[styles.manualButtonIcon, { color: colors.text }]}>⌨️</Text>
              <Text style={[styles.manualButtonText, { color: colors.text }]}>Enter Code Manually</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!scanning ? (
        <View style={styles.scannerSetup}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={[styles.scannerIcon, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.scannerIconText, { color: colors.primary }]}>📱</Text>
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>
              Scan QR Code
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.text }]}>
              Point your camera at a QR code to join a chat session
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.scanButton, { backgroundColor: colors.primary }]}
              onPress={() => { setIsProcessingScan(false); setScanning(true); }}
            >
              <Text style={styles.scanButtonIcon}>📷</Text>
              <Text style={styles.scanButtonText}>Start Scanning</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.manualButton, { borderColor: colors.borderColor }]}
              onPress={() => setShowManualInput(true)}
            >
              <Text style={[styles.manualButtonIcon, { color: colors.text }]}>⌨️</Text>
              <Text style={[styles.manualButtonText, { color: colors.text }]}>
                Enter Code Manually
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={handleBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          />
          <View style={styles.overlay}>
            <View style={styles.scanArea} />
            <Text style={[styles.scanInstruction, { color: 'white' }]}>
              Position QR code within the frame
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: 'rgba(0,0,0,0.7)' }]}
            onPress={() => { setScanning(false); setIsProcessingScan(false); }}
          >
            <Text style={[styles.cancelButtonText, { color: 'white' }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Manual Input Modal */}
      <Modal
        visible={showManualInput}
        transparent
        animationType="slide"
        onRequestClose={() => setShowManualInput(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIcon, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.modalIconText, { color: colors.primary }]}>⌨️</Text>
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Enter QR Code Data
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.text }]}>
                Paste the QR code data you received
              </Text>
            </View>
            
            <View style={[styles.inputWrapper, { backgroundColor: colors.cardBackground, borderColor: colors.borderColor }]}>
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="Paste QR code data here..."
                placeholderTextColor={colors.placeholderText}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={processManualCode}
              >
                <Text style={styles.modalButtonIcon}>🔗</Text>
                <Text style={styles.modalButtonText}>Connect</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonOutlined, { borderColor: colors.borderColor }]}
                onPress={() => {
                  setShowManualInput(false);
                  setManualCode('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Name Input Modal - full screen to avoid overlap with scanner */}
      <Modal
        visible={showNameInput}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowNameInput(false)}
      >
        <View style={[styles.fullscreen, { backgroundColor: colors.background }]}> 
          <View style={[styles.joinModalContent, { backgroundColor: colors.background }]}>
            <View style={styles.joinModalHeader}>
              <View style={[styles.joinModalIcon, { backgroundColor: colors.success + '15' }]}>
                <Text style={[styles.joinModalIconText, { color: colors.success }]}>👋</Text>
              </View>
              <Text style={[styles.joinModalTitle, { color: colors.text }]}>
                Join Chat Session
              </Text>
              <Text style={[styles.joinModalText, { color: colors.text }]}>
                You're about to join {scannedData?.userName}'s chat session
              </Text>
            </View>
            
            <View style={styles.joinInputSection}>
              <Text style={[styles.joinInputLabel, { color: colors.text }]}>
                What's your name?
              </Text>
              <View style={[styles.joinInputWrapper, { backgroundColor: colors.cardBackground, borderColor: colors.borderColor }]}>
                <TextInput
                  style={[styles.joinTextInput, { color: colors.text }]}
                  value={userName}
                  onChangeText={setUserName}
                  placeholder="Enter your name"
                  placeholderTextColor={colors.placeholderText}
                  maxLength={50}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.joinModalButtons}>
              <TouchableOpacity
                style={[
                  styles.joinModalButton, 
                  { backgroundColor: colors.primary },
                  isConnecting && styles.disabledButton
                ]}
                onPress={connectToChat}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Text style={styles.joinModalButtonIcon}>💬</Text>
                    <Text style={styles.joinModalButtonText}>Join Chat</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.joinModalButton, styles.joinModalButtonOutlined, { borderColor: colors.borderColor }]}
                onPress={() => {
                  setShowNameInput(false);
                  setUserName('');
                  setScannedData(null);
                }}
                disabled={isConnecting}
              >
                <Text style={[styles.joinModalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
  
  // Permission State
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  permissionIconText: {
    fontSize: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  permissionButtons: {
    width: '100%',
    maxWidth: 320,
    gap: 16,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
  },
  permissionButtonIcon: {
    fontSize: 18,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Scanner Setup
  scannerSetup: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  scannerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  scannerIconText: {
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
  actionButtons: {
    width: '100%',
    maxWidth: 320,
    gap: 16,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 12,
  },
  scanButtonIcon: {
    fontSize: 20,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  manualButtonIcon: {
    fontSize: 16,
  },
  manualButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Camera View
  cameraContainer: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scanArea: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  scanInstruction: {
    position: 'absolute',
    bottom: 60,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cancelButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconText: {
    fontSize: 30,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  inputWrapper: {
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  textInput: {
    padding: 16,
    fontSize: 16,
    borderRadius: 12,
    textAlignVertical: 'top',
  },
  modalButtons: {
    gap: 12,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
  },
  modalButtonIcon: {
    fontSize: 18,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  
  // Join Modal
  fullscreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  joinModalContent: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 20,
  },
  joinModalHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  joinModalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  joinModalIconText: {
    fontSize: 40,
  },
  joinModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  joinModalText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 22,
  },
  joinInputSection: {
    marginBottom: 32,
  },
  joinInputLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  joinInputWrapper: {
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 4,
  },
  joinTextInput: {
    padding: 20,
    fontSize: 16,
    borderRadius: 12,
  },
  joinModalButtons: {
    gap: 16,
  },
  joinModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 12,
  },
  joinModalButtonIcon: {
    fontSize: 20,
  },
  joinModalButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  joinModalButtonOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
