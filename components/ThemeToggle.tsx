import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors, DesignTokens } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

interface ThemeToggleProps {
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export function ThemeToggle({ size = 'medium', showLabel = true }: ThemeToggleProps) {
  const { theme, themeMode, setThemeMode } = useTheme();
  const colors = Colors[theme];

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          width: 120,
          height: 40,
          paddingHorizontal: DesignTokens.spacing.md,
          iconSize: 16,
          fontSize: 12,
        };
      case 'large':
        return {
          width: 160,
          height: 56,
          paddingHorizontal: DesignTokens.spacing.lg,
          iconSize: 24,
          fontSize: 14,
        };
      default: // medium
        return {
          width: 140,
          height: 48,
          paddingHorizontal: DesignTokens.spacing.lg,
          iconSize: 20,
          fontSize: 13,
        };
    }
  };

  const currentSize = getSizeStyles();

  const getThemeIcon = () => {
    switch (themeMode) {
      case 'light':
        return 'sun';
      case 'dark':
        return 'moon';
      case 'system':
      default:
        return theme === 'light' ? 'sun' : 'moon';
    }
  };

  const getThemeLabel = () => {
    switch (themeMode) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
      default:
        return 'Auto';
    }
  };

  const handlePress = () => {
    // Cycle through: system -> light -> dark -> system
    const modes: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark'];
    const currentIndex = modes.indexOf(themeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setThemeMode(modes[nextIndex]);
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          width: currentSize.width,
          height: currentSize.height,
          backgroundColor: colors.cardBackground,
          borderColor: colors.borderColor,
          borderRadius: DesignTokens.borderRadius.medium,
          paddingHorizontal: currentSize.paddingHorizontal,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <IconSymbol
        name={getThemeIcon()}
        size={currentSize.iconSize}
        color={colors.primary}
      />
      {showLabel && (
        <ThemedText
          type="small"
          style={[
            styles.label,
            {
              fontSize: currentSize.fontSize,
              color: colors.textSecondary,
            },
          ]}
        >
          {getThemeLabel()}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    ...DesignTokens.shadows.small,
    columnGap: DesignTokens.spacing.xs,
  },
  label: {
    textAlign: 'center',
  },
}); 