import { 
  FadeIn, FadeInDown, FadeInUp, FadeInRight, 
  FadeOut, FadeOutUp, FadeOutRight, 
  ZoomIn, ZoomOut, SlideInRight, SlideOutRight,
  LinearTransition, Layout
} from 'react-native-reanimated';
import { useSettingsStore } from '../store/settingsStore';

export const getFadeIn = (delay = 0, duration = 400) => {
  const { animationsEnabled } = useSettingsStore.getState();
  if (!animationsEnabled) return undefined;
  return FadeIn.duration(duration).delay(delay);
};

export const getFadeInDown = (delay = 0, duration = 400) => {
  const { animationsEnabled } = useSettingsStore.getState();
  if (!animationsEnabled) return undefined;
  return FadeInDown.duration(duration).delay(delay);
};

export const getFadeInUp = (delay = 0, duration = 400) => {
  const { animationsEnabled } = useSettingsStore.getState();
  if (!animationsEnabled) return undefined;
  return FadeInUp.duration(duration).delay(delay);
};

export const getFadeInRight = (delay = 0, duration = 400) => {
  const { animationsEnabled } = useSettingsStore.getState();
  if (!animationsEnabled) return undefined;
  return FadeInRight.duration(duration).delay(delay);
};

export const getZoomIn = (delay = 0, duration = 300) => {
  const { animationsEnabled } = useSettingsStore.getState();
  if (!animationsEnabled) return undefined;
  return ZoomIn.duration(duration).delay(delay);
};

export const getFadeOut = (duration = 300) => {
  const { animationsEnabled } = useSettingsStore.getState();
  if (!animationsEnabled) return undefined;
  return FadeOut.duration(duration);
};

export const getFadeOutUp = (duration = 300) => {
  const { animationsEnabled } = useSettingsStore.getState();
  if (!animationsEnabled) return undefined;
  return FadeOutUp.duration(duration);
};

export const getFadeOutRight = (duration = 300) => {
  const { animationsEnabled } = useSettingsStore.getState();
  if (!animationsEnabled) return undefined;
  return FadeOutRight.duration(duration);
};

export const getZoomOut = (duration = 300) => {
  const { animationsEnabled } = useSettingsStore.getState();
  if (!animationsEnabled) return undefined;
  return ZoomOut.duration(duration);
};

export const getAnimationDuration = (duration = 300) => {
  const { animationsEnabled } = useSettingsStore.getState();
  return animationsEnabled ? duration : 0;
};

export const getLinearTransition = (duration = 300) => {
  const { animationsEnabled } = useSettingsStore.getState();
  if (!animationsEnabled) return undefined;
  return LinearTransition.duration(duration);
};

export const getSlideInRight = (delay = 0, duration = 400) => {
  const { animationsEnabled } = useSettingsStore.getState();
  if (!animationsEnabled) return undefined;
  return SlideInRight.duration(duration).delay(delay);
};

export const getSlideOutRight = (duration = 400) => {
  const { animationsEnabled } = useSettingsStore.getState();
  if (!animationsEnabled) return undefined;
  return SlideOutRight.duration(duration);
};

export const getLayoutSpringify = () => {
  const { animationsEnabled } = useSettingsStore.getState();
  if (!animationsEnabled) return undefined;
  return Layout.springify();
};
