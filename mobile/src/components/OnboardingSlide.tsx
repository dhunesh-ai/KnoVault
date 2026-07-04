import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import Animated, { useAnimatedStyle, withRepeat, withSequence, withTiming, Easing, useSharedValue } from 'react-native-reanimated';
import { useTheme } from '../hooks/useTheme';
import { typography } from '../theme/typography';
import { getFadeInDown, getFadeInUp } from '../utils/animations';
import { useSettingsStore } from '../store/settingsStore';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export interface OnboardingFeature {
  icon: string;
  label: string;
  subtext?: string;
}

export interface OnboardingSlideData {
  id: string;
  title: string;
  titleAccent?: string;
  content: string;
  image: any;
  layout: 'grid' | 'list';
  features: OnboardingFeature[];
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
    if (isActive) {
      if (animationsEnabled) {
        floatAnim.value = withRepeat(
          withSequence(
            withTiming(-8, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
            withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) })
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
  }, [isActive, animationsEnabled]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatAnim.value }]
  }));

  const renderGridFeatures = () => {
    return (
      <View style={styles.gridContainer}>
        {data.features.map((feature, idx) => (
          <Animated.View 
            key={idx}
            entering={getFadeInUp(idx * 100, 450)}
            style={[
              styles.gridPill, 
              { 
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(124, 77, 255, 0.15)',
              }
            ]}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(124, 77, 255, 0.2)' : 'rgba(124, 77, 255, 0.1)' }]}>
              <Ionicons name={feature.icon as any} size={16} color={theme.primary} />
            </View>
            <Text style={[styles.pillLabel, { color: theme.text }]} numberOfLines={1}>
              {feature.label}
            </Text>
          </Animated.View>
        ))}
      </View>
    );
  };

  const renderListFeatures = () => {
    return (
      <View style={styles.listContainer}>
        {data.features.map((feature, idx) => (
          <Animated.View 
            key={idx}
            entering={getFadeInUp(idx * 150, 450)}
            style={[
              styles.listCard, 
              { 
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(124, 77, 255, 0.1)',
              }
            ]}
          >
            <View style={[styles.listIconBox, { backgroundColor: isDark ? 'rgba(124, 77, 255, 0.2)' : 'rgba(124, 77, 255, 0.1)' }]}>
              <Ionicons name={feature.icon as any} size={18} color={theme.primary} />
            </View>
            <View style={styles.listTextContent}>
              <Text style={[styles.listLabel, { color: theme.text }]}>
                {feature.label}
              </Text>
              {feature.subtext && (
                <Text style={[styles.listSubtext, { color: theme.textSecondary }]}>
                  {feature.subtext}
                </Text>
              )}
            </View>
          </Animated.View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.mascotContainer, floatStyle]} entering={getFadeInDown(0, 600)}>
        <Image 
          source={data.image} 
          style={styles.mascot} 
          resizeMode="contain" 
        />
      </Animated.View>

      <Animated.View 
        entering={getFadeInUp(0, 400)} 
        style={styles.textContainer}
      >
        <Text style={[styles.title, { color: theme.text }]}>
          {data.title}{' '}
          {data.titleAccent && (
            <Text style={{ color: theme.primary, fontWeight: '800' }}>
              {data.titleAccent}
            </Text>
          )}
        </Text>
        <Text style={[styles.content, { color: theme.textSecondary }]}>{data.content}</Text>

        {data.layout === 'grid' ? renderGridFeatures() : renderListFeatures()}
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
    paddingHorizontal: 24,
    paddingBottom: 110, // Expanded space for indicators and buttons
  },
  mascotContainer: {
    width: 230,
    height: 230,
    marginBottom: 25,
    borderRadius: 115,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(124, 77, 255, 0.25)',
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8,
    backgroundColor: '#FAF5FF',
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
    fontSize: 26,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  content: {
    ...typography.bodyLarge,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  gridPill: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  pillLabel: {
    ...typography.bodyMedium,
    fontWeight: '600',
    fontSize: 13,
    flex: 1,
  },
  listContainer: {
    width: '100%',
    marginTop: 5,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  listIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listTextContent: {
    flex: 1,
  },
  listLabel: {
    ...typography.titleSmall,
    fontWeight: '700',
    fontSize: 14,
  },
  listSubtext: {
    ...typography.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
});
