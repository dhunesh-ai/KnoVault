import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { workspacesApi, Workspace } from '../../src/api/workspaces';
import Animated from 'react-native-reanimated';
import { getFadeInDown, getZoomIn } from '../../src/utils/animations';
import { getThemedShadow } from '../../src/components/ThemedComponents';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const WORKSPACE_CATEGORIES = [
  'Academic',
  'Project',
  'Startup',
  'Personal Team',
  'Event Planning',
  'Research',
  'Family',
];

const EMOJI_OPTIONS = ['💼', '🚀', '🎓', '💡', '🎨', '🔬', '📅', '🏠', '🧩', '📈', '🤝', '📣'];

const THEME_COLORS = [
  { name: 'purple', value: '#7C4DFF' },
  { name: 'blue', value: '#2979FF' },
  { name: 'emerald', value: '#00E676' },
  { name: 'amber', value: '#FFC400' },
  { name: 'rose', value: '#FF1744' },
];

export default function WorkspacesScreen() {
  const { colors, theme, isDark } = useTheme();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create Workspace Modal States
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [newWsIcon, setNewWsIcon] = useState('💼');
  const [newWsTheme, setNewWsTheme] = useState('purple');
  const [newWsCategory, setNewWsCategory] = useState('Project');
  const [newWsPrivacy, setNewWsPrivacy] = useState('Private');

  // Join Workspace Modal States
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [inviteToken, setInviteToken] = useState('');


  // Query workspaces
  const { data: workspaces, isLoading, refetch } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: workspacesApi.getWorkspaces,
  });

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [])
  );

  // Mutation to create workspace
  const createMutation = useMutation({
    mutationFn: workspacesApi.createWorkspace,
    onSuccess: (newWorkspace) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setCreateModalVisible(false);
      resetForm();
      // Navigate to detailed workspace page
      router.push(`/workspace/${newWorkspace.id}`);
    },
  });

  // Mutation to join workspace via token
  const joinWithTokenMutation = useMutation({
    mutationFn: workspacesApi.joinWithToken,
    onSuccess: (joinedWorkspace) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setJoinModalVisible(false);
      setInviteToken('');
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
      router.push(`/workspace/${joinedWorkspace.id}`);
    },
    onError: (error: any) => {
      const errMsg = error?.response?.data?.detail || 'Failed to join workspace. Please verify the code is correct, active, and has not expired.';
      alert(errMsg);
    }
  });

  const handleJoinWithToken = async () => {
    if (!inviteToken.trim()) {
      alert('Please enter an invite code');
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    joinWithTokenMutation.mutate(inviteToken.trim());
  };


  const resetForm = () => {
    setNewWsName('');
    setNewWsDesc('');
    setNewWsIcon('💼');
    setNewWsTheme('purple');
    setNewWsCategory('Project');
    setNewWsPrivacy('Private');
  };

  const handleCreate = async () => {
    if (!newWsName.trim()) {
      alert('Please enter a workspace name');
      return;
    }
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}

    createMutation.mutate({
      name: newWsName,
      description: newWsDesc,
      icon: newWsIcon,
      theme: newWsTheme,
      category: newWsCategory,
      privacy_level: newWsPrivacy,
    });
  };

  const filteredWorkspaces = workspaces?.filter((ws) =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (ws.description && ws.description.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case 'Public': return 'earth';
      case 'Invite Only': return 'key-outline';
      default: return 'lock-closed';
    }
  };

  const getThemeColor = (themeName: string) => {
    const item = THEME_COLORS.find(c => c.name === themeName);
    return item ? item.value : theme.primary;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Premium Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Collaborative hub</Text>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Workspaces</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity 
            style={[styles.plusButtonHeader, { backgroundColor: `${theme.primary}15` }]}
            onPress={() => setJoinModalVisible(true)}
          >
            <Ionicons name="enter-outline" size={22} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.plusButtonHeader, { backgroundColor: `${theme.primary}15` }]}
            onPress={() => setCreateModalVisible(true)}
          >
            <Ionicons name="add" size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>


      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name="search" size={20} color={colors.text.tertiary} style={styles.searchIcon} />
        <TextInput
          placeholder="Search workspaces..."
          placeholderTextColor={colors.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { color: theme.text }]}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading your workspaces...</Text>
        </View>
      ) : filteredWorkspaces.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: `${theme.primary}10` }]}>
            <Ionicons name="people-outline" size={48} color={theme.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No Workspaces Found</Text>
          <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
            Create your first collaboration room to share notes, track tasks, and goals with your team.
          </Text>
          <TouchableOpacity 
            style={[styles.createBtnEmpty, { backgroundColor: theme.primary }]}
            onPress={() => setCreateModalVisible(true)}
          >
            <Text style={styles.createBtnText}>Create Workspace</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredWorkspaces}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Animated.View entering={getFadeInDown(index * 100)}>
              <TouchableOpacity
                style={[
                  styles.wsCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    ...getThemedShadow(theme, 'soft'),
                  }
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch (e) {}
                  router.push(`/workspace/${item.id}`);
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconBox, { backgroundColor: `${getThemeColor(item.theme)}15` }]}>
                    <Text style={styles.iconText}>{item.icon}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.wsName, { color: theme.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.badgeRow}>
                      <View style={[styles.badge, { backgroundColor: `${getThemeColor(item.theme)}12` }]}>
                        <Text style={[styles.badgeText, { color: getThemeColor(item.theme) }]}>
                          {item.category}
                        </Text>
                      </View>
                      <View style={[styles.privacyBadge, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                        <Ionicons name={getPrivacyIcon(item.privacy_level) as any} size={12} color={colors.text.tertiary} style={{ marginRight: 4 }} />
                        <Text style={[styles.privacyText, { color: theme.textSecondary }]}>
                          {item.privacy_level}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {item.description && (
                  <Text style={[styles.wsDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}

                <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
                  <View style={styles.membersCountBox}>
                    <Ionicons name="people" size={16} color={theme.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                      {item.members?.length || 1} {item.members?.length === 1 ? 'member' : 'members'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary, ...getThemedShadow(theme, 'medium') }]}
        activeOpacity={0.8}
        onPress={() => setCreateModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Create Workspace Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createModalVisible}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>New Workspace</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollForm}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Workspace Name</Text>
              <TextInput
                placeholder="e.g. AI Research Group"
                placeholderTextColor={colors.text.tertiary}
                value={newWsName}
                onChangeText={setNewWsName}
                maxLength={50}
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>Description</Text>
              <TextInput
                placeholder="Brief summary of your project or class..."
                placeholderTextColor={colors.text.tertiary}
                value={newWsDesc}
                onChangeText={setNewWsDesc}
                multiline
                numberOfLines={3}
                style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.border }]}
              />

              {/* Emoji Picker */}
              <Text style={[styles.label, { color: theme.textSecondary }]}>Choose Workspace Icon</Text>
              <View style={styles.emojiGrid}>
                {EMOJI_OPTIONS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.emojiButton,
                      { backgroundColor: newWsIcon === emoji ? `${theme.primary}20` : 'transparent' },
                    ]}
                    onPress={() => setNewWsIcon(emoji)}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Theme Picker */}
              <Text style={[styles.label, { color: theme.textSecondary }]}>Select Color Accent</Text>
              <View style={styles.colorGrid}>
                {THEME_COLORS.map((item) => (
                  <TouchableOpacity
                    key={item.name}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: item.value },
                    ]}
                    onPress={() => setNewWsTheme(item.name)}
                  >
                    {newWsTheme === item.name && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category Picker */}
              <Text style={[styles.label, { color: theme.textSecondary }]}>Category</Text>
              <View style={styles.chipGrid}>
                {WORKSPACE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: newWsCategory === cat ? theme.primary : (isDark ? '#1E293B' : '#F1F5F9'),
                        borderColor: newWsCategory === cat ? theme.primary : theme.border,
                      }
                    ]}
                    onPress={() => setNewWsCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: newWsCategory === cat ? '#FFFFFF' : theme.textSecondary },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Privacy Picker */}
              <Text style={[styles.label, { color: theme.textSecondary }]}>Privacy Level</Text>
              <View style={styles.privacyGrid}>
                {['Private', 'Invite Only', 'Public'].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.privacyBtn,
                      {
                        backgroundColor: newWsPrivacy === p ? `${theme.primary}12` : 'transparent',
                        borderColor: newWsPrivacy === p ? theme.primary : theme.border,
                      }
                    ]}
                    onPress={() => setNewWsPrivacy(p)}
                  >
                    <Ionicons
                      name={getPrivacyIcon(p) as any}
                      size={18}
                      color={newWsPrivacy === p ? theme.primary : colors.text.tertiary}
                      style={{ marginBottom: 4 }}
                    />
                    <Text style={[styles.privacyBtnText, { color: newWsPrivacy === p ? theme.primary : theme.textSecondary }]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Privacy Description */}
              <View style={{ marginTop: 10, paddingHorizontal: 4 }}>
                <Text style={{ fontSize: 13, color: theme.textSecondary, fontStyle: 'italic' }}>
                  {newWsPrivacy === 'Private' && '🔒 Only manually added members can access.'}
                  {newWsPrivacy === 'Invite Only' && '🔑 Anyone with an invite link can join.'}
                  {newWsPrivacy === 'Public' && '🌐 Visible to everyone.'}
                </Text>
              </View>

              {/* Action Buttons */}

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.btnCancel, { borderColor: theme.border }]}
                  onPress={() => setCreateModalVisible(false)}
                >
                  <Text style={[styles.btnCancelText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnCreate, { backgroundColor: theme.primary }]}
                  onPress={handleCreate}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.btnCreateText}>Create Workspace</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Join Workspace Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={joinModalVisible}
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Join Workspace</Text>
              <TouchableOpacity onPress={() => setJoinModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollForm}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Invite Code / Token</Text>
              <TextInput
                placeholder="Enter invite code (e.g. 5a1b2c3d...)"
                placeholderTextColor={colors.text.tertiary}
                value={inviteToken}
                onChangeText={setInviteToken}
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.btnCancel, { borderColor: theme.border }]}
                  onPress={() => setJoinModalVisible(false)}
                >
                  <Text style={[styles.btnCancelText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnCreate, { backgroundColor: theme.primary }]}
                  onPress={handleJoinWithToken}
                  disabled={joinWithTokenMutation.isPending}
                >
                  {joinWithTokenMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.btnCreateText}>Join Workspace</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 110, // Make room for floating bottom tab navigation bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 15,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    marginTop: 2,
  },
  plusButtonHeader: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 50,
  },
  emptyIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 25,
  },
  createBtnEmpty: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  wsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  iconText: {
    fontSize: 24,
  },
  cardInfo: {
    flex: 1,
  },
  wsName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  privacyText: {
    fontSize: 11,
    fontWeight: '500',
  },
  wsDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
  },
  membersCountBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  scrollForm: {
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    fontSize: 15,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 48,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 22,
  },
  colorGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  privacyGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  privacyBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  privacyBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 30,
  },
  btnCancel: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnCancelText: {
    fontSize: 15,
    fontWeight: '700',
  },
  btnCreate: {
    flex: 2,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnCreateText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
