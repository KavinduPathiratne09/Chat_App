import { Colors, DesignTokens } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

interface ThemedViewProps extends ViewProps {
  variant?: 'default' | 'card' | 'cardSecondary' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  elevation?: 'none' | 'small' | 'medium' | 'large';
  borderRadius?: 'small' | 'medium' | 'large' | 'xlarge' | 'round';
  children: React.ReactNode;
}

export function ThemedView({ 
  variant = 'default',
  elevation = 'none',
  borderRadius = 'medium',
  style, 
  children, 
  ...props 
}: ThemedViewProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  // Get variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'card':
        return {
          backgroundColor: colors.cardBackground,
          borderColor: colors.borderColor,
          borderWidth: 1,
        };
      case 'cardSecondary':
        return {
          backgroundColor: colors.cardBackgroundSecondary,
          borderColor: colors.borderColorLight,
          borderWidth: 1,
        };
      case 'primary':
        return {
          backgroundColor: colors.primaryLight,
          borderColor: colors.primary,
          borderWidth: 1,
        };
      case 'secondary':
        return {
          backgroundColor: colors.secondaryLight,
          borderColor: colors.secondary,
          borderWidth: 1,
        };
      case 'success':
        return {
          backgroundColor: colors.successLight,
          borderColor: colors.success,
          borderWidth: 1,
        };
      case 'warning':
        return {
          backgroundColor: colors.warningLight,
          borderColor: colors.warning,
          borderWidth: 1,
        };
      case 'danger':
        return {
          backgroundColor: colors.dangerLight,
          borderColor: colors.danger,
          borderWidth: 1,
        };
      default:
        return {
          backgroundColor: 'transparent',
        };
    }
  };

  // Get elevation styles
  const getElevationStyles = () => {
    if (elevation === 'none') return {};
    return DesignTokens.shadows[elevation];
  };

  // Get border radius
  const getBorderRadius = () => {
    return DesignTokens.borderRadius[borderRadius];
  };

  return (
    <View
      style={[
        styles.base,
        getVariantStyles(),
        getElevationStyles(),
        {
          borderRadius: getBorderRadius(),
        },
        style,
      ]}
      accessible={true}
      accessibilityRole="none"
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    // Base styles
  },
});
