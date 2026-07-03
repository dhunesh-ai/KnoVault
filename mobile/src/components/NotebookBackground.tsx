import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, ViewProps } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface NotebookBackgroundProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'ruled' | 'blank';
  headerHeight?: number;
  lineHeight?: number;
  isSecure?: boolean;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export function NotebookBackground({
  children,
  variant = 'ruled',
  headerHeight = 110,
  lineHeight = 36,
  isSecure = false,
  style,
  ...rest
}: NotebookBackgroundProps) {
  const { isDark } = useTheme();
  const [layoutHeight, setLayoutHeight] = useState(SCREEN_HEIGHT);

  // Premium paper color schemes
  const getPaperColors = () => {
    if (isDark) {
      return isSecure 
        ? ['#1B112D', '#150A24'] // Velvet violet/indigo dark
        : ['#0B132B', '#0F172A']; // Charcoal/Slate dark
    } else {
      return isSecure
        ? ['#F8F3FF', '#F1E6FF'] // Lavender/Soft purple paper
        : ['#FCFAF2', '#F7F3E9']; // Warm Ivory/Cream paper
    }
  };

  const paperBg = getPaperColors();

  const marginLineColor = isDark 
    ? (isSecure ? '#A855F7' : '#8A3D52') // Vibrant purple or muted red/crimson
    : (isSecure ? '#C084FC' : '#FFA6A6'); // Muted lavender or soft coral/pink

  const lineStrokeColor = isDark 
    ? 'rgba(255, 255, 255, 0.05)' 
    : 'rgba(124, 77, 255, 0.08)';

  const onContainerLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0) {
      setLayoutHeight(height);
    }
  };

  const linesCount = Math.max(
    10,
    Math.ceil((layoutHeight - headerHeight) / lineHeight)
  );

  const renderRuledLines = () => {
    if (variant !== 'ruled') return null;

    const lines = [];
    for (let i = 0; i < linesCount; i++) {
      // position ruled lines to underline each text block line
      const topOffset = headerHeight + (i + 1) * lineHeight;
      lines.push(
        <View
          key={i}
          style={[
            styles.ruledLine,
            {
              top: topOffset,
              backgroundColor: lineStrokeColor,
            },
          ]}
        />
      );
    }
    return lines;
  };

  return (
    <View
      onLayout={onContainerLayout}
      style={[
        styles.container,
        {
          backgroundColor: paperBg[0],
          borderColor: isDark 
            ? (isSecure ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255,255,255,0.06)')
            : (isSecure ? 'rgba(168, 85, 247, 0.2)' : 'rgba(0,0,0,0.05)'),
          shadowColor: isSecure ? '#A855F7' : '#000000',
          shadowOpacity: isSecure ? (isDark ? 0.15 : 0.08) : 0.05,
        },
        style,
      ]}
      {...rest}
    >
      {/* Ruled Lines */}
      {renderRuledLines()}

      {/* Margin Line (Vertical red/pink/purple line) */}
      <View
        style={[
          styles.marginLine,
          {
            backgroundColor: marginLineColor,
          },
        ]}
      />

      {/* Children Content */}
      <View style={styles.contentContainer}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
    marginHorizontal: 12,
    marginVertical: 10,
    paddingBottom: 25,
  },
  marginLine: {
    position: 'absolute',
    left: 45,
    top: 0,
    bottom: 0,
    width: 1.5,
    opacity: 0.75,
    zIndex: 1,
  },
  ruledLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    zIndex: 0,
  },
  contentContainer: {
    flex: 1,
    zIndex: 2,
    paddingLeft: 60, // Elegant space after the margin line
    paddingRight: 20,
  },
});
