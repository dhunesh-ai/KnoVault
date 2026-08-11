import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  withDelay,
  Easing,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  G,
  Rect,
} from 'react-native-svg';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MOTIVATIONAL_QUOTES = [
  'Small steps today, big achievements tomorrow.',
  'Capture. Organize. Achieve.',
  'Turn information into intelligence.',
  'Build your second brain.',
];

const ORBITING_FEATURES = [
  { icon: 'document-text-outline', label: 'Notes', color: '#8B5CF6', bg: '#8B5CF622', angle: 0 },
  { icon: 'calendar-outline', label: 'Calendar', color: '#EC407A', bg: '#EC407A22', angle: 60 },
  { icon: 'trophy-outline', label: 'Goals', color: '#10B981', bg: '#10B98122', angle: 120 },
  { icon: 'rocket-outline', label: 'Projects', color: '#3B82F6', bg: '#3B82F622', angle: 180 },
  { icon: 'alarm-outline', label: 'Reminders', color: '#F59E0B', bg: '#F59E0B22', angle: 240 },
  { icon: 'sparkles-outline', label: 'AI Assistant', color: '#06B6D4', bg: '#06B6D422', angle: 300 },
];

interface AnimatedSplashScreenProps {
  onFinish?: () => void;
  autoStart?: boolean;
}

