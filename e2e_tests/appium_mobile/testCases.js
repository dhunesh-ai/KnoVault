/**
 * KnoVault Real Mobile Appium E2E Test Cases Definitions (Exactly 300 Unique Test Cases)
 * IDs: MOB-E2E-001 through MOB-E2E-300
 */

const mobileCategories = {
  LAUNCH: 'App Launch & Onboarding',
  AUTH: 'Mobile Authentication',
  DASHBOARD: 'Dashboard & Navigation',
  NOTES: 'Mobile Notes & Secure Notes',
  REMINDERS: 'Mobile Reminders',
  CALENDAR: 'Mobile Calendar & Special Days',
  GOALS: 'Mobile Goals & Habit Tracking',
  WORKSPACES: 'Workspaces & Settings',
  AI: 'Mobile KnoVault AI',
  GESTURES_EDGE: 'Gestures & Android Edge Cases'
};

const mobileTestCases = [
  // ==========================================
  // 1. APP LAUNCH & ONBOARDING (MOB-E2E-001 - MOB-E2E-020)
  // ==========================================
  {
    id: 'MOB-E2E-001',
    category: mobileCategories.LAUNCH,
    name: 'test_mobile_splash_screen_display',
    scenario: 'Verify mobile app displays splash screen with KnoVault branding on cold start',
    preconditions: 'App cold launch initialized',
    steps: '1. Launch app package\n2. Observe splash screen logo\n3. Wait for transition',
    expected: 'Splash screen rendered cleanly with transition to onboarding screen'
  },
  {
    id: 'MOB-E2E-002',
    category: mobileCategories.LAUNCH,
    name: 'test_mobile_initial_route_check',
    scenario: 'Verify unauthenticated user lands on Onboarding screen on first launch',
    preconditions: 'App data cleared / first launch',
    steps: '1. Launch app\n2. Check active view accessibility ID',
    expected: 'Onboarding screen active with "Welcome to KnoVault"'
  },
  {
    id: 'MOB-E2E-003',
    category: mobileCategories.LAUNCH,
    name: 'test_mobile_onboarding_slide_1_view',
    scenario: 'Verify onboarding slide 1 content and illustration rendering',
    preconditions: 'Onboarding screen open',
    steps: '1. Observe slide 1 title and image\n2. Verify "Next" button visible',
    expected: 'Slide 1 displays "Organize Notes & Knowledge Effortlessly"'
  },
  {
    id: 'MOB-E2E-004',
    category: mobileCategories.LAUNCH,
    name: 'test_mobile_onboarding_swipe_slide_2',
    scenario: 'Verify horizontal swipe gesture moves to onboarding slide 2',
    preconditions: 'Slide 1 visible',
    steps: '1. Swipe left on screen\n2. Observe active indicator dot',
    expected: 'Slide 2 active displaying "Track Reminders & Special Days"'
  },
  {
    id: 'MOB-E2E-005',
    category: mobileCategories.LAUNCH,
    name: 'test_mobile_onboarding_swipe_slide_3',
    scenario: 'Verify horizontal swipe gesture moves to onboarding slide 3',
    preconditions: 'Slide 2 visible',
    steps: '1. Swipe left on screen\n2. Observe active indicator dot',
    expected: 'Slide 3 active displaying "AI-Powered Vault & Goals"'
  },
  {
    id: 'MOB-E2E-006',
    category: mobileCategories.LAUNCH,
    name: 'test_mobile_onboarding_skip_button_tap',
    scenario: 'Verify tapping Skip button bypasses onboarding directly to Login screen',
    preconditions: 'Slide 1 visible',
    steps: '1. Tap "Skip" button in top right header',
    expected: 'Onboarding dismissed and Login screen displayed'
  },
  {
    id: 'MOB-E2E-007',
    category: mobileCategories.LAUNCH,
    name: 'test_mobile_onboarding_get_started_tap',
    scenario: 'Verify tapping Get Started on final slide navigates to Login',
    preconditions: 'Slide 3 visible',
    steps: '1. Tap "Get Started" primary button',
    expected: 'Navigated to Login screen and onboarding marked completed in AsyncStorage'
  },
  {
    id: 'MOB-E2E-008',
    category: mobileCategories.LAUNCH,
    name: 'test_mobile_relaunch_bypasses_onboarding',
    scenario: 'Verify subsequent app launches skip onboarding when already completed',
    preconditions: 'Onboarding previously completed',
    steps: '1. Relaunch app package',
    expected: 'App directly displays Login screen without showing onboarding'
  },
  {
    id: 'MOB-E2E-009',
    category: mobileCategories.LAUNCH,
    name: 'test_mobile_system_dark_mode_detection',
    scenario: 'Verify app respects system dark mode theme preference on launch',
    preconditions: 'Android system dark theme enabled',
    steps: '1. Launch app\n2. Inspect screen background color style',
    expected: 'App theme defaults to dark mode palette (#0B0F19)'
  },
  {
    id: 'MOB-E2E-010',
    category: mobileCategories.LAUNCH,
    name: 'test_mobile_dynamic_font_scaling_compliance',
    scenario: 'Verify text elements scale properly when device accessibility font size is increased',
    preconditions: 'Android font scale set to 1.3x',
    steps: '1. Launch app\n2. Inspect header text bounds',
    expected: 'Text wraps cleanly without clipping or layout truncation'
  },
  {
    id: 'MOB-E2E-011',
    category: mobileCategories.LAUNCH,
    name: 'test_mobile_orientation_change_portrait_to_landscape',
    scenario: 'Verify layout adjusts smoothly when device rotated to landscape mode',
    preconditions: 'App on Login screen',
    steps: '1. Rotate device to LANDSCAPE',
    expected: 'Form layout adjusts horizontally with scrollable container'
  },
  {
    id: 'MOB-E2E-012',
    category: mobileCategories.LAUNCH,
    name: 'test_mobile_orientation_change_landscape_to_portrait',
    scenario: 'Verify layout restores correctly when device rotated back to portrait',
    preconditions: 'Device in LANDSCAPE mode',
    steps: '1. Rotate device back to PORTRAIT',
    expected: 'Portrait layout restored cleanly'
  },
  {
    id: 'MOB-E2E-013',
    category: mobileCategories.LAUNCH,
    name: 'test_mobile_app_backgrounding_and_resume',
    scenario: 'Verify app state preserved when sent to background and resumed',
    preconditions: 'Form input partially entered',
    steps: '1. Press Home button (background app)\n2. Re-open app from recent apps',
    expected: 'Screen state and entered text restored intact'
  },
  {
    id: 'MOB-E2E-014',
    category: mobileCategories.LAUNCH,
    name: 'test_mobile_deep_link_handling',
    scenario: 'Verify deep link URL opening navigates to specific screen',
    preconditions: 'Deep link knovault://reminders invoked',
    steps: '1. Open deep link via adb shell am start',
    expected: 'App opens and navigates directly to Reminders tab'
  },
  {
    id: 'MOB-E2E-015',
    category: mobileCategories.LAUNCH,
    name: 'test_mobile_notification_permission_request_dialog',
    scenario: 'Verify Android 13+ notification permission prompt display',
    preconditions: 'First request for notification access',
    steps: '1. Trigger notification feature\n2. Observe permission dialog',
    expected: 'Android system permission dialog displayed for POST_NOTIFICATIONS'
  },
  {
    id: 'MOB-E2E-016',
    category: mobileCategories.LAUNCH,
    name: 'test_mobile_storage_permission_request_dialog',
    scenario: 'Verify storage permission prompt when attaching files',
    preconditions: 'User taps attach file',
    steps: '1. Tap attach photo\n2. Observe permission prompt',
    expected: 'Storage / Media permission dialog displayed'
  },
  {
    id: 'MOB-E2E-017',
    category: mobileCategories.LAUNCH,
    name: 'test_mobile_network_connectivity_change_listener',
    scenario: 'Verify offline banner displayed when device network connection drops',
    preconditions: 'App active',
    steps: '1. Toggle Wi-Fi / Mobile data OFF',
    expected: 'Top banner "No Internet Connection - Offline Mode" displayed'
  },
  {
    id: 'MOB-E2E-018',
    category: mobileCategories.LAUNCH,
    name: 'test_mobile_version_label_footer_check',
    scenario: 'Verify app version string rendered in settings footer',
    preconditions: 'Settings screen open',
    steps: '1. Scroll to bottom of Settings screen',
    expected: 'Version label "KnoVault v1.0.0 (Build 100)" visible'
  },
  {
    id: 'MOB-E2E-019',
    category: mobileCategories.LAUNCH,
    name: 'test_mobile_low_memory_warning_handler',
    scenario: 'Verify image cache cleared on OS low memory signal',
    preconditions: 'App running under memory pressure',
    steps: '1. Simulate TRIM_MEMORY_RUNNING_CRITICAL',
    expected: 'App releases image cache without crashing'
  },
  {
    id: 'MOB-E2E-020',
    category: mobileCategories.LAUNCH,
    name: 'test_mobile_unhandled_exception_boundary_screen',
    scenario: 'Verify graceful fallback error screen on component runtime error',
    preconditions: 'Simulated component fault',
    steps: '1. Trigger test error boundary',
    expected: 'Fallback screen displays "Something went wrong" with "Reload App" button'
  }
];

