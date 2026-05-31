const fs = require('fs');
const file = 'd:/App Folders/nnngravity/KnoVault/mobile/app/(tabs)/profile.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove inline getThemedShadow and the comma before it
content = content.replace(/, getThemedShadow\([^)]+\)/g, '');

// 2. Remove ...getThemedShadow in StyleSheet objects
content = content.replace(/\s*\.\.\.getThemedShadow\([^)]+\),?/g, '');

// 3. Define cardFlat
const flatDef = `const borderCol = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

  const cardFlat = {
    backgroundColor: colors.surface || theme.card || transparentCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border || borderCol,
    shadowOpacity: 0,
    elevation: 0,
  } as const;`;

content = content.replace(/const borderCol = [^;]+;/, flatDef);

// 4. Update dataManagementCard, timelineCard
content = content.replace(/dataManagementCard: \{\s*backgroundColor: [^,]+,\s*borderRadius: [^,]+,\s*borderWidth: [^,]+,\s*borderColor: [^,]+,/g, 'dataManagementCard: {\n      ...cardFlat,');
content = content.replace(/timelineCard: \{\s*backgroundColor: [^,]+,\s*borderRadius: [^,]+,\s*borderWidth: [^,]+,\s*borderColor: [^,]+,/g, 'timelineCard: {\n      ...cardFlat,');

// Update chartCard, heatmapCard, intelligenceCard, feedbackCard
content = content.replace(/chartCard: \{\s*backgroundColor: [^,]+,\s*borderRadius: [^,]+,\s*borderWidth: [^,]+,\s*borderColor: [^,]+,/g, 'chartCard: {\n      ...cardFlat,');
content = content.replace(/heatmapCard: \{\s*backgroundColor: [^,]+,\s*borderRadius: [^,]+,\s*borderWidth: [^,]+,\s*borderColor: [^,]+,/g, 'heatmapCard: {\n      ...cardFlat,');
content = content.replace(/intelligenceCard: \{\s*backgroundColor: [^,]+,\s*borderRadius: [^,]+,\s*borderWidth: [^,]+,\s*borderColor: [^,]+,/g, 'intelligenceCard: {\n      ...cardFlat,');
content = content.replace(/feedbackCard: \{\s*backgroundColor: [^,]+,\s*borderRadius: [^,]+,\s*borderWidth: [^,]+,\s*borderColor: [^,]+,/g, 'feedbackCard: {\n      ...cardFlat,');

// Update menuItem
content = content.replace(/menuItem: \{\s*flexDirection: 'row',\s*alignItems: 'center',\s*backgroundColor: [^,]+,\s*borderRadius: [^,]+,\s*padding: 14,\s*marginBottom: 8,\s*borderWidth: [^,]+,\s*borderColor: [^\s]+\s*/g, "menuItem: {\n      ...cardFlat,\n      borderRadius: cardRadius + 4,\n      flexDirection: 'row',\n      alignItems: 'center',\n      padding: 14,\n      marginBottom: 8,\n");

// Update menuItemCol
content = content.replace(/menuItemCol: \{\s*backgroundColor: [^,]+,\s*borderRadius: [^,]+,\s*padding: 14,\s*marginBottom: 8,\s*borderWidth: [^,]+,\s*borderColor: [^\s]+\s*/g, 'menuItemCol: {\n      ...cardFlat,\n      borderRadius: cardRadius + 4,\n      padding: 14,\n      marginBottom: 8,\n');

// Update notificationCard
content = content.replace(/notificationCard: \{\s*backgroundColor: [^,]+,\s*borderRadius: [^,]+,\s*marginBottom: 8,\s*borderWidth: [^,]+,\s*borderColor: [^\s]+\s*overflow: 'hidden',/g, "notificationCard: {\n      ...cardFlat,\n      borderRadius: cardRadius + 4,\n      marginBottom: 8,\n      overflow: 'hidden',");

// Update overviewCard
content = content.replace(/overviewCard: \{\s*marginHorizontal: 25,\s*marginTop: 20,\s*marginBottom: 25,\s*padding: 24,\s*borderRadius: [^,]+,\s*backgroundColor: [^,]+,\s*borderWidth: [^,]+,\s*borderColor: [^,]+,/g, 'overviewCard: {\n      ...cardFlat,\n      marginHorizontal: 25,\n      marginTop: 20,\n      marginBottom: 25,\n      padding: 24,\n      borderRadius: cardRadius + 6,');

fs.writeFileSync(file, content);
console.log('Replacements complete');
