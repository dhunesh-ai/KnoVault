import React, { useEffect } from 'react';
import { getFadeIn } from '../../utils/animations';
import { useSettingsStore } from '../../store/settingsStore';
import { View, StyleSheet, TouchableOpacity, Dimensions, Keyboard, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  useSharedValue,
  FadeIn
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { getThemedShadow } from '../ThemedComponents';
import { env } from '../../config/env';

const { width } = Dimensions.get('window');
const TAB_BAR_WIDTH = width - 40;

export const TabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { colors, theme, isDark } = useTheme();
  const translateX = useSharedValue(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);

  const { animationsEnabled } = useSettingsStore();

  // Filter routes based on feature flag
  const visibleRoutes = state.routes.filter(
    (route) => route.name !== 'ai' || env.AI_CHAT_ENABLED
  );
  const tabCount = visibleRoutes.length || 1;
  const tabWidth = TAB_BAR_WIDTH / tabCount;

  // Find active visible index
  const activeRoute = state.routes[state.index];
  const activeVisibleIndex = Math.max(0, visibleRoutes.findIndex((r) => r.key === activeRoute?.key));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: animationsEnabled ? withSpring(translateX.value, { damping: 15, stiffness: 120 }) : translateX.value }],
  }));

  useEffect(() => {
    translateX.value = activeVisibleIndex * tabWidth;
  }, [activeVisibleIndex, tabWidth]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showListener = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideListener = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  if (isKeyboardVisible) {
    return null;
  }

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
        <Animated.View style={[styles.highlight, animatedStyle, { width: tabWidth }]}>
          <View style={[styles.highlightInner, { backgroundColor: `${theme.primary}18` }]} />
        </Animated.View>

        {visibleRoutes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.routes[state.index]?.key === route.key;

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

          const color = isFocused ? theme.primary : colors.text.tertiary;

          const renderIcon = () => {
            if (route.name === 'profile') {
              return (
                <MaterialCommunityIcons
                  name="account-circle"
                  size={28}
                  color={isFocused ? theme.primary : theme.textSecondary}
                />
              );
            }
            
            if (route.name === 'goals') {
              return (
                <MaterialCommunityIcons
                  name="target"
                  size={24}
                  color={isFocused ? theme.primary : theme.textSecondary}
                />
              );
            }

            let name;
            switch (route.name) {
              case 'index': name = isFocused ? 'home' : 'home-outline'; break;
              case 'notes': name = isFocused ? 'document-text' : 'document-text-outline'; break;
              case 'workspaces': name = isFocused ? 'people' : 'people-outline'; break;
              case 'ai': name = isFocused ? 'sparkles' : 'sparkles-outline'; break;
              default: name = 'help-circle';
            }
            return <Ionicons name={name as any} size={22} color={color} />;
          };

          return (
            <TouchableOpacity
              key={index}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              {renderIcon()}
              {isFocused && (
                <Animated.View 
                  entering={getFadeIn()}
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
