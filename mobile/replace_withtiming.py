import os
import glob
import re

anim_file = 'src/utils/animations.ts'
with open(anim_file, 'r', encoding='utf-8') as f:
    anim_content = f.read()

if 'withTimingHelper' not in anim_content:
    anim_content += '''
import { withTiming as reanimatedWithTiming, withSpring as reanimatedWithSpring, withRepeat as reanimatedWithRepeat } from 'react-native-reanimated';

export const withTimingHelper = (toValue: any, userConfig?: any, callback?: any) => {
  const { animationsEnabled } = useSettingsStore.getState();
  if (!animationsEnabled) {
    return reanimatedWithTiming(toValue, { ...userConfig, duration: 0 }, callback);
  }
  return reanimatedWithTiming(toValue, userConfig, callback);
};

export const withSpringHelper = (toValue: any, userConfig?: any, callback?: any) => {
  const { animationsEnabled } = useSettingsStore.getState();
  if (!animationsEnabled) {
    return reanimatedWithTiming(toValue, { duration: 0 }, callback);
  }
  return reanimatedWithSpring(toValue, userConfig, callback);
};

export const withRepeatHelper = (animation: any, numberOfReps?: number, reverse?: boolean, callback?: any) => {
  const { animationsEnabled } = useSettingsStore.getState();
  if (!animationsEnabled) {
    return animation; // Just return the target without repeat
  }
  return reanimatedWithRepeat(animation, numberOfReps, reverse, callback);
};
'''
    with open(anim_file, 'w', encoding='utf-8') as f:
        f.write(anim_content)

files_to_check = glob.glob('**/*.tsx', recursive=True) + glob.glob('**/*.ts', recursive=True)

for filepath in files_to_check:
    if filepath == anim_file or 'node_modules' in filepath:
        continue

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    
    # We want to replace calls to withTiming( with withTimingHelper(
    if 'withTiming(' in content:
        content = content.replace('withTiming(', 'withTimingHelper(')
    if 'withSpring(' in content:
        content = content.replace('withSpring(', 'withSpringHelper(')
    if 'withRepeat(' in content:
        content = content.replace('withRepeat(', 'withRepeatHelper(')

    # Now fix imports
    if content != original_content:
        # Check what we added
        needs_timing = 'withTimingHelper' in content and 'withTimingHelper' not in original_content
        needs_spring = 'withSpringHelper' in content and 'withSpringHelper' not in original_content
        needs_repeat = 'withRepeatHelper' in content and 'withRepeatHelper' not in original_content
        
        helpers_to_add = []
        if needs_timing: helpers_to_add.append('withTimingHelper')
        if needs_spring: helpers_to_add.append('withSpringHelper')
        if needs_repeat: helpers_to_add.append('withRepeatHelper')

        if helpers_to_add:
            # Figure out relative path to src/utils/animations
            # e.g., app/(tabs)/profile.tsx -> ../../src/utils/animations
            norm_path = filepath.replace('\\', '/')
            depth = len(norm_path.split('/')) - 1
            if norm_path.startswith('src/'):
                rel_path = '../' * (depth - 1) + 'utils/animations'
                if depth == 1: rel_path = './utils/animations'
            else:
                rel_path = '../' * depth + 'src/utils/animations'
            
            import_stmt = f"import {{ {', '.join(helpers_to_add)} }} from '{rel_path}';\n"
            content = re.sub(r"(import React.*?;\n)", r"\1" + import_stmt, content, count=1)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Processed {filepath}")

print("Done")
