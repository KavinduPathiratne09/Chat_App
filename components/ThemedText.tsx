import { Colors, DesignTokens } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { Platform, StyleSheet, Text, TextProps, TextStyle } from 'react-native';

interface ThemedTextProps extends TextProps {
  type?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'bodyBold' | 'caption' | 'captionBold' | 'small';
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'muted';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  children: React.ReactNode;
}

export function ThemedText({ 
  type = 'body', 
  variant = 'primary',
  weight,
  align = 'auto',
  style, 
  children, 
  ...props 
}: ThemedTextProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  // Get typography styles with safety check
  const typographyStyle = DesignTokens.typography[type] as TextStyle;
  
  // Safety check - if typographyStyle is undefined, use a default
  if (!typographyStyle) {
    console.warn(`Typography style for type '${type}' not found, using default`);
  }
  
  // Get variant color
  const getVariantColor = () => {
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
        return colors.text;
    }
  };

  // Get font weight with proper type safety and fallback
  const getFontWeight = (): TextStyle['fontWeight'] => {
    if (weight) {
      switch (weight) {
        case 'normal':
          return '400';
        case 'medium':
          return '500';
        case 'semibold':
          return '600';
        case 'bold':
          return '700';
        default:
          return typographyStyle?.fontWeight || '400';
      }
    }
    return typographyStyle?.fontWeight || '400';
  };

  return (
    <Text
      style={[
        styles.base,
        typographyStyle || {},
        {
          color: getVariantColor(),
          fontWeight: getFontWeight(),
          textAlign: align,
        },
        style,
      ]}
      accessible={true}
      accessibilityRole="text"
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});
