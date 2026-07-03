import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '../src/hooks/useTheme';
import { typography } from '../src/theme';

interface DateTimeFieldProps {
  value?: string; // ISO string
  mode: 'date' | 'time';
  onChange: (value: string) => void;
  label: string;
  minimumDate?: Date;
}

export default function DateTimeField({
  value,
  mode,
  onChange,
  label,
  minimumDate,
}: DateTimeFieldProps) {
  const { colors, theme, isDark } = useTheme();
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(null);

  // Parse current value
  let dateObj = new Date();
  if (value) {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      dateObj = parsed;
    }
  }

  // Format functions
  const formatDate = (date: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatTime = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const getDisplayValue = () => {
    if (!value) {
      return mode === 'date' ? '📅 Select Date' : '🕒 Select Time';
    }
    return mode === 'date' ? `📅 ${formatDate(dateObj)}` : `🕒 ${formatTime(dateObj)}`;
  };

  const handlePress = () => {
    if (Platform.OS === 'ios') {
      setTempDate(dateObj);
    }
    setShow(true);
  };

  const handleAndroidChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShow(false);
    if (event.type === 'set' && selectedDate) {
      const baseDate = value ? new Date(value) : new Date();
      if (isNaN(baseDate.getTime())) {
        baseDate.setTime(Date.now());
      }

      if (mode === 'date') {
        baseDate.setFullYear(selectedDate.getFullYear());
        baseDate.setMonth(selectedDate.getMonth());
        baseDate.setDate(selectedDate.getDate());
      } else {
        baseDate.setHours(selectedDate.getHours());
        baseDate.setMinutes(selectedDate.getMinutes());
        baseDate.setSeconds(0);
        baseDate.setMilliseconds(0);
      }
      onChange(baseDate.toISOString());
    }
  };

  const handleIosConfirm = () => {
    setShow(false);
    if (tempDate) {
      const baseDate = value ? new Date(value) : new Date();
      if (isNaN(baseDate.getTime())) {
        baseDate.setTime(Date.now());
      }

      if (mode === 'date') {
        baseDate.setFullYear(tempDate.getFullYear());
        baseDate.setMonth(tempDate.getMonth());
        baseDate.setDate(tempDate.getDate());
      } else {
        baseDate.setHours(tempDate.getHours());
        baseDate.setMinutes(tempDate.getMinutes());
        baseDate.setSeconds(0);
        baseDate.setMilliseconds(0);
      }
      onChange(baseDate.toISOString());
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      
      <TouchableOpacity
        style={[
          styles.pickerButton,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : theme.card,
            borderColor: theme.border,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text style={[styles.pickerButtonText, { color: theme.text }]}>
          {getDisplayValue()}
        </Text>
      </TouchableOpacity>

      {/* Android Picker */}
      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={dateObj}
          mode={mode}
          display="default"
          minimumDate={minimumDate}
          onChange={handleAndroidChange}
        />
      )}

      {/* iOS Picker Modal */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={show}
          transparent
          animationType="fade"
          onRequestClose={() => setShow(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShow(false)}>
            <View style={styles.iosModalOverlay}>
              <TouchableWithoutFeedback>
                <View
                  style={[
                    styles.iosModalContent,
                    { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' },
                  ]}
                >
                  <View style={[styles.iosHeader, { borderBottomColor: theme.border }]}>
                    <TouchableOpacity onPress={() => setShow(false)}>
                      <Text style={[styles.iosHeaderButtonText, { color: colors.text.tertiary }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <Text style={[styles.iosHeaderTitle, { color: theme.text }]}>{label}</Text>
                    <TouchableOpacity onPress={handleIosConfirm}>
                      <Text style={[styles.iosHeaderButtonText, { color: theme.primary, fontWeight: 'bold' }]}>
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <DateTimePicker
                    value={tempDate || dateObj}
                    mode={mode}
                    display="spinner"
                    minimumDate={minimumDate}
                    style={{ height: 200 }}
                    onChange={(_, d) => d && setTempDate(d)}
                    textColor={theme.text}
                  />
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerButton: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  pickerButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  iosModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  iosModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    overflow: 'hidden',
  },
  iosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  iosHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  iosHeaderButtonText: {
    fontSize: 15,
  },
});
