import React, { useState, useRef } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, Dimensions, NativeSyntheticEvent, NativeScrollEvent, SafeAreaView } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, interpolate, Extrapolation } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/hooks/useTheme';
import { OnboardingSlide, OnboardingSlideData } from '../src/components/OnboardingSlide';
import { useSettingsStore } from '../src/store/settingsStore';
import { Ionicons } from '@expo/vector-icons';
import { getFadeIn, getFadeInDown } from '../src/utils/animations';

const { width } = Dimensions.get('window');

const SLIDES: OnboardingSlideData[] = [
  {
    id: '1',
    title: 'Welcome to Your Second Brain',
    subtitle: 'Capture ideas, organize knowledge, and never forget important moments.',
    content: 'Welcome to KnoVault, the ultimate productivity hub designed to keep your life structured.',
    highlights: ['• Smart Notes', '• Reminders', '• Secure Storage', '• Offline First'],
    showMascot: true,
  },
  {
    id: '2',
    title: 'Store What Matters',
    content: 'Create notes, reminders, birthdays, anniversaries, and goals in one beautiful workspace.',
    highlights: ['📒 Notes', '⏰ Reminders', '🎂 Special Days', '🎯 Goals'],
    showMascot: true,
  },
  {
    id: '3',
    title: 'Find Everything Instantly',
    content: 'Organize your knowledge using categories, search, favorites, and smart organization tools.',
    highlights: ['📁 Categories', '⭐ Favorites', '🔍 Search', '🗂 Organization'],
    showMascot: true,
  },
  {
    id: '4',
    title: 'Your Data. Your Control.',
    content: 'Your information stays secure with passcode protection, encrypted storage, and cloud backup support.',
    highlights: ['🔐 Passcode Lock', '☁ Cloud Storage', '📱 Offline Access', '🛡 Privacy First'],
    showMascot: true,
  },
  {
    id: '5',
    title: 'Meet Kovi',
    content: 'Kovi helps you build a trusted second brain where your notes, memories, plans, and ideas stay safe and organized.',
    showMascot: true,
  },
  {
    id: '6',
    title: "Let's Build Something Amazing",
    content: 'Start your productivity journey with KnoVault today.',
    showMascot: true,
  }
];

export default function OnboardingScreen() {
  const { theme, isDark } = useTheme();
  const { completeOnboarding } = useSettingsStore();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useSharedValue(0);
  const slidesRef = useRef<FlatList>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollX.value = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  };

  const scrollToNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < SLIDES.length - 1) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    }
  };

  const skipToLast = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    slidesRef.current?.scrollToIndex({ index: SLIDES.length - 1 });
  };

  const handleGetStarted = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await completeOnboarding();
    // Layout will automatically redirect to Login due to isOnboarded state change
  };

  const isLastSlide = currentIndex === SLIDES.length - 1;

  // Render Pagination Dots
  const renderPagination = () => {
    return (
      <View style={styles.paginationContainer}>
        {SLIDES.map((_, index) => {
          const animatedDotStyle = useAnimatedStyle(() => {
            const widthAnim = interpolate(
              scrollX.value,
              [(index - 1) * width, index * width, (index + 1) * width],
              [8, 24, 8],
              Extrapolation.CLAMP
            );
            const opacityAnim = interpolate(
              scrollX.value,
              [(index - 1) * width, index * width, (index + 1) * width],
              [0.3, 1, 0.3],
              Extrapolation.CLAMP
            );
            return {
              width: widthAnim,
              opacity: opacityAnim,
            };
          });

          return (
            <Animated.View
              key={index.toString()}
              style={[
                styles.dot,
                { backgroundColor: theme.primary },
                animatedDotStyle,
              ]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={isDark ? ['#1e1b4b', theme.background] : ['#EDE9FE', theme.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
      />
      
      {/* Skip Button */}
      {!isLastSlide && (
        <Animated.View entering={getFadeInDown()} style={styles.skipContainer}>
          <TouchableOpacity onPress={skipToLast} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: theme.textSecondary }]}>Skip</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Carousel */}
      <FlatList
        data={SLIDES}
        ref={slidesRef}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => (
          <OnboardingSlide data={item} isActive={index === currentIndex} />
        )}
      />

      {/* Bottom Controls */}
      <View style={styles.bottomContainer}>
        {renderPagination()}
        
        <View style={styles.actionContainer}>
          {isLastSlide ? (
            <Animated.View entering={getFadeIn(0, 300)} style={{ width: '100%' }}>
              <TouchableOpacity 
                style={[styles.getStartedButton, { backgroundColor: theme.primary }]} 
                onPress={handleGetStarted}
              >
                <Text style={styles.getStartedText}>Get Started</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <TouchableOpacity 
              style={[styles.nextButton, { backgroundColor: theme.primary }]} 
              onPress={scrollToNext}
            >
              <Ionicons name="arrow-forward" size={24} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  skipButton: {
    padding: 10,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  actionContainer: {
    width: '100%',
    alignItems: 'flex-end',
    minHeight: 60,
    justifyContent: 'center',
  },
  nextButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  getStartedButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  getStartedText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
