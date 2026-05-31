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
      console.log('[AI SUGGESTIONS RENDERED]', suggestions.length, 'cards');
    }
  }, [suggestions]);

  if (!suggestions.length) return null;

  return (
    <Animated.View entering={getFadeIn()} style={[styles.wrapper]}>
      <View style={styles.labelRow}>
        <Ionicons name="sparkles" size={14} color={theme.primary} />
        <Text style={[styles.sectionLabel, { color: colors.text.tertiary }]}>What can I help with?</Text>
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
        decelerationRate="fast"
        snapToInterval={210}
      >
        {suggestions.map((chip, idx) => (
          <SuggestionCard
            key={chip.id}
            chip={chip}
            index={idx}
            disabled={disabled}
            onPress={() => {
              console.log('[AI CARD PRESSED]', chip.label);
              onSelect(chip.label);
            }}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
}

function SuggestionCard({
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
    scale.value = withSpring(0.96, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 180 });
  };

  return (
    <AnimatedTouchable
      entering={getFadeInRight(index * 50, 400)}
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : theme.card,
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : theme.border,
          ...getThemedShadow(theme, 'soft')
        },
        animatedStyle,
        disabled && styles.cardDisabled
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      disabled={disabled}
      accessibilityLabel={chip.label}
      accessibilityRole="button"
    >
      <View style={[styles.cardHeader]}>
        <View style={[styles.cardIconBox, { backgroundColor: theme.primary + '15' }]}>
          <Ionicons name={chip.icon as any} size={14} color={theme.primary} />
        </View>
        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
          {chip.label}
        </Text>
      </View>
      {chip.description && (
        <Text style={[styles.cardDesc, { color: theme.textSecondary }]} numberOfLines={1}>
          {chip.description}
        </Text>
      )}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: 8,
    paddingBottom: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    width: 170,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.2,
    justifyContent: 'center',
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  cardIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    ...typography.bodySmall,
    fontWeight: '800',
    flex: 1,
  },
  cardDesc: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 14,
    paddingLeft: 34,
  },
});