const mobileSuites = [
  // 2. MOBILE AUTHENTICATION (MOB-E2E-021 to MOB-E2E-045) - 25 cases
  { cat: mobileCategories.AUTH, prefix: 'auth', count: 25, topics: [
    'touch_input_email_field', 'touch_input_password_field', 'password_visibility_toggle_button', 'mobile_login_submit_tap',
    'invalid_credentials_error_modal', 'empty_form_submission_validation', 'mobile_signup_navigation_link', 'signup_email_field_validation',
    'signup_otp_screen_display', 'six_digit_otp_keypad_entry', 'otp_autoread_sms_mock', 'resend_otp_countdown_timer',
    'password_strength_meter_display', 'confirm_password_match_check', 'biometric_login_prompt_display', 'biometric_auth_success',
    'biometric_fallback_to_pin', 'remember_me_checkbox_toggle', 'forgot_password_flow_button', 'password_reset_email_sent_toast',
    'mobile_logout_action_sheet_tap', 'logout_confirmation_dialog', 'session_expiration_redirect_to_login', 'secure_token_storage_keychain',
    'multiaccount_switcher_mobile_login'
  ]},

  // 3. DASHBOARD & NAVIGATION (MOB-E2E-046 to MOB-E2E-070) - 25 cases
  { cat: mobileCategories.DASHBOARD, prefix: 'dashboard', count: 25, topics: [
    'bottom_tab_bar_rendering', 'tab_bar_icon_active_highlight', 'tap_notes_tab_icon', 'tap_reminders_tab_icon',
    'tap_calendar_tab_icon', 'tap_goals_tab_icon', 'tap_settings_tab_icon', 'dashboard_summary_cards_layout',
    'quick_add_fab_expand_animation', 'fab_create_note_tap', 'fab_create_reminder_tap', 'fab_create_special_day_tap',
    'pull_to_refresh_gesture_trigger', 'refresh_spinner_animation', 'stat_card_tap_navigation_to_list', 'greeting_banner_time_display',
    'todays_agenda_list_rendering', 'quick_search_bar_focus_tap', 'voice_input_button_tap', 'swipe_left_action_dashboard_item',
    'swipe_right_action_dashboard_item', 'badge_count_on_tab_icons', 'offline_banner_display_header', 'top_bar_user_profile_avatar_tap',
    'quick_theme_toggle_switch_drawer'
  ]},

  // 4. MOBILE NOTES & SECURE NOTES (MOB-E2E-071 to MOB-E2E-110) - 40 cases
  { cat: mobileCategories.NOTES, prefix: 'notes', count: 40, topics: [
    'list_view_rendering', 'create_note_floating_button_tap', 'keyboard_popup_on_title_focus', 'title_input_text_entry',
    'content_multiline_input_entry', 'category_picker_modal_select', 'color_swatch_selection', 'rich_text_formatting_toolbar',
    'camera_button_photo_attachment', 'gallery_photo_picker_selection', 'voice_note_recorder_button_tap', 'save_note_button_tap',
    'note_detail_view_navigation', 'edit_note_action_tap', 'delete_note_swipe_gesture', 'confirm_delete_dialog_tap',
    'search_notes_input_filtering', 'filter_notes_by_tag_sheet', 'pin_note_toggle_action', 'create_secure_note_4digit_pin',
    'pin_entry_pad_rendering', 'correct_pin_unlock_animation', 'incorrect_pin_shake_animation_toast', 'autolock_secure_note_minimize',
    'unmask_secure_note_toggle', 'copy_note_text_clipboard', 'clipboard_cleared_notice_toast', 'share_note_native_mobile_sheet',
    'note_word_count_indicator', 'note_timestamp_relative_formatting', 'note_grid_layout_view_toggle', 'note_list_layout_view_toggle',
    'sort_notes_bottom_sheet', 'trash_bin_screen_navigation', 'permanently_delete_note', 'restore_note_from_trash',
    'export_note_as_pdf_document', 'drag_to_reorder_notes_list', 'special_characters_input_mobile_note', 'very_long_note_scroll_behavior'
  ]},

  // 5. MOBILE REMINDERS (MOB-E2E-111 to MOB-E2E-155) - 45 cases
  { cat: mobileCategories.REMINDERS, prefix: 'reminders', count: 45, topics: [
    'screen_list_view_rendering', 'tap_add_reminder_button', 'title_input_field_focus', 'select_category_meeting',
    'select_category_assignment', 'select_category_event', 'select_category_medicine', 'select_category_custom',
    'set_priority_high_red_flag', 'set_priority_medium_yellow_flag', 'set_priority_low_blue_flag', 'date_picker_modal_open',
    'date_selection_scroll_wheel', 'time_picker_modal_open', 'hour_minute_scroll_wheel', 'am_pm_selector_toggle',
    'save_reminder_button_tap', 'checkbox_tap_to_complete_reminder', 'completed_strike_through_animation', 'undo_completed_reminder_toast',
    'swipe_to_delete_reminder', 'edit_reminder_detail_screen', 'filter_by_today_tab', 'filter_by_upcoming_tab',
    'filter_by_overdue_tab', 'filter_by_completed_tab', 'group_by_category_view_toggle', 'snooze_push_notification_action',
    'dismiss_push_notification_action', 'local_push_notification_trigger', 'repeat_reminder_daily', 'repeat_reminder_weekly',
    'repeat_reminder_monthly', 'add_subtasks_to_reminder', 'complete_subtask_checkbox', 'reminder_attachment_link',
    'search_reminders_input', 'clear_completed_reminders_action', 'bulk_select_reminders_mode', 'timezone_offset_adjustment',
    'invalid_past_date_warning', 'reminder_note_field_entry', 'sound_picker_notification', 'vibrate_alert_pattern_selection',
    'reminder_list_empty_state_view'
  ]},

  // 6. MOBILE CALENDAR & SPECIAL DAYS (MOB-E2E-156 to MOB-E2E-190) - 35 cases
  { cat: mobileCategories.CALENDAR, prefix: 'calendar', count: 35, topics: [
    'month_calendar_grid_view_render', 'day_calendar_agenda_view_render', 'week_calendar_view_render', 'month_swipe_left_next_month',
    'month_swipe_right_previous_month', 'tap_calendar_day_cell', 'selected_date_indicator_circle', 'day_agenda_event_list_under_calendar',
    'tap_event_item_in_day_agenda', 'tap_add_special_day_button', 'title_input_field_focus', 'date_picker_for_birthday',
    'birthday_category_badge', 'anniversary_category_badge', 'custom_event_category_badge', 'relationship_tag_selector_sheet',
    'advance_reminder_dropdown_1day', 'contact_import_picker_trigger', 'call_contact_action_button_tap', 'send_sms_wish_message_trigger',
    'gift_idea_notes_textarea', 'display_age_counter_badge', 'special_day_search_filter', 'special_day_card_swipe_delete',
    'calendar_filter_toggle_hide_completed', 'jump_to_today_button_tap', 'year_picker_dropdown', 'highlight_special_days_grid',
    'export_calendar_to_device_ics', 'color_code_event_markers', 'multiday_event_range_picker', 'special_day_list_sorting',
    'milestone_countdown_widget_render', 'birthday_cake_icon_display', 'special_day_details_sheet_dismiss'
  ]},

  // 7. MOBILE GOALS (MOB-E2E-191 to MOB-E2E-220) - 30 cases
  { cat: mobileCategories.GOALS, prefix: 'goals', count: 30, topics: [
    'goals_list_screen_render', 'tap_create_goal_button', 'goal_title_input_focus', 'target_number_input_field',
    'select_goal_category_fitness_career', 'deadline_date_picker_select', 'save_goal_button_tap', 'increment_goal_progress_tap',
    'progress_bar_fill_animation', 'circular_progress_indicator_text', 'add_subgoal_milestone', 'complete_subgoal_check',
    'goal_detail_view_render', 'edit_goal_parameters', 'mark_goal_completed_action', 'celebration_confetti_animation_100pct',
    'daily_habit_streak_counter_badge', 'streak_flame_icon_update', 'missed_day_streak_reset_warning', 'filter_active_goals',
    'filter_completed_goals', 'sort_goals_by_progress_percent', 'link_reminder_to_goal_modal', 'goal_reflection_notes_entry',
    'delete_goal_action_sheet', 'archive_goal_option', 'share_goal_progress_image', 'habit_tracker_grid_calendar_view',
    'daily_checkin_reminder_toggle', 'goal_list_empty_state_card'
  ]},

  // 8. MOBILE WORKSPACES & SETTINGS (MOB-E2E-221 to MOB-E2E-245) - 25 cases
  { cat: mobileCategories.WORKSPACES, prefix: 'workspaces', count: 25, topics: [
    'open_drawer_menu_workspace_switcher', 'switch_active_workspace_tap', 'create_new_workspace_modal', 'workspace_name_input_focus',
    'save_workspace_button_tap', 'workspace_icon_color_picker', 'invite_team_member_email_input', 'member_list_view_render',
    'member_role_badge_admin_editor', 'remove_member_tap', 'workspace_settings_screen', 'rename_workspace',
    'delete_workspace_confirmation_dialog', 'profile_settings_tab_tap', 'user_name_edit_field', 'user_avatar_image_picker',
    'change_password_screen', 'biometrics_toggle_switch_settings', 'storage_usage_breakdown_bar', 'clear_app_cache_button_tap',
    'export_all_user_data_json', 'theme_selection_system_default', 'theme_selection_light_mode', 'theme_selection_dark_mode',
    'app_version_release_notes_modal'
  ]},

  // 9. MOBILE KNOVAULT AI (MOB-E2E-246 to MOB-E2E-270) - 25 cases
  { cat: mobileCategories.AI, prefix: 'ai', count: 25, topics: [
    'open_ai_assistant_tab_button', 'ai_chat_interface_screen_render', 'prompt_input_textbox_focus', 'type_prompt_message',
    'send_message_button_tap', 'ai_thinking_loading_animation', 'received_ai_message_bubble_render', 'copy_ai_message_text_gesture',
    'save_ai_response_to_notes_tap', 'regenerate_response_button_tap', 'clear_conversation_history_button', 'select_ai_preset_prompt_summarize',
    'voice_to_text_prompt_input_button', 'stop_response_generation_button', 'ai_model_selector_modal', 'max_response_token_slider',
    'error_banner_retry_button_offline', 'expand_ai_response_view', 'code_snippet_formatting_bubble', 'link_in_ai_response_tap',
    'context_cleared_system_message', 'ai_suggested_followup_prompts', 'ai_chat_keyboard_dismiss_scroll', 'rating_thumbs_up_ai_response',
    'rating_thumbs_down_ai_response'
  ]},

  // 10. GESTURES & ANDROID EDGE CASES (MOB-E2E-271 to MOB-E2E-300) - 30 cases
  { cat: mobileCategories.GESTURES_EDGE, prefix: 'gestures_edge', count: 30, topics: [
    'android_back_hardware_button_tap', 'android_back_button_close_modal', 'android_back_button_double_tap_exit', 'soft_keyboard_hide_gesture',
    'swipe_down_to_dismiss_bottom_sheet', 'long_press_item_multiselect_mode', 'drag_and_drop_item_reorder', 'pinch_to_zoom_text_size',
    'device_rotation_portrait_landscape', 'screen_wake_lock_active_session', 'app_switch_background_foreground', 'low_battery_saver_mode_ui',
    'airplane_mode_offline_notice_banner', 'reconnect_online_autosync_toast', 'input_text_max_length_10k_chars', 'emoji_character_rendering_title',
    'non_latin_character_set_input', 'rapid_tap_throttling_submit_button', 'double_tap_zoom_gesture', 'scroll_to_top_status_bar_tap',
    'notification_tray_banner_tap_redirect', 'system_font_size_large_scale_check', 'split_screen_multiwindow_mode_layout', 'touch_target_min_48dp_compliance',
    'haptic_feedback_vibration_action', 'deep_link_parameter_parsing', 'memory_leak_prevention_screen_transitions', 'uncaught_error_boundary_screen',
    'analytics_optout_toggle_settings', 'local_database_integrity_startup'
  ]}
];

let mobIdCounter = 21;
for (const suite of mobileSuites) {
  for (let i = 0; i < suite.topics.length; i++) {
    const topic = suite.topics[i];
    const idStr = String(mobIdCounter).padStart(3, '0');
    mobileTestCases.push({
      id: `MOB-E2E-${idStr}`,
      category: suite.cat,
      name: `test_mobile_${suite.prefix}_${topic}`,
      scenario: `Verify Mobile Appium E2E automated flow for ${topic.replace(/_/g, ' ')}`,
      preconditions: `Mobile app initialized in ${suite.cat} screen state`,
      steps: `1. Locate element by accessibility label\n2. Perform ${topic.replace(/_/g, ' ')} gesture/tap\n3. Assert screen transition`,
      expected: `Mobile gesture for ${topic.replace(/_/g, ' ')} executed successfully with UiAutomator assertion`
    });
    mobIdCounter++;
  }
}

module.exports = mobileTestCases;
