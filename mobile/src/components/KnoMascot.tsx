import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing,
  withDelay,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

export type MascotState = 'idle' | 'thinking' | 'happy' | 'celebrating' | 'alert' | 'medicine' | 'birthday';

interface KnoMascotProps {
  state?: MascotState;
  size?: number;
}

export default function KnoMascot({ state = 'idle', size = 40 }: KnoMascotProps) {
  const { colors, isDark } = useTheme();
  const floatY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    // Soft floating animation
    floatY.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(4, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    // State-based animations
    if (state === 'thinking') {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 500 }),
          withTiming(0.9, { duration: 500 })
        ),
        -1,
        true
      );
    } else if (state === 'happy' || state === 'celebrating') {
      scale.value = withSequence(
        withTiming(1.2, { duration: 200 }),
        withTiming(1, { duration: 200 }),
        withTiming(1.1, { duration: 200 }),
        withTiming(1, { duration: 200 })
      );
    } else {
      scale.value = withTiming(1);
    }
  }, [state]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatY.value },
      { scale: scale.value }
    ]
  }));

  const getFace = () => {
    switch (state) {
      case 'thinking': return '🤔';
      case 'happy': return '😊';
      case 'celebrating': return '🎉';
      case 'alert': return '⚠';
      case 'medicine': return '💊';
      case 'birthday': return '🎂';
      default: return '◕‿◕';
    }
  };

  const isTextFace = getFace() === '◕‿◕';

  return (
    <Animated.View style={[styles.container, { width: size, height: size }, animatedStyle]}>
      {/* Outer Glow */}
      <View style={[styles.glow, { 
        backgroundColor: colors.primary[500], 
        opacity: isDark ? 0.4 : 0.2,
        width: size * 1.5,
        height: size * 1.5,
      }]} />
      
      {/* Main Body */}
      <LinearGradient
        colors={['#8B5CF6', '#6D28D9']}
        style={[styles.body, { width: size, height: size, borderRadius: size / 2.5 }]}
      >
        {isTextFace ? (
          <Text style={[styles.faceText, { fontSize: size * 0.35 }]}>
            {getFace()}
          </Text>
        ) : (
          <Text style={[styles.emojiFace, { fontSize: size * 0.5 }]}>
            {getFace()}
          </Text>
        )}
      </LinearGradient>

      {/* Sparkles for certain states */}
      {(state === 'celebrating' || state === 'happy' || state === 'idle') && (
        <View style={styles.sparkleContainer}>
          <Ionicons name="sparkles" size={size * 0.3} color="#FBBF24" style={styles.sparkle1} />
          {state === 'celebrating' && (
            <Ionicons name="sparkles" size={size * 0.2} color="#60A5FA" style={styles.sparkle2} />
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    borderRadius: 100,
    transform: [{ scale: 1 }],
  },
  body: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  faceText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  emojiFace: {
    lineHeight: undefined,
  },
  sparkleContainer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  sparkle1: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
  sparkle2: {
    position: 'absolute',
    bottom: -2,
    left: -5,
  },
});
