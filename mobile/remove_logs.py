import os
import re

def remove_console_logs(directory):
    count = 0
    pattern = re.compile(r'^\s*console\.log\(.*?\);\s*$', re.MULTILINE)
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.ts') or file.endswith('.tsx'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # We do a basic replacement of lines that are just console.log(...)
                # To be safer, we can just replace console.log with // console.log
                new_content, num_subs = re.subn(r'(?<!//\s)(console\.log\()', r'// \1', content)
                
                if num_subs > 0:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    count += num_subs
                    print(f"Commented {num_subs} logs in {file}")
                    
    print(f"Total console.log statements commented out: {count}")

if __name__ == '__main__':
    remove_console_logs(r'd:\App Folders\nnngravity\KnoVault\mobile\src')
