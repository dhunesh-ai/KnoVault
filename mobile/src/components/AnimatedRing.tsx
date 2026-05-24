import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
} from 'react-native-reanimated';
import { typography } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface AnimatedRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

export function AnimatedRing({
  percentage,
  size = 72,
  strokeWidth = 6,
}: AnimatedRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(percentage / 100, {
      mass: 1,
      damping: 15,
      stiffness: 90,
    });
  }, [percentage]);

  const animatedProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: circumference * (1 - progress.value),
    };
  });

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          stroke="rgba(255, 255, 255, 0.2)"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <AnimatedCircle
          stroke="#FFFFFF"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          originX={size / 2}
          originY={size / 2}
          rotation="-90"
        />
      </Svg>
      <Text style={styles.progressText}>{Math.round(percentage)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  progressText: {
    ...typography.titleMedium,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
