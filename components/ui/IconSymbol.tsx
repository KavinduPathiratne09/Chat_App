import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';

interface IconSymbolProps extends TextProps {
  name: string;
  size?: number;
  color?: string;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'muted';
}

export function IconSymbol({ 
  name, 
  size = 24, 
  color, 
  variant = 'default',
  style, 
  ...props 
}: IconSymbolProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];

  const getIconColor = () => {
    if (color) return color;
    
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.secondary;
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'danger':
        return colors.danger;
      case 'muted':
        return colors.textSecondary;
      default:
        // Safe fallback if icon property doesn't exist
        return colors.textSecondary || colors.text || '#6B7280';
    }
  };

  // Enhanced icon mapping with modern symbols
  const getIconSymbol = (iconName: string) => {
    const iconMap: { [key: string]: string } = {
      // Navigation
      'home': '🏠',
      'back': '←',
      'forward': '→',
      'close': '✕',
      'menu': '☰',
      'chevron.right': '▶️',
      
      // Actions
      'add': '+',
      'edit': '✏️',
      'delete': '🗑️',
      'share': '📤',
      'download': '⬇️',
      'upload': '⬆️',
      'search': '🔍',
      'filter': '🔧',
      'sort': '↕️',
      'trash': '🗑️',
      'xmark': '✕',
      
      // Communication
      'chat': '💬',
      'message': '💌',
      'mail': '📧',
      'phone': '📞',
      'video': '📹',
      'call': '📞',
      'paperplane.fill': '📤',
      'message.fill': '💬',
      
      // Media
      'camera': '📷',
      'photo': '🖼️',
      
      'music': '🎵',
      'play': '▶️',
      'pause': '⏸️',
      'stop': '⏹️',
      
      // Status
      'check': '✓',
      'check-circle': '✅',
      'error': '❌',
      'warning': '⚠️',
      'info': 'ℹ️',
      'success': '✅',
      'info.circle.fill': 'ℹ️',
      
      // Social
      'like': '❤️',
      'dislike': '👎',
      'star': '⭐',
      'heart': '💖',
      'user': '👤',
      'group': '👥',
      
      // Technology
      'wifi': '📶',
      'bluetooth': '🔵',
      'battery': '🔋',
      'settings': '⚙️',
      'gear': '⚙️',
      'lock': '🔒',
      'unlock': '🔓',
      'key': '🔑',
      
      // QR and Barcode
      'qrcode': '📱',
      'barcode': '📊',
      'scan': '🔍',
      
      // Time
      'clock': '🕐',
      'calendar': '📅',
      'time': '⏰',
      
      // Location
      'location': '📍',
      'map': '🗺️',
      'pin': '📌',
      
      // Files
      'file': '📄',
      'folder': '📁',
      'document': '📋',
      
      // Default fallback
      'default': '🔘',
    };

    return iconMap[iconName.toLowerCase()] || iconMap['default'] || '🔘';
  };

  return (
    <Text
      style={[
        styles.icon,
        {
          fontSize: size,
          lineHeight: size,
          color: getIconColor(),
        },
        style,
      ]}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={`${name} icon`}
      {...props}
    >
      {getIconSymbol(name)}
    </Text>
  );
}

const styles = StyleSheet.create({
  icon: {
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
