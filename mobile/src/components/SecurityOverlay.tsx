import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../hooks/useTheme';
import { getThemedShadow } from './ThemedComponents';
import { typography, spacing } from '../theme';

interface SecurityOverlayProps {
  visible: boolean;
  onAuthenticate: () => void;
  onCancel: () => void;
}

export const SecurityOverlay: React.FC<SecurityOverlayProps> = ({
  visible,
  onAuthenticate,
  onCancel,
}) => {
  const { colors, theme, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        
        <View style={[
          styles.content, 
          { 
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderTopWidth: 1.2,
            ...getThemedShadow(theme, 'strong')
          }
        ]}>
          <View style={styles.header}>
            <Image 
              source={{ uri: 'https://img.icons8.com/color/96/google-logo.png' }}
              style={styles.logo}
              defaultSource={require('../../assets/icon.png')}
            />
            <Text style={[styles.brand, { color: theme.textSecondary }]}>KnoVault</Text>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>Unlock KnoVault</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Unlock your screen with PIN, pattern, password, face, or fingerprint
          </Text>

          <TouchableOpacity 
            style={styles.fingerprintContainer}
            onPress={onAuthenticate}
            activeOpacity={0.7}
          >
            <View style={[
              styles.fingerprintCircle, 
              { 
                backgroundColor: `${theme.primary}12`,
                borderColor: `${theme.primary}25`
              }
            ]}>
              <Ionicons name="finger-print" size={60} color={theme.primary} />
            </View>
            <Text style={[styles.hint, { color: theme.textSecondary }]}>Touch the fingerprint sensor</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <TouchableOpacity onPress={onAuthenticate}>
              <Text style={[styles.footerLink, { color: theme.primary }]}>Use password</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={onCancel}>
              <Text style={[styles.footerLink, { color: colors.text.tertiary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 30,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    alignItems: 'center',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    gap: 10,
  },
  logo: {
    width: 24,
    height: 24,
  },
  brand: {
    ...typography.bodySmall,
    fontWeight: '700',
  },
  title: {
    ...typography.titleLarge,
    fontWeight: '800',
    marginBottom: 10,
  },
  subtitle: {
    ...typography.bodyMedium,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 50,
    lineHeight: 22,
  },
  fingerprintContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  fingerprintCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.2,
  },
  hint: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  footer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  footerLink: {
    ...typography.bodyMedium,
    fontWeight: '700',
  },
});
