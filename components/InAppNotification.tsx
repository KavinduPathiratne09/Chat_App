import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type InAppNotificationProps = {
  visible: boolean;
  title: string;
  message: string;
  onPress?: () => void;
  onClose?: () => void;
  durationMs?: number;
};

export default function InAppNotification({ visible, title, message, onPress, onClose, durationMs = 3500 }: InAppNotificationProps) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        hide();
      }, durationMs);
      return () => clearTimeout(timer);
    } else {
      hide(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const hide = (duration: number = 200) => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -80, duration, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration, useNativeDriver: true }),
    ]).start(() => {
      onClose && onClose();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }], opacity }]}> 
      <TouchableOpacity activeOpacity={0.9} onPress={() => { onPress && onPress(); hide(); }}>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.message} numberOfLines={2}>{message}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    zIndex: 999,
    elevation: 10,
  },
  content: {
    backgroundColor: '#1e1e1e',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  title: {
    color: 'white',
    fontWeight: '700',
    marginBottom: 2,
  },
  message: {
    color: 'white',
    opacity: 0.9,
  },
});

