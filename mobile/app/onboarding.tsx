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
    title: 'Welcome to Your',
    titleAccent: 'Second Brain',
    content: 'Capture ideas, organize knowledge, and never forget important moments.',
    image: require('../assets/kovi.jpg.png'),
    layout: 'grid',
    features: [
      { icon: 'document-text-outline', label: 'Smart Notes' },
      { icon: 'notifications-outline', label: 'Reminders' },
      { icon: 'shield-half-outline', label: 'Secure Storage' },
      { icon: 'cloud-offline-outline', label: 'Offline First' },
    ],
  },
  {
    id: '2',
    title: 'Store',
    titleAccent: 'What Matters',
    content: 'Create notes, reminders, birthdays, anniversaries, and goals in one beautiful workspace.',
    image: require('../assets/onboarding_store.png'),
    layout: 'grid',
    features: [
      { icon: 'book-outline', label: 'Notes' },
      { icon: 'alarm-outline', label: 'Reminders' },
      { icon: 'calendar-outline', label: 'Special Days' },
      { icon: 'trophy-outline', label: 'Goals' },
    ],
  },
  {
    id: '3',
    title: 'Find Everything',
    titleAccent: 'Instantly',
    content: 'Organize your knowledge using categories, search, favorites, and smart organization tools.',
    image: require('../assets/onboarding_find.png'),
    layout: 'grid',
    features: [
      { icon: 'folder-open-outline', label: 'Categories' },
      { icon: 'star-outline', label: 'Favorites' },
      { icon: 'search-outline', label: 'Search' },
      { icon: 'layers-outline', label: 'Organization' },
    ],
  },
  {
    id: '4',
    title: 'Your Data.',
    titleAccent: 'Your Control.',
    content: 'Your information stays secure with passcode protection, encrypted storage, and cloud backup support.',
    image: require('../assets/onboarding_security.png'),
    layout: 'grid',
    features: [
      { icon: 'key-outline', label: 'Passcode Lock' },
      { icon: 'cloud-done-outline', label: 'Cloud Storage' },
      { icon: 'phone-portrait-outline', label: 'Offline Access' },
      { icon: 'lock-closed-outline', label: 'Privacy First' },
    ],
  },
  {
    id: '5',
    title: 'Meet',
    titleAccent: 'Kovi',
    content: 'Kovi helps you build a trusted second brain where your notes, memories, plans, and ideas stay safe and organized.',
    image: require('../assets/kovi.jpg.png'),
    layout: 'list',
    features: [
      { icon: 'help-buoy-outline', label: 'Smart Assistant', subtext: 'Always here to help you.' },
      { icon: 'heart-outline', label: 'Understands You', subtext: 'Learns and adapts to your needs.' },
      { icon: 'flash-outline', label: 'Works With You', subtext: 'Boosts your productivity every day.' },
    ],
  },
  {
    id: '6',
    title: "Let's Build",
    titleAccent: 'Something Amazing',
    content: 'Start your productivity journey with KnoVault today.',
    image: require('../assets/onboarding_kovi_flag.png'),
    layout: 'list',
    features: [
      { icon: 'apps-outline', label: 'All-in-One Workspace', subtext: 'Everything you need, in one place.' },
      { icon: 'trending-up-outline', label: 'Built for Productivity', subtext: 'Focus more, accomplish more.' },
      { icon: 'person-outline', label: 'Made for You', subtext: 'Personal, private, and powerful.' },
    ],
  },
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
        colors={isDark ? ['#1A1230', '#120C1F', theme.background] : ['#E0D7FF', '#FAF9FF', '#FFFFFF']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
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
        {isLastSlide ? (
          <View style={{ width: '100%', alignItems: 'center' }}>
            {renderPagination()}
            <Animated.View entering={getFadeIn(0, 300)} style={{ width: '100%', marginTop: 10 }}>
              <TouchableOpacity 
                style={[styles.getStartedButton, { backgroundColor: theme.primary }]} 
                onPress={handleGetStarted}
              >
                <View style={styles.getStartedContent}>
                  <Text style={styles.getStartedText}>Get Started</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>
        ) : (
          <View style={styles.controlsRow}>
            {/* Left Spacer to balance the nextButton on the right, keeping dots centered */}
            <View style={styles.spacer} />
            {renderPagination()}
            <TouchableOpacity 
              style={[styles.nextButton, { backgroundColor: theme.primary }]} 
              onPress={scrollToNext}
            >
              <Ionicons name="arrow-forward" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
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
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  spacer: {
    width: 56, // Equal to nextButton width to perfectly center the dots
  },
  paginationContainer: {
    flexDirection: 'row',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  nextButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    paddingVertical: 16,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  getStartedContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  getStartedText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
  }
});
