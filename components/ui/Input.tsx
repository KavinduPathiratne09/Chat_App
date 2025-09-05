import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors, DesignTokens } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import React, { useState } from 'react';
import {
    StyleSheet,
    TextInput,
    TextInputProps,
    TouchableOpacity,
    View,
} from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  variant?: 'default' | 'outlined' | 'filled';
  size?: 'small' | 'medium' | 'large';
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  variant = 'outlined',
  size = 'medium',
  style,
  ...props
}: InputProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const [isFocused, setIsFocused] = useState(false);

  const getVariantStyles = () => {
    switch (variant) {
      case 'outlined':
        return {
          backgroundColor: colors.cardBackground,
          borderColor: isFocused ? colors.primary : colors.borderColor,
          borderWidth: 2,
        };
      case 'filled':
        return {
          backgroundColor: colors.cardBackgroundSecondary,
          borderColor: isFocused ? colors.primary : 'transparent',
          borderWidth: 2,
        };
      default:
        return {
          backgroundColor: colors.cardBackground,
          borderColor: isFocused ? colors.primary : colors.borderColor,
          borderWidth: 1,
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

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'large':
        return 18;
      default:
        return 16;
    }
  };

  return (
    <View style={styles.container}>
      {label && (
        <ThemedText
          type="captionBold"
          style={[
            styles.label,
            {
              color: colors.text,
              marginBottom: DesignTokens.spacing.xs,
            },
          ]}
        >
          {label}
        </ThemedText>
      )}
      
      <ThemedView
        style={[
          styles.inputContainer,
          getVariantStyles(),
          getSizeStyles(),
          {
            shadowColor: colors.shadowColor,
          },
        ]}
      >
        {leftIcon && (
          <View style={styles.leftIcon}>
            {leftIcon}
          </View>
        )}
        
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              fontSize: getTextSize(),
              marginLeft: leftIcon ? DesignTokens.spacing.sm : 0,
              marginRight: rightIcon ? DesignTokens.spacing.sm : 0,
            },
          ]}
          placeholderTextColor={colors.placeholderText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessible={true}
          accessibilityRole="text"
          accessibilityLabel={label}
          {...props}
        />
        
        {rightIcon && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Right icon"
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </ThemedView>
      
      {error && (
        <ThemedText
          type="small"
          variant="danger"
          style={[
            styles.error,
            {
              marginTop: DesignTokens.spacing.xs,
            },
          ]}
        >
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    marginBottom: DesignTokens.spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    ...DesignTokens.shadows.small,
  },
  input: {
    flex: 1,
    padding: 0, // Remove default padding
  },
  leftIcon: {
    marginRight: DesignTokens.spacing.xs,
  },
  rightIcon: {
    marginLeft: DesignTokens.spacing.xs,
  },
  error: {
    marginTop: DesignTokens.spacing.xs,
  },
});
