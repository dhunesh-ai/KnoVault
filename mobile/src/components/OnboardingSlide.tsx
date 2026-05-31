import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import Animated, { useAnimatedStyle, withRepeat, withSequence, withTiming, Easing, useSharedValue } from 'react-native-reanimated';
import { useTheme } from '../hooks/useTheme';
import { typography } from '../theme/typography';
import { getFadeInDown, getFadeInUp } from '../utils/animations';
import { useSettingsStore } from '../store/settingsStore';

const { width } = Dimensions.get('window');

export interface OnboardingSlideData {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  highlights?: string[];
  showMascot?: boolean;
}

interface Props {
  data: OnboardingSlideData;
  isActive: boolean;
}

export const OnboardingSlide: React.FC<Props> = ({ data, isActive }) => {
  const { theme, isDark } = useTheme();
  const { animationsEnabled } = useSettingsStore();

  // Floating animation for mascot
  const floatAnim = useSharedValue(0);

  React.useEffect(() => {
    if (isActive && data.showMascot) {
      if (animationsEnabled) {
        floatAnim.value = withRepeat(
          withSequence(
            withTiming(-10, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
            withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        );
      } else {
        floatAnim.value = 0;
      }
    } else {
      floatAnim.value = animationsEnabled ? withTiming(0) : 0;
    }
  }, [isActive, data.showMascot, animationsEnabled]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatAnim.value }]
  }));

  return (
    <View style={styles.container}>
      {data.showMascot && (
        <Animated.View style={[styles.mascotContainer, floatStyle]} entering={getFadeInDown(0, 600)}>
          <Image 
            source={require('../../assets/kovi.jpg')} 
            style={styles.mascot} 
            resizeMode="contain" 
          />
        </Animated.View>
      )}

      <Animated.View 
        entering={getFadeInUp(0, 400)} 
        style={styles.textContainer}
      >
        <Text style={[styles.title, { color: theme.text }]}>{data.title}</Text>
        {data.subtitle && <Text style={[styles.subtitle, { color: theme.primary }]}>{data.subtitle}</Text>}
        <Text style={[styles.content, { color: theme.textSecondary }]}>{data.content}</Text>

        {data.highlights && data.highlights.length > 0 && (
          <View style={styles.highlightsGrid}>
            {data.highlights.map((highlight, idx) => (
              <Animated.View 
                key={idx} 
                entering={getFadeInUp(idx * 100, 400)}
                style={[styles.highlightPill, { backgroundColor: isDark ? 'rgba(124, 77, 255, 0.15)' : 'rgba(124, 77, 255, 0.1)' }]}
              >
                <Text style={[styles.highlightText, { color: theme.primary }]}>{highlight}</Text>
              </Animated.View>
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingBottom: 80, // Space for pagination and buttons
  },
  mascotContainer: {
    width: 250,
    height: 250,
    marginBottom: 40,
    borderRadius: 125,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(124, 77, 255, 0.2)',
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  mascot: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    ...typography.displayMedium,
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    ...typography.titleLarge,
    textAlign: 'center',
    marginBottom: 15,
  },
  content: {
    ...typography.bodyLarge,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  highlightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  highlightPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  highlightText: {
    ...typography.titleSmall,
    fontSize: 14,
  }
});
