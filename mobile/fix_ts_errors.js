const fs = require('fs');

// Fix special_days.tsx import
const sdPath = 'app/special_days.tsx';
let sdContent = fs.readFileSync(sdPath, 'utf8');
sdContent = sdContent.replace(/from '\.\.\/\.\.\/src\/utils\/animations';/, "from '../src/utils/animations';");
fs.writeFileSync(sdPath, sdContent);

// Fix profile.tsx passcode + missing styles
const profilePath = 'app/(tabs)/profile.tsx';
let pContent = fs.readFileSync(profilePath, 'utf8');

// 1. Remove the entire Security Center block since it only contains App Passcode Lock and Change Passcode.
// Wait, does it contain anything else?
// The prompt said: "Keep the Security Center section but remove only App Passcode Lock."
// Let's look at Security Center.
// If Security Center only had passcode, we might keep it empty or with data shield?
// The user said: "Keep the Security Center section but remove only App Passcode Lock."
// Let's remove lines from 690 to 730 (the Passcode menu items).
const passcodeStart = pContent.indexOf('<View style={{ flex: 1, marginLeft: 10 }}>\n              <Text style={dynamicStyles.menuText}>App Passcode Lock</Text>');
if (passcodeStart !== -1) {
    // Find the enclosing View of this menuItem
    const viewStart = pContent.lastIndexOf('<View style={dynamicStyles.menuItem}>', passcodeStart);
    // Find the end of the passcodeEnabled condition
    const blockEnd = pContent.indexOf('{passcodeEnabled && (', passcodeStart);
    const viewEnd = pContent.indexOf(')}', blockEnd) + 2;
    
    pContent = pContent.substring(0, viewStart) + pContent.substring(viewEnd);
}

// 2. Remove `handleAppLockToggle`
const lockToggleStart = pContent.indexOf('const handleAppLockToggle');
if (lockToggleStart !== -1) {
    const lockToggleEnd = pContent.indexOf('};', lockToggleStart) + 2;
    pContent = pContent.substring(0, lockToggleStart) + pContent.substring(lockToggleEnd);
}

// 3. Add missing notification styles to dynamicStyles
const stylesTarget = '    toastText: { ...typography.bodyMedium, color: theme.text, marginLeft: 10, flex: 1 },';
const missingStyles = `
    notificationCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    notificationHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    notificationDivider: {
      height: 1,
      backgroundColor: theme.border,
      marginLeft: 46,
    },
    notificationChildRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingRight: 16,
      marginLeft: 46,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    notificationChildRowLast: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingRight: 16,
      marginLeft: 46,
    },`;

if (pContent.indexOf('notificationChildRowLast:') === -1) {
    pContent = pContent.replace(stylesTarget, stylesTarget + missingStyles);
}

fs.writeFileSync(profilePath, pContent);
console.log('Fixed profile and special_days');
