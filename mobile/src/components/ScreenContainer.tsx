import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export default function ScreenContainer({ children, style, edges = ['top', 'bottom'] }: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: theme.background,
          paddingTop: edges.includes('top') ? insets.top : 0,
          paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
          paddingLeft: edges.includes('left') ? insets.left : 0,
          paddingRight: edges.includes('right') ? insets.right : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
