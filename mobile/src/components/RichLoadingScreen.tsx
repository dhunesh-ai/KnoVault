import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../hooks/useTheme';

interface RichLoadingScreenProps {
  message?: string;
}

export function RichLoadingScreen({ message }: RichLoadingScreenProps) {
  const { theme, isDark } = useTheme();

  // Animations values
  const scale = useSharedValue(0.95);
  const translateY = useSharedValue(0);
  const progressTranslateX = useSharedValue(-100);

  useEffect(() => {
    // 1. Soft breathing scale animation
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.95, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 2. Smooth vertical float animation
    translateY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(8, { duration: 2200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 3. Premium indeterminate linear progress bar animation
    progressTranslateX.value = withRepeat(
      withTiming(200, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, []);

  const animatedLogoStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateY: translateY.value },
      ],
    };
  });

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: progressTranslateX.value },
      ],
    };
  });

  // Modern and high-end design gradient colors
  const gradientColors = isDark
    ? ['#0A0F1D', '#141E33'] as [string, string] // Deep rich blue-slate gradient
    : ['#F8F9FF', '#E8ECFF'] as [string, string]; // Premium light lavender-blue gradient

  const glowColor = isDark
    ? 'rgba(124, 77, 255, 0.15)'
    : 'rgba(124, 77, 255, 0.08)';

  return (
    <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill}>
      <View style={styles.container}>
        {/* Subtle background glow element */}
        <View style={[styles.glow, { backgroundColor: glowColor }]} />

        {/* Logo Card Container */}
        <Animated.View style={[styles.logoCard, {
          backgroundColor: isDark ? 'rgba(24, 34, 53, 0.85)' : 'rgba(255, 255, 255, 0.9)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(124, 77, 255, 0.08)',
        }, animatedLogoStyle]}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Branding & Status */}
        <Text style={[styles.title, { color: theme.text }]}>KnoVault</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {message || 'Connecting to KnoVault...'}
        </Text>

        {/* Modern Linear Loading Bar */}
        <View style={[styles.progressTrack, {
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(124, 77, 255, 0.06)',
        }]}>
          <Animated.View
            style={[
              styles.progressBar,
              { backgroundColor: '#7C4DFF' }, // Brand primary violet accent
              animatedProgressStyle,
            ]}
          />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  glow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    zIndex: 0,
  },
  logoCard: {
    zIndex: 1,
    width: 130,
    height: 130,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1.5,
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
    opacity: 0.8,
  },
  progressTrack: {
    width: 160,
    height: 4,
    borderRadius: 2,
    marginTop: 32,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    width: 80,
    height: '100%',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
  },
});
