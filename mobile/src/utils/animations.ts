import { FadeIn, FadeInDown, FadeInUp, ZoomIn, FadeOut, ZoomOut, FadeOutUp } from 'react-native-reanimated';
import { useSettingsStore } from '../store/settingsStore';

export const getFadeIn = (delay = 0, duration = 400) => {
  const { animationsEnabled } = useSettingsStore.getState();
  if (!animationsEnabled) return FadeIn.duration(0);
  return FadeIn.duration(duration).delay(delay);
};

export const getFadeInDown = (delay = 0, duration = 400) => {
  const { animationsEnabled } = useSettingsStore.getState();
  if (!animationsEnabled) return FadeInDown.duration(0);
  return FadeInDown.duration(duration).delay(delay);
};

export const getFadeInUp = (delay = 0, duration = 400) => {
  const { animationsEnabled } = useSettingsStore.getState();
  if (!animationsEnabled) return FadeInUp.duration(0);
  return FadeInUp.duration(duration).delay(delay);
};

export const getZoomIn = (delay = 0, duration = 300) => {
  const { animationsEnabled } = useSettingsStore.getState();
  if (!animationsEnabled) return ZoomIn.duration(0);
  return ZoomIn.duration(duration).delay(delay);
};

export const getFadeOut = (duration = 300) => {
  const { animationsEnabled } = useSettingsStore.getState();
  if (!animationsEnabled) return FadeOut.duration(0);
  return FadeOut.duration(duration);
};

export const getZoomOut = (duration = 300) => {
  const { animationsEnabled } = useSettingsStore.getState();
  if (!animationsEnabled) return ZoomOut.duration(0);
  return ZoomOut.duration(duration);
};

export const getFadeOutUp = (duration = 300) => {
  const { animationsEnabled } = useSettingsStore.getState();
  if (!animationsEnabled) return FadeOutUp.duration(0);
  return FadeOutUp.duration(duration);
};

export const getAnimationDuration = (duration = 300) => {
  const { animationsEnabled } = useSettingsStore.getState();
  return animationsEnabled ? duration : 0;
};