export default function AnimatedSplashScreen({ onFinish, autoStart = true }: AnimatedSplashScreenProps) {
  // Phase States: 0=Initial, 1=Launch Glow, 2=Bulb Light, 3=Mascot/Book/Orbit, 4=Logo Reveal, 5=Quotes/Progress, 6=Finished
  const [currentPhase, setCurrentPhase] = useState<number>(0);
  const [quoteIndex, setQuoteIndex] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);

  // ── Reanimated Shared Values ─────────────────────────────────────────
  
  // Phase 1: Background & Ambient Particles
  const bgOpacity = useSharedValue(0);
  const ambientGlowScale = useSharedValue(0.5);
  const ambientGlowOpacity = useSharedValue(0);

  // Phase 2: Hanging Glass Bulb & Light Rays
  const bulbTranslateY = useSharedValue(-150);
  const bulbOpacity = useSharedValue(0);
  const filamentGlow = useSharedValue(0.2);
  const lightRayScale = useSharedValue(0.1);
  const lightRayOpacity = useSharedValue(0);

  // Phase 3: Mascot, Glowing Book & Orbiting Icons
  const mascotTranslateY = useSharedValue(60);
  const mascotOpacity = useSharedValue(0);
  const mascotScale = useSharedValue(0.7);
  const bookOpenProgress = useSharedValue(0);
  const bookGlowOpacity = useSharedValue(0);
  const orbitRotation = useSharedValue(0);
  const orbitScale = useSharedValue(0);

  // Phase 4: Logo Reveal & Subtitle
  const logoScale = useSharedValue(0.7);
  const logoOpacity = useSharedValue(0);
  const logoTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const subtitleTracking = useSharedValue(15);

  // Phase 5: Progress Ring & Quotes
  const ringProgress = useSharedValue(0);
  const ringOpacity = useSharedValue(0);
  const quoteOpacity = useSharedValue(0);

  // Sparkle floating offsets
  const sparkleFloatY = useSharedValue(0);

  // ── Trigger Haptics Safely ───────────────────────────────────────────
  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    try {
      Haptics.impactAsync(style).catch(() => {});
    } catch {}
  };

  // ── Master Animation Timeline ────────────────────────────────────────
  const startAnimationSequence = () => {
    // Reset values
    setCurrentPhase(1);
    setQuoteIndex(0);
    setProgressPercent(0);

    bgOpacity.value = 0;
    ambientGlowScale.value = 0.5;
    ambientGlowOpacity.value = 0;
    bulbTranslateY.value = -150;
    bulbOpacity.value = 0;
    filamentGlow.value = 0.2;
    lightRayScale.value = 0.1;
    lightRayOpacity.value = 0;
    mascotTranslateY.value = 60;
    mascotOpacity.value = 0;
    mascotScale.value = 0.7;
    bookOpenProgress.value = 0;
    bookGlowOpacity.value = 0;
    orbitRotation.value = 0;
    orbitScale.value = 0;
    logoScale.value = 0.7;
    logoOpacity.value = 0;
    logoTranslateY.value = 20;
    subtitleOpacity.value = 0;
    subtitleTracking.value = 15;
    ringProgress.value = 0;
    ringOpacity.value = 0;
    quoteOpacity.value = 0;

    // Start background particle floating
    sparkleFloatY.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(12, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Continuous orbit rotation
    orbitRotation.value = withRepeat(
      withTiming(360, { duration: 12000, easing: Easing.linear }),
      -1,
      false
    );

    // ── STAGE 1: Launch Ambient Glow (0 - 1.0s) ──
    bgOpacity.value = withTiming(1, { duration: 800 });
    ambientGlowOpacity.value = withTiming(0.8, { duration: 1000 });
    ambientGlowScale.value = withTiming(1.2, { duration: 1200, easing: Easing.out(Easing.back(1)) });

    // ── STAGE 2: Smart Glass Bulb & Light Pulse (1.0s - 2.2s) ──
    setTimeout(() => {
      runOnJS(setCurrentPhase)(2);
      runOnJS(triggerHaptic)(Haptics.ImpactFeedbackStyle.Medium);

      // Drop bulb down from cord
      bulbTranslateY.value = withSpring(0, { damping: 12, stiffness: 90 });
      bulbOpacity.value = withTiming(1, { duration: 500 });

      // 3 Blinks of filament
      filamentGlow.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0.3, { duration: 150 }),
        withTiming(1, { duration: 150 }),
        withTiming(0.2, { duration: 150 }),
        withTiming(1, { duration: 300 })
      );

      // Radial light ray bloom
      setTimeout(() => {
        runOnJS(triggerHaptic)(Haptics.ImpactFeedbackStyle.Light);
        lightRayOpacity.value = withTiming(0.9, { duration: 600 });
        lightRayScale.value = withTiming(1.6, { duration: 800, easing: Easing.out(Easing.ease) });
      }, 400);
    }, 1000);

    // ── STAGE 3: Mascot, Magic Book & Orbiting Feature Badges (2.2s - 3.4s) ──
    setTimeout(() => {
      runOnJS(setCurrentPhase)(3);
      runOnJS(triggerHaptic)(Haptics.ImpactFeedbackStyle.Medium);

      // Mascot floats up with spring
      mascotTranslateY.value = withSpring(0, { damping: 14, stiffness: 100 });
      mascotOpacity.value = withTiming(1, { duration: 600 });
      mascotScale.value = withSpring(1, { damping: 12, stiffness: 110 });

      // Magic Book Opens & Glows
      bookOpenProgress.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
      bookGlowOpacity.value = withTiming(1, { duration: 700 });

      // Orbiting Badges Scale In
      orbitScale.value = withSpring(1, { damping: 12, stiffness: 80 });
    }, 2200);

    // ── STAGE 4: Logo Reveal & Brand Subtitle (3.4s - 4.5s) ──
    setTimeout(() => {
      runOnJS(setCurrentPhase)(4);
      runOnJS(triggerHaptic)(Haptics.ImpactFeedbackStyle.Heavy);

      logoOpacity.value = withTiming(1, { duration: 600 });
      logoScale.value = withSpring(1.0, { damping: 12, stiffness: 100 });
      logoTranslateY.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.back(1.2)) });

      subtitleOpacity.value = withDelay(300, withTiming(1, { duration: 700 }));
      subtitleTracking.value = withDelay(300, withTiming(2, { duration: 700, easing: Easing.out(Easing.ease) }));
    }, 3400);

    // ── STAGE 5: Productivity Progress & Rotating Quotes (4.5s - 6.5s) ──
    setTimeout(() => {
      runOnJS(setCurrentPhase)(5);
      ringOpacity.value = withTiming(1, { duration: 400 });
      ringProgress.value = withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) });
      quoteOpacity.value = withTiming(1, { duration: 500 });

      // Progress percentage timer
      const interval = setInterval(() => {
        setProgressPercent((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 5;
        });
      }, 90);

      // Rotate quotes
      const quoteInterval = setInterval(() => {
        setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
      }, 1200);

      // Finish Timer
      setTimeout(() => {
        clearInterval(interval);
        clearInterval(quoteInterval);
        runOnJS(setCurrentPhase)(6);
        if (onFinish) {
          runOnJS(onFinish)();
        }
      }, 2200);
    }, 4500);
  };

  useEffect(() => {
    if (autoStart) {
      startAnimationSequence();
    }
  }, []);

  // ── Animated Styles ──────────────────────────────────────────────────
  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const ambientGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ambientGlowScale.value }],
    opacity: ambientGlowOpacity.value,
  }));

  const bulbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bulbTranslateY.value }],
    opacity: bulbOpacity.value,
  }));

  const lightRayStyle = useAnimatedStyle(() => ({
    transform: [{ scale: lightRayScale.value }],
    opacity: lightRayOpacity.value,
  }));

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: mascotTranslateY.value },
      { scale: mascotScale.value },
    ],
    opacity: mascotOpacity.value,
  }));

  const logoContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: logoTranslateY.value },
      { scale: logoScale.value },
    ],
    opacity: logoOpacity.value,
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    letterSpacing: subtitleTracking.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
  }));

  const quoteStyle = useAnimatedStyle(() => ({
    opacity: quoteOpacity.value,
  }));

  const orbitContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: orbitScale.value },
      { rotate: `${orbitRotation.value}deg` },
    ],
  }));

  const sparkleFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sparkleFloatY.value }],
  }));

  return (
    <View style={styles.screenContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── 1. DARK GRADIENT BACKGROUND ── */}
      <Animated.View style={[StyleSheet.absoluteFill, bgStyle]}>
        <LinearGradient
          colors={['#070814', '#0D0F24', '#161438', '#060713']}
          locations={[0.0, 0.35, 0.7, 1.0]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* ── AMBIENT RADIAL LIGHT GLOW ── */}
      <Animated.View style={[styles.ambientGlowContainer, ambientGlowStyle]}>
        <LinearGradient
          colors={['#8B5CF660', '#6366F130', '#38BDF800']}
          style={styles.ambientGlowCircle}
        />
      </Animated.View>

      {/* ── FLOATING PARTICLES / SPARKLES ── */}
      <Animated.View style={[StyleSheet.absoluteFill, sparkleFloatStyle]} pointerEvents="none">
        <Svg height={SCREEN_HEIGHT} width={SCREEN_WIDTH} style={StyleSheet.absoluteFill}>
          <Circle cx={SCREEN_WIDTH * 0.15} cy={SCREEN_HEIGHT * 0.25} r="2.5" fill="#8B5CF6" opacity="0.7" />
          <Circle cx={SCREEN_WIDTH * 0.85} cy={SCREEN_HEIGHT * 0.3} r="3" fill="#38BDF8" opacity="0.6" />
          <Circle cx={SCREEN_WIDTH * 0.2} cy={SCREEN_HEIGHT * 0.7} r="2" fill="#EC407A" opacity="0.8" />
          <Circle cx={SCREEN_WIDTH * 0.75} cy={SCREEN_HEIGHT * 0.75} r="3.5" fill="#F59E0B" opacity="0.7" />
          <Circle cx={SCREEN_WIDTH * 0.5} cy={SCREEN_HEIGHT * 0.15} r="2" fill="#10B981" opacity="0.9" />
          <Circle cx={SCREEN_WIDTH * 0.88} cy={SCREEN_HEIGHT * 0.55} r="2.5" fill="#C084FC" opacity="0.6" />
        </Svg>
      </Animated.View>

      {/* ── 2. HANGING GLASS SMART BULB & LIGHT RAYS ── */}
      <Animated.View style={[styles.bulbContainer, bulbStyle]}>
        {/* Hanging Cord */}
        <View style={styles.bulbCord} />

        {/* Light Ray Bloom Backdrop */}
        <Animated.View style={[styles.lightRayBloom, lightRayStyle]}>
          <LinearGradient
            colors={['#FBBF2480', '#F59E0B40', '#38BDF800']}
            style={styles.lightRayCircle}
          />
        </Animated.View>

        {/* Vector Glass Bulb */}
        <Svg width="70" height="90" viewBox="0 0 70 90">
          <Defs>
            <SvgGradient id="bulbGradient" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.8" />
              <Stop offset="0.5" stopColor="#FBBF24" stopOpacity="0.6" />
              <Stop offset="1" stopColor="#F59E0B" stopOpacity="0.3" />
            </SvgGradient>
            <SvgGradient id="filamentGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFBEB" />
              <Stop offset="1" stopColor="#F59E0B" />
            </SvgGradient>
          </Defs>

          {/* Screw Base */}
          <Rect x="27" y="0" width="16" height="14" rx="2" fill="#94A3B8" />
          <Rect x="29" y="4" width="12" height="2" fill="#64748B" />
          <Rect x="29" y="8" width="12" height="2" fill="#64748B" />

          {/* Glass Outer Body */}
          <Path
            d="M 35 14 C 20 14 12 28 12 45 C 12 58 24 68 28 76 C 30 80 40 80 42 76 C 46 68 58 58 58 45 C 58 28 50 14 35 14 Z"
            fill="url(#bulbGradient)"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
          />

          {/* Filament Glowing Wire */}
          <Path
            d="M 28 45 L 31 30 L 35 38 L 39 30 L 42 45"
            fill="none"
            stroke="url(#filamentGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>

      {/* ── 3. KNOVAULT MASCOT & MAGIC GLOWING BOOK & ORBITING ICONS ── */}
      <Animated.View style={[styles.mascotSection, mascotStyle]}>
        {/* Orbiting Feature Icons Ring */}
        <Animated.View style={[styles.orbitRingContainer, orbitContainerStyle]}>
          {ORBITING_FEATURES.map((feat, idx) => {
            const radius = 125;
            const rad = (feat.angle * Math.PI) / 180;
            const x = radius * Math.cos(rad);
            const y = radius * Math.sin(rad);

            return (
              <View
                key={idx}
                style={[
                  styles.orbitItem,
                  {
                    transform: [{ translateX: x }, { translateY: y }],
                    backgroundColor: feat.bg,
                    borderColor: `${feat.color}60`,
                  },
                ]}
              >
                <Ionicons name={feat.icon as any} size={18} color={feat.color} />
              </View>
            );
          })}
        </Animated.View>

        {/* Mascot Character Body */}
        <View style={styles.mascotBodyContainer}>
          <LinearGradient
            colors={['#8B5CF6', '#6366F1', '#4F46E5']}
            style={styles.mascotSphere}
          >
            {/* Mascot Face Expression */}
            <View style={styles.mascotFace}>
              <View style={styles.mascotEyeRow}>
                <View style={styles.mascotEye} />
                <View style={styles.mascotEye} />
              </View>
              <View style={styles.mascotSmile} />
            </View>

            {/* Glowing Magic Book in hands */}
            <View style={styles.magicBookContainer}>
              <LinearGradient
                colors={['#F59E0B', '#FBBF24', '#38BDF8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bookCover}
              >
                <Ionicons name="book-open" size={24} color="#FFF" />
              </LinearGradient>

              {/* Book Rays */}
              <View style={styles.bookRayGlow} />
            </View>
          </LinearGradient>
        </View>
      </Animated.View>

      {/* ── 4. BRAND LOGO & SUBTITLE REVEAL ── */}
      <Animated.View style={[styles.logoSection, logoContainerStyle]}>
        {/* Glass Card Badge */}
        <View style={styles.logoBadgeGlass}>
          <LinearGradient
            colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.03)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.logoIconHex}>
            <LinearGradient colors={['#8B5CF6', '#EC407A']} style={styles.logoHexGradient}>
              <Ionicons name="vault" size={24} color="#FFF" />
            </LinearGradient>
          </View>
          <Text style={styles.logoTitleText}>KnoVault</Text>
        </View>

        {/* Subtitle */}
        <Animated.Text style={[styles.subtitleText, subtitleStyle]}>
          YOUR KNOWLEDGE. YOUR VAULT. YOUR SUCCESS.
        </Animated.Text>
      </Animated.View>

      {/* ── 5. PROGRESS RING & MOTIVATIONAL QUOTES ── */}
      <View style={styles.bottomSection}>
        <Animated.View style={[styles.progressContainer, ringStyle]}>
          {/* Progress Ring SVG */}
          <Svg width="54" height="54" viewBox="0 0 54 54">
            <Circle cx="27" cy="27" r="22" stroke="rgba(255,255,255,0.1)" strokeWidth="3.5" fill="none" />
            <Circle
              cx="27"
              cy="27"
              r="22"
              stroke="#8B5CF6"
              strokeWidth="3.5"
              strokeDasharray="138"
              strokeDashoffset={138 - (138 * progressPercent) / 100}
              strokeLinecap="round"
              fill="none"
              transform="rotate(-90 27 27)"
            />
          </Svg>
          <Text style={styles.progressPercentText}>{progressPercent}%</Text>
        </Animated.View>

        {/* Quote Display */}
        <Animated.View style={[styles.quoteContainer, quoteStyle]}>
          <Text style={styles.quoteText}>"{MOTIVATIONAL_QUOTES[quoteIndex]}"</Text>
        </Animated.View>

        {/* Manual Replay / Skip Bar */}
        <View style={styles.controlRow}>
          <TouchableOpacity style={styles.controlBtn} onPress={startAnimationSequence}>
            <Ionicons name="reload-outline" size={14} color="#94A3B8" />
            <Text style={styles.controlBtnText}>Replay</Text>
          </TouchableOpacity>
          {onFinish && (
            <TouchableOpacity style={styles.controlBtn} onPress={onFinish}>
              <Text style={styles.controlBtnText}>Skip Intro →</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#070814',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'ios' ? 60 : 40,
  },
  ambientGlowContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.15,
    width: 340,
    height: 340,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientGlowCircle: {
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  bulbContainer: {
    alignItems: 'center',
    marginTop: 0,
    zIndex: 10,
  },
  bulbCord: {
    width: 2,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  lightRayBloom: {
    position: 'absolute',
    top: 25,
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightRayCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  mascotSection: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 220,
    marginVertical: 10,
  },
  orbitRingContainer: {
    position: 'absolute',
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitItem: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  mascotBodyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotSphere: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  mascotFace: {
    alignItems: 'center',
    marginBottom: 4,
  },
  mascotEyeRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 4,
  },
  mascotEye: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  mascotSmile: {
    width: 14,
    height: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#FFFFFF',
    borderRadius: 3,
  },
  magicBookContainer: {
    position: 'absolute',
    bottom: -10,
    alignItems: 'center',
  },
  bookCover: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    elevation: 6,
  },
  bookRayGlow: {
    position: 'absolute',
    top: -10,
    width: 40,
    height: 20,
    backgroundColor: '#FBBF2450',
    borderRadius: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginVertical: 10,
  },
  logoBadgeGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  logoIconHex: {
    marginRight: 12,
  },
  logoHexGradient: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTitleText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  subtitleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 12,
    textAlign: 'center',
  },
  bottomSection: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  progressPercentText: {
    position: 'absolute',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#E2E8F0',
  },
  quoteContainer: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  quoteText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#CBD5E1',
    textAlign: 'center',
    fontWeight: '500',
  },
  controlRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  controlBtnText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
