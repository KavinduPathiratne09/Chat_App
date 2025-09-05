import { Camera } from 'expo-camera';
import * as Crypto from 'expo-crypto';

export interface QRCodeData {
  sessionId: string;
  userName: string;
  serverUrl: string;
  timestamp: number;
}

class QRCodeService {
  async requestCameraPermissions(): Promise<boolean> {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      return false;
    }
  }

  async generateSessionId(): Promise<string> {
    try {
      // Generate a unique session ID using crypto
      const randomBytes = await Crypto.getRandomBytesAsync(16);
      const sessionId = Array.from(randomBytes, byte => 
        byte.toString(16).padStart(2, '0')
      ).join('');
      
      return sessionId;
    } catch (error) {
      console.error('Error generating session ID:', error);
      // Fallback to timestamp-based ID
      return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  generateQRCodeData(userName: string): QRCodeData {
    // For demo purposes, using a placeholder server URL
    // In production, this would be your actual signaling server
    const serverUrl = 'wss://your-signaling-server.com';
    
    return {
      sessionId: '',  // Will be filled by generateSessionId()
      userName,
      serverUrl,
      timestamp: Date.now()
    };
  }

  async createQRCodeString(userName: string): Promise<string> {
    try {
      const sessionId = await this.generateSessionId();
      const qrData = this.generateQRCodeData(userName);
      qrData.sessionId = sessionId;
      
      return JSON.stringify(qrData);
    } catch (error) {
      console.error('Error creating QR code string:', error);
      throw error;
    }
  }

  parseQRCodeData(qrString: string): QRCodeData | null {
    try {
      const data = JSON.parse(qrString);
      
      // Validate required fields
      if (!data.sessionId || !data.userName || !data.timestamp) {
        console.error('Invalid QR code data: missing required fields');
        return null;
      }

      // Check if QR code is not too old (e.g., max 1 hour)
      const maxAge = 60 * 60 * 1000; // 1 hour in milliseconds
      const age = Date.now() - data.timestamp;
      
      if (age > maxAge) {
        console.error('QR code expired');
        return null;
      }

      return data as QRCodeData;
    } catch (error) {
      console.error('Error parsing QR code data:', error);
      return null;
    }
  }

  async checkCameraPermissions(): Promise<{
    granted: boolean;
    canAskAgain: boolean;
  }> {
    try {
      const { status, canAskAgain } = await Camera.getCameraPermissionsAsync();
      return {
        granted: status === 'granted',
        canAskAgain
      };
    } catch (error) {
      console.error('Error checking camera permissions:', error);
      return { granted: false, canAskAgain: true };
    }
  }
}

export default new QRCodeService();
