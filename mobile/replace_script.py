import re

with open('app/(tabs)/profile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to find the start of the Master Notifications block
start_str = r'<View style=\{dynamicStyles.menuItem\}>\s*<View style=\{\[dynamicStyles.iconBox, \{ backgroundColor: \'#F59E0B15\' \}\]\}>\s*<Ionicons name="notifications-outline" size=\{20\} color="#F59E0B" />\s*</View>\s*<Text style=\{dynamicStyles.menuText\}>Master Notifications</Text>'

match = re.search(start_str, content)
if not match:
    print('Start not found')
    exit(1)
start = match.start()

# Pattern to find the end of the Animation Effects block
end_str = r'<Text style=\{dynamicStyles.menuText\}>Animation Effects</Text>.*?</View>\s*</View>'
end_match = re.search(end_str, content[start:], re.DOTALL)
if not end_match:
    print('End not found')
    exit(1)
end = start + end_match.end()

replacement = '''          <View style={dynamicStyles.menuItem}>
            <View style={[dynamicStyles.iconBox, { backgroundColor: '#14B8A615' }]}>
              <Ionicons name="color-wand-outline" size={20} color="#14B8A6" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={dynamicStyles.menuText}>Animation Effects</Text>
              <Text style={[typography.caption, { color: theme.textSecondary }]}>{animationsEnabled ? 'Enabled' : 'Disabled'}</Text>
            </View>
            <Switch
              value={animationsEnabled}
              onValueChange={handleAnimationsToggle}
              trackColor={{ false: theme.border, true: accentColor }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* ── NOTIFICATION CENTER ──────────────────────────────────── */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Notification Center</Text>
          
          <View style={dynamicStyles.notificationCard}>
            <View style={dynamicStyles.notificationHeaderRow}>
              <View style={[dynamicStyles.iconBox, { backgroundColor: '#F59E0B15' }]}>
                <Ionicons name="notifications-outline" size={20} color="#F59E0B" />
              </View>
              <Text style={[dynamicStyles.menuText, { marginLeft: 10, flex: 1 }]}>Master Notifications</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={(val) => { triggerHaptic(); toggleNotificationSetting('notificationsEnabled', 'knovault_notifications', val); }}
                trackColor={{ false: theme.border, true: accentColor }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={dynamicStyles.notificationDivider} />

            <View style={{ opacity: notificationsEnabled ? 1 : 0.5 }}>
              <View style={dynamicStyles.notificationChildRow}>
                <Text style={[dynamicStyles.menuText, { fontSize: 14 }]}>Reminder Alerts</Text>
                <Switch
                  value={notificationReminders}
                  onValueChange={(val) => { triggerHaptic(); toggleNotificationSetting('notificationReminders', 'knovault_notif_reminders', val); }}
                  trackColor={{ false: theme.border, true: accentColor }}
                  thumbColor="#FFFFFF"
                  style={{ transform: [{ scale: 0.8 }] }}
                  disabled={!notificationsEnabled}
                />
              </View>
              
              <View style={dynamicStyles.notificationChildRow}>
                <Text style={[dynamicStyles.menuText, { fontSize: 14 }]}>Goals & Projects</Text>
                <Switch
                  value={notificationGoals}
                  onValueChange={(val) => { triggerHaptic(); toggleNotificationSetting('notificationGoals', 'knovault_notif_goals', val); }}
                  trackColor={{ false: theme.border, true: accentColor }}
                  thumbColor="#FFFFFF"
                  style={{ transform: [{ scale: 0.8 }] }}
                  disabled={!notificationsEnabled}
                />
              </View>

              <View style={dynamicStyles.notificationChildRow}>
                <Text style={[dynamicStyles.menuText, { fontSize: 14 }]}>Daily Summary (8 AM)</Text>
                <Switch
                  value={notificationDailySummary}
                  onValueChange={(val) => { triggerHaptic(); toggleNotificationSetting('notificationDailySummary', 'knovault_notif_summary', val); }}
                  trackColor={{ false: theme.border, true: accentColor }}
                  thumbColor="#FFFFFF"
                  style={{ transform: [{ scale: 0.8 }] }}
                  disabled={!notificationsEnabled}
                />
              </View>

              <View style={dynamicStyles.notificationChildRow}>
                <Text style={[dynamicStyles.menuText, { fontSize: 14 }]}>Sound</Text>
                <Switch
                  value={notificationSound}
                  onValueChange={(val) => { triggerHaptic(); toggleNotificationSetting('notificationSound', 'knovault_notif_sound', val); }}
                  trackColor={{ false: theme.border, true: accentColor }}
                  thumbColor="#FFFFFF"
                  style={{ transform: [{ scale: 0.8 }] }}
                  disabled={!notificationsEnabled}
                />
              </View>

              <View style={dynamicStyles.notificationChildRowLast}>
                <Text style={[dynamicStyles.menuText, { fontSize: 14 }]}>Vibration</Text>
                <Switch
                  value={notificationVibration}
                  onValueChange={(val) => { triggerHaptic(); toggleNotificationSetting('notificationVibration', 'knovault_notif_vibration', val); }}
                  trackColor={{ false: theme.border, true: accentColor }}
                  thumbColor="#FFFFFF"
                  style={{ transform: [{ scale: 0.8 }] }}
                  disabled={!notificationsEnabled}
                />
              </View>
            </View>
          </View>
        </View>'''

new_content = content[:start] + replacement + content[end:]
with open('app/(tabs)/profile.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
print('Success')
