import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { 
  useAnimatedProps, 
  withTiming, 
  useSharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../hooks/useTheme';
import { typography } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  completed: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  textColor?: string;
}

export const ExactProgressRing: React.FC<ProgressRingProps> = ({
  completed,
  total,
  size = 160,
  strokeWidth = 14,
  textColor,
}) => {
  const { theme } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const targetProgress = total > 0 ? completed / total : 0;
  
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    // console.log(`[RING UPDATED] Target: ${Math.round(targetProgress * 100)}% (${completed}/${total})`);
    animatedProgress.value = withTiming(targetProgress, { duration: 1000 });
  }, [completed, total]);

  const animatedProps = useAnimatedProps(() => {
    const strokeOffset = circumference * (1 - animatedProgress.value);
    return {
      strokeDashoffset: strokeOffset,
    };
  });

  const activeTextColor = textColor || theme.text;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#FFFFFF"
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
        <Text style={[styles.percentageText, { color: activeTextColor }]}>
          {Math.round(targetProgress * 100)}%
        </Text>
        <Text style={[styles.completedText, { color: activeTextColor + 'CC' }]}>
          {completed} of {total} goals
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
    transform: [{ rotate: '0deg' }],
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  percentageText: {
    ...typography.displayMedium,
    fontWeight: '900',
    fontSize: 38,
  },
  completedText: {
    ...typography.caption,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
});
