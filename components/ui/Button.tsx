import { ThemedText } from '@/components/ThemedText';
import { Colors, DesignTokens } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
    TouchableOpacityProps,
    ViewStyle,
} from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  ...props
}: ButtonProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        };
      case 'secondary':
        return {
          backgroundColor: colors.secondary,
          borderColor: colors.secondary,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: colors.primary,
          borderWidth: 2,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        };
      case 'danger':
        return {
          backgroundColor: colors.danger,
          borderColor: colors.danger,
        };
      default:
        return {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: DesignTokens.spacing.sm,
          paddingHorizontal: DesignTokens.spacing.md,
          borderRadius: DesignTokens.borderRadius.small,
        };
      case 'large':
        return {
          paddingVertical: DesignTokens.spacing.lg,
          paddingHorizontal: DesignTokens.spacing.xl,
          borderRadius: DesignTokens.borderRadius.large,
        };
      default: // medium
        return {
          paddingVertical: DesignTokens.spacing.md,
          paddingHorizontal: DesignTokens.spacing.lg,
          borderRadius: DesignTokens.borderRadius.medium,
        };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'outline':
        return colors.primary;
      case 'ghost':
        return colors.primary;
      default:
        return '#FFFFFF';
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return 'captionBold';
      case 'large':
        return 'bodyBold';
      default:
        return 'bodyBold';
    }
  };

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getVariantStyles(),
        getSizeStyles(),
        {
          opacity: isDisabled ? 0.6 : 1,
          width: fullWidth ? '100%' : 'auto',
        },
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.8}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={getTextColor()}
          style={styles.loader}
        />
      ) : (
        <>
          {leftIcon && <>{leftIcon}</>}
          <ThemedText
            type={getTextSize()}
            style={[
              styles.text,
              {
                color: getTextColor(),
                marginLeft: leftIcon ? DesignTokens.spacing.sm : 0,
                marginRight: rightIcon ? DesignTokens.spacing.sm : 0,
              },
            ]}
          >
            {title}
          </ThemedText>
          {rightIcon && <>{rightIcon}</>}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    ...DesignTokens.shadows.small,
  },
  text: {
    textAlign: 'center',
  },
  loader: {
    marginHorizontal: DesignTokens.spacing.sm,
  },
});
