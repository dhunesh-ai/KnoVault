import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;

const TABS = ['index', 'notes', 'goals', 'workspaces', 'profile'];

// Module-level variable to keep track of the last focused index across screen re-renders
let lastActiveIndex = 0;

export const SwipeContext = createContext<{
  setSwipeEnabled: (enabled: boolean) => void;
}>({
  setSwipeEnabled: () => {},
});

export const useSwipe = () => useContext(SwipeContext);

interface SwipeWrapperProps {
  children: React.ReactNode;
  currentTab: string;
}

export default function SwipeWrapper({ children, currentTab }: SwipeWrapperProps) {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const currentIndex = TABS.indexOf(currentTab);

  const [swipeEnabled, setSwipeEnabled] = useState(true);
  const { animationsEnabled } = useSettingsStore();

  // Reanimated values for tab transition animations
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Reanimated value to track active drag feedback
  const dragX = useSharedValue(0);

  useEffect(() => {
    if (isFocused) {
      lastActiveIndex = currentIndex;
      translateX.value = 0;
      opacity.value = 0.6;
      opacity.value = animationsEnabled ? withTiming(1, { duration: 250 }) : 1;
    }
  }, [isFocused, currentIndex, animationsEnabled]);

  const handleSwipeLeft = () => {
    if (currentIndex < TABS.length - 1) {
      navigation.navigate(TABS[currentIndex + 1]);
    }
  };

  const handleSwipeRight = () => {
    if (currentIndex > 0) {
      navigation.navigate(TABS[currentIndex - 1]);
    }
  };

  // Configure Gesture Detector Pan Gesture
  const panGesture = Gesture.Pan()
    .enabled(false) // Disable all horizontal swipe gestures between tabs
    .activeOffsetX([-25, 25]) // don't trigger on tiny accidental jitters
    .failOffsetY([-35, 35])   // cancel swipe if user is scrolling vertically
    .onUpdate((event) => {
      dragX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD) {
        runOnJS(handleSwipeLeft)();
      } else if (event.translationX > SWIPE_THRESHOLD) {
        runOnJS(handleSwipeRight)();
      }
      dragX.value = animationsEnabled ? withSpring(0) : withTiming(0, { duration: 0 });
    });

  const animatedStyle = useAnimatedStyle(() => {
    // Combine transition slide with current drag offset for micro-interactive feel
    return {
      transform: [
        { translateX: translateX.value + dragX.value * 0.12 }
      ],
      opacity: opacity.value,
    };
  });

  return (
    <SwipeContext.Provider value={{ setSwipeEnabled }}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[{ flex: 1 }, animatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </SwipeContext.Provider>
  );
}
