import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Animated,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { typography, spacing, borderRadius } from '../theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
}

export function ThemedInput({
  label,
  error,
  icon,
  isPassword = false,
  style,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const { colors, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = (e: any) => {
    setIsFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    onBlur?.(e);
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? colors.semantic.error : colors.surface.border,
      error ? colors.semantic.error : colors.primary[500],
    ],
  });

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, { color: error ? colors.semantic.error : colors.text.secondary }]}>
          {label}
        </Text>
      )}
      <Animated.View
        style={[
          styles.inputContainer,
          { 
            borderColor,
            backgroundColor: error 
              ? colors.semantic.errorBg 
              : isFocused 
                ? (isDark ? '#1E293B' : '#F1F3FF') 
                : colors.surface.input,
          },
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={isFocused ? colors.primary[400] : colors.text.tertiary}
            style={styles.icon}
          />
        )}
        <TextInput
          style={[styles.input, { color: colors.text.primary }, style]}
          placeholderTextColor={colors.text.tertiary}
          selectionColor={colors.primary[400]}
          cursorColor={colors.primary[400]}
          secureTextEntry={isPassword && !showPassword}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.text.tertiary}
            />
          </TouchableOpacity>
        )}
      </Animated.View>
      {error && <Text style={[styles.errorText, { color: colors.semantic.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodySmall,
    fontWeight: '700',
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    height: 56,
  },
  icon: {
    marginRight: spacing.md,
  },
  input: {
    flex: 1,
    ...typography.bodyLarge,
    height: '100%',
  },
  errorText: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});
