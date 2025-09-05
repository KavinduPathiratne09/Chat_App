import { ThemedView } from '@/components/ThemedView';
import { Colors, DesignTokens } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
  margin?: 'none' | 'small' | 'medium' | 'large';
  borderRadius?: 'small' | 'medium' | 'large' | 'xlarge';
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  variant = 'default',
  padding = 'medium',
  margin = 'none',
  borderRadius = 'medium',
  style,
}: CardProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: colors.cardBackground,
          ...DesignTokens.shadows.medium,
        };
      case 'outlined':
        return {
          backgroundColor: colors.cardBackground,
          borderColor: colors.borderColor,
          borderWidth: 1,
        };
      case 'filled':
        return {
          backgroundColor: colors.cardBackgroundSecondary,
        };
      default:
        return {
          backgroundColor: colors.cardBackground,
          ...DesignTokens.shadows.small,
        };
    }
  };

  const getPadding = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'small':
        return DesignTokens.spacing.md;
      case 'large':
        return DesignTokens.spacing.xl;
      default: // medium
        return DesignTokens.spacing.lg;
    }
  };

  const getMargin = () => {
    switch (margin) {
      case 'none':
        return 0;
      case 'small':
        return DesignTokens.spacing.sm;
      case 'large':
        return DesignTokens.spacing.lg;
      default: // medium
        return DesignTokens.spacing.md;
    }
  };

  const getBorderRadius = () => {
    return DesignTokens.borderRadius[borderRadius];
  };

  return (
    <ThemedView
      style={[
        styles.card,
        getVariantStyles(),
        {
          padding: getPadding(),
          margin: getMargin(),
          borderRadius: getBorderRadius(),
        },
        style,
      ]}
    >
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    // Base card styles
  },
});
