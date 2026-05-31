import React, { useEffect } from 'react';
import { getFadeIn, getFadeInRight } from '../src/utils/animations';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/hooks/useTheme';
import { useSwipe } from '../src/components/SwipeWrapper';
import { getThemedShadow } from '../src/components/ThemedComponents';
import { typography } from '../src/theme';
import type { AISuggestion } from '../src/constants/aiSuggestions';

interface AISuggestionsProps {
  suggestions: AISuggestion[];
  onSelect: (label: string) => void;
  disabled?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function AISuggestions({ suggestions, onSelect, disabled }: AISuggestionsProps) {
  const { colors, theme } = useTheme();
  const { setSwipeEnabled } = useSwipe();

  useEffect(() => {
    if (suggestions.length > 0) {
      console.log('[AI SUGGESTIONS RENDERED]', suggestions.length, 'chips');
    }
  }, [suggestions]);

  if (!suggestions.length) return null;

  return (
    <Animated.View entering={getFadeIn()} style={[styles.wrapper, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
      <View style={styles.labelRow}>
        <Ionicons name="sparkles" size={11} color={theme.primary} />
        <Text style={[styles.sectionLabel, { color: colors.text.tertiary }]}>Smart Suggestions</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        onTouchStart={() => setSwipeEnabled(false)}
        onTouchEnd={() => setSwipeEnabled(true)}
        onTouchCancel={() => setSwipeEnabled(true)}
        onMomentumScrollEnd={() => setSwipeEnabled(true)}
      >
        {suggestions.map((chip, idx) => (
          <SuggestionChip
            key={chip.id}
            chip={chip}
            index={idx}
            disabled={disabled}
            onPress={() => {
              console.log('[AI CHIP PRESSED]', chip.label);
              onSelect(chip.label);
            }}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
}

function SuggestionChip({
  chip,
  index,
  onPress,
  disabled,
}: {
  chip: AISuggestion;
  index: number;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors, theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.93, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 180 });
  };

  return (
    <AnimatedTouchable
      entering={getFadeInRight(0, 280)}
      style={[
        styles.chip, 
        { 
          backgroundColor: theme.background, 
          borderColor: isDark ? 'rgba(124, 77, 255, 0.25)' : colors.primary[100],
          ...getThemedShadow(theme, 'soft')
        }, 
        animatedStyle, 
        disabled && styles.chipDisabled
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.8}
      disabled={disabled}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      accessibilityLabel={chip.label}
      accessibilityRole="button"
    >
      <View style={[styles.chipIcon, { backgroundColor: isDark ? '#1C2638' : colors.primary[50] }]}>
        <Ionicons name={chip.icon as any} size={12} color={theme.primary} />
      </View>
      <Text style={[styles.chipLabel, { color: isDark ? '#C4B5FD' : colors.primary[600] }]} numberOfLines={1}>
        {chip.label}
      </Text>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: 6,
    paddingBottom: 8,
    borderTopWidth: 1.2,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 5,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.2,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 7,
  },
  chipLabel: {
    ...typography.bodySmall,
    fontWeight: '700',
    flexShrink: 1,
  },
});
