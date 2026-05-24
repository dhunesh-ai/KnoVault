import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  useSharedValue,
  FadeIn
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { getThemedShadow } from '../ThemedComponents';

const { width } = Dimensions.get('window');
const TAB_BAR_WIDTH = width - 40;
const TAB_WIDTH = TAB_BAR_WIDTH / 5;

export const TabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { colors, theme, isDark } = useTheme();
  const translateX = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(translateX.value, { damping: 15, stiffness: 120 }) }],
  }));

  useEffect(() => {
    translateX.value = state.index * TAB_WIDTH;
  }, [state.index]);

  return (
    <View style={styles.container}>
      <View style={[
        styles.tabBar, 
        { 
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)',
          borderColor: isDark ? 'rgba(124, 77, 255, 0.2)' : 'rgba(124, 77, 255, 0.12)',
          borderWidth: 1.2,
          ...getThemedShadow(theme, 'medium')
        }
      ]}>
        {/* Animated Highlight */}
        <Animated.View style={[styles.highlight, animatedStyle, { width: TAB_WIDTH }]}>
          <View style={[styles.highlightInner, { backgroundColor: `${theme.primary}18` }]} />
        </Animated.View>

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const iconName = () => {
            switch (route.name) {
              case 'index': return isFocused ? 'home' : 'home-outline';
              case 'notes': return isFocused ? 'document-text' : 'document-text-outline';
              case 'goals': return isFocused ? 'rocket' : 'rocket-outline';
              case 'ai': return isFocused ? 'sparkles' : 'sparkles-outline';
              case 'profile': return isFocused ? 'person' : 'person-outline';
              default: return 'help-circle';
            }
          };

          return (
            <TouchableOpacity
              key={index}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={iconName() as any} 
                size={22} 
                color={isFocused ? theme.primary : colors.text.tertiary} 
              />
              {isFocused && (
                <Animated.View 
                  entering={FadeIn.duration(200)}
                  style={[
                    styles.activeDot, 
                    { 
                      backgroundColor: theme.primary,
                      shadowColor: theme.primary,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.8,
                      shadowRadius: 3,
                    }
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 99,
  },
  tabBar: {
    flexDirection: 'row',
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    width: TAB_BAR_WIDTH,
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingTop: 4,
  },
  highlight: {
    position: 'absolute',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
    elevation: 3,
  }
});
