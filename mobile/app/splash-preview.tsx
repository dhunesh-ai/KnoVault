import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import AnimatedSplashScreen from '../src/components/AnimatedSplashScreen';

export default function SplashPreviewScreen() {
  const router = useRouter();

  const handleFinish = () => {
    console.log('[SplashPreview] Splash animation completed!');
  };

  return (
    <View style={styles.container}>
      <AnimatedSplashScreen onFinish={handleFinish} autoStart={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070814',
  },
});
