import os
import re

search_dir = r'd:\App Folders\nnngravity\KnoVault\mobile'

files_to_check = []
for root, _, files in os.walk(search_dir):
    if 'node_modules' in root or '.expo' in root:
        continue
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            files_to_check.append(os.path.join(root, file))

for filepath in files_to_check:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    # Remove the helper imports
    content = re.sub(r'import\s+\{[^\}]*(?:withTimingHelper|withSpringHelper|withRepeatHelper)[^\}]*\}\s+from\s+[\'\"].*?animations[\'\"];?\n?', '', content)

    # Replace usages
    content = content.replace('withTimingHelper(', 'withTiming(')
    content = content.replace('withSpringHelper(', 'withSpring(')
    content = content.replace('withRepeatHelper(', 'withRepeat(')

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated {filepath}')
