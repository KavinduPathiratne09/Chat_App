import { Colors, DesignTokens } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';

interface AppLogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  useImage?: boolean;
  imageSource?: ImageSourcePropType;
}

export default function AppLogo({ size = 'medium', showText = true, useImage = true, imageSource }: AppLogoProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];

  const logoSizes = {
    small: { width: 48, height: 48, fontSize: 20, textSize: 14 },
    medium: { width: 80, height: 80, fontSize: 32, textSize: 16 },
    large: { width: 120, height: 120, fontSize: 48, textSize: 20 }
  };

  const currentSize = logoSizes[size];

  const source = imageSource || require('../assets/images/2.jpg');

  return (
    <View style={styles.container}>
      {useImage ? (
        <View style={[
          styles.imageContainer,
          {
            width: currentSize.width,
            height: currentSize.height,
            borderRadius: DesignTokens.borderRadius.large,
            ...DesignTokens.shadows.medium,
          }
        ]}>
          <Image
            source={source}
            style={[
              styles.image,
              {
                width: currentSize.width,
                height: currentSize.height,
                borderRadius: DesignTokens.borderRadius.large,
              }
            ]}
            resizeMode="cover"
          />
          {/* Overlay with chat icon */}
          <View style={[
            styles.overlay,
            {
              backgroundColor: colors.primary + '20',
              borderRadius: DesignTokens.borderRadius.large,
            }
          ]}>
            <Text style={[
              styles.chatIcon,
              { fontSize: currentSize.fontSize * 0.4 }
            ]}>
              💬
            </Text>
          </View>
        </View>
      ) : (
        <View style={[
          styles.logoIcon,
          {
            width: currentSize.width,
            height: currentSize.height,
            backgroundColor: colors.primary,
            borderRadius: DesignTokens.borderRadius.large,
            ...DesignTokens.shadows.medium,
          }
        ]}>
          {/* Enhanced chat bubble design */}
          <View style={[
            styles.chatBubble,
            {
              backgroundColor: colors.cardBackground,
              borderRadius: DesignTokens.borderRadius.medium,
            }
          ]}>
            <Text style={[
              styles.chatIcon,
              { fontSize: currentSize.fontSize * 0.35 }
            ]}>
              💬
            </Text>
          </View>
          
          {/* QR code indicator */}
          <View style={[
            styles.qrIcon,
            {
              backgroundColor: colors.cardBackground + 'F0',
              borderRadius: DesignTokens.borderRadius.small,
            }
          ]}>
            <Text style={[
              styles.qrText,
              { 
                fontSize: currentSize.fontSize * 0.25,
                color: colors.primary,
                fontWeight: 'bold',
              }
            ]}>
              QR
            </Text>
          </View>
        </View>
      )}

      {/* Enhanced App Name */}
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[
            styles.appName,
            {
              color: colors.text,
              fontSize: currentSize.textSize,
              fontWeight: '700',
              marginTop: size === 'large' ? DesignTokens.spacing.md : DesignTokens.spacing.sm,
            }
          ]}>
            InstantChat
          </Text>
          <Text style={[
            styles.appTagline,
            {
              color: colors.textSecondary,
              fontSize: currentSize.textSize * 0.7,
              marginTop: DesignTokens.spacing.xs,
            }
          ]}>
            Secure Messaging
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    // Image styles
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  chatBubble: {
    width: '60%',
    height: '60%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: '20%',
    left: '20%',
    ...DesignTokens.shadows.small,
  },
  chatIcon: {
    textAlign: 'center',
  },
  qrIcon: {
    width: '30%',
    height: '30%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: '15%',
    right: '15%',
    ...DesignTokens.shadows.small,
  },
  qrText: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  textContainer: {
    alignItems: 'center',
  },
  appName: {
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  appTagline: {
    textAlign: 'center',
    opacity: 0.8,
    letterSpacing: 0.3,
  },
});
