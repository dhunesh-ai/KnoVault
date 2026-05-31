import React from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { 
  useAnimatedProps, 
  withTiming, 
  useDerivedValue 
} from 'react-native-reanimated';
import { useTheme } from '../hooks/useTheme';
import { typography } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  centerText?: string;
  subText?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 120,
  strokeWidth = 10,
  centerText,
  subText,
}) => {
  const { theme } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  const { animationsEnabled } = useSettingsStore();

  const strokeOffset = useDerivedValue(() => {
    return animationsEnabled ? withTiming(circumference * (1 - progress), { duration: 1000 }) : circumference * (1 - progress);
  });

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: strokeOffset.value,
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.border}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.primary}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={styles.textContainer}>
        {centerText && <Text style={[styles.centerText, { color: theme.text }]}>{centerText}</Text>}
        {subText && <Text style={[styles.subText, { color: theme.textSecondary }]}>{subText}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  centerText: {
    ...typography.titleLarge,
  },
  subText: {
    ...typography.caption,
    marginTop: 2,
  },
});
