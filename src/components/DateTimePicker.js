import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors } from '../theme/colors';

// ─── Date Picker Modal ───────────────────────────────────────────────────────

export const DatePickerModal = ({ visible, value, onConfirm, onClose }) => {
  const parts = value ? value.split('-') : ['', '', ''];
  const [year,  setYear]  = useState(parts[0] || '');
  const [month, setMonth] = useState(parts[1] || '');
  const [day,   setDay]   = useState(parts[2] || '');

  const handleConfirm = () => {
    const y = year.padStart(4, '0');
    const m = month.padStart(2, '0');
    const d = day.padStart(2, '0');
    onConfirm(`${y}-${m}-${d}`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.modal} activeOpacity={1}>
          <View style={styles.header}>
            <Text style={styles.headerEmoji}>📅</Text>
            <Text style={styles.headerTitle}>Select Birth Date</Text>
          </View>

          <View style={styles.row}>
            {/* Day */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Day</Text>
              <TextInput
                style={styles.numInput}
                value={day}
                onChangeText={(t) => setDay(t.replace(/\D/g, '').slice(0, 2))}
                keyboardType="number-pad"
                placeholder="DD"
                placeholderTextColor={colors.textMuted}
                maxLength={2}
              />
            </View>

            <Text style={styles.sep}>/</Text>

            {/* Month */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Month</Text>
              <TextInput
                style={styles.numInput}
                value={month}
                onChangeText={(t) => setMonth(t.replace(/\D/g, '').slice(0, 2))}
                keyboardType="number-pad"
                placeholder="MM"
                placeholderTextColor={colors.textMuted}
                maxLength={2}
              />
            </View>

            <Text style={styles.sep}>/</Text>

            {/* Year */}
            <View style={[styles.fieldGroup, { flex: 1.8 }]}>
              <Text style={styles.fieldLabel}>Year</Text>
              <TextInput
                style={styles.numInput}
                value={year}
                onChangeText={(t) => setYear(t.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                placeholder="YYYY"
                placeholderTextColor={colors.textMuted}
                maxLength={4}
              />
            </View>
          </View>

          {/* Quick year presets */}
          <Text style={styles.presetLabel}>Quick select decade</Text>
          <View style={styles.presets}>
            {['1990', '1995', '2000', '2005', '2010'].map((y) => (
              <TouchableOpacity key={y} style={[styles.preset, year === y && styles.presetActive]} onPress={() => setYear(y)}>
                <Text style={[styles.presetText, year === y && styles.presetTextActive]}>{y}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmText}>Confirm ✓</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// ─── Time Picker Modal ───────────────────────────────────────────────────────

export const TimePickerModal = ({ visible, value, onConfirm, onClose }) => {
  const parts = value ? value.split(':') : ['', ''];
  const [hour, setHour]   = useState(parts[0] || '');
  const [minute, setMinute] = useState(parts[1] || '');

  const handleConfirm = () => {
    const h = hour.padStart(2, '0');
    const m = minute.padStart(2, '0');
    onConfirm(`${h}:${m}`);
    onClose();
  };

  const QUICK_HOURS = ['00', '06', '09', '12', '15', '18', '21'];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.modal} activeOpacity={1}>
          <View style={styles.header}>
            <Text style={styles.headerEmoji}>🕐</Text>
            <Text style={styles.headerTitle}>Select Birth Time</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Hour (HH)</Text>
              <TextInput
                style={[styles.numInput, { fontSize: 28 }]}
                value={hour}
                onChangeText={(t) => setHour(t.replace(/\D/g, '').slice(0, 2))}
                keyboardType="number-pad"
                placeholder="HH"
                placeholderTextColor={colors.textMuted}
                maxLength={2}
              />
            </View>

            <Text style={[styles.sep, { fontSize: 36, marginTop: 18 }]}>:</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Minute (MM)</Text>
              <TextInput
                style={[styles.numInput, { fontSize: 28 }]}
                value={minute}
                onChangeText={(t) => setMinute(t.replace(/\D/g, '').slice(0, 2))}
                keyboardType="number-pad"
                placeholder="MM"
                placeholderTextColor={colors.textMuted}
                maxLength={2}
              />
            </View>
          </View>

          {/* Quick hour presets */}
          <Text style={styles.presetLabel}>Common times</Text>
          <View style={styles.presets}>
            {QUICK_HOURS.map((h) => (
              <TouchableOpacity key={h} style={[styles.preset, hour === h && styles.presetActive]} onPress={() => setHour(h)}>
                <Text style={[styles.presetText, hour === h && styles.presetTextActive]}>{h}:00</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmText}>Confirm ✓</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  headerEmoji: { fontSize: 24 },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 20,
  },
  fieldGroup: { flex: 1, alignItems: 'center' },
  fieldLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
  numInput: {
    width: '100%',
    backgroundColor: '#F8F8F8',
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    borderRadius: 12,
    color: colors.goldDark,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 14,
  },
  sep: { color: colors.textMuted, fontSize: 24, fontWeight: '700', marginBottom: 14 },
  presetLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 10 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  preset: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  presetActive:     { backgroundColor: colors.goldBg, borderColor: colors.borderGold },
  presetText:       { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  presetTextActive: { color: colors.goldDark, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#EBEBEB',
    alignItems: 'center',
  },
  cancelText:  { color: colors.textMuted, fontSize: 15, fontWeight: '700' },
  confirmBtn: {
    flex: 1.6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.gold,
    alignItems: 'center',
  },
  confirmText: { color: '#1A1A1A', fontSize: 15, fontWeight: '800' },
});

// ─── Default Export: Unified DateTimePicker ───────────────────────────────────
// Usage: <DateTimePicker mode="date"|"time" value={val} onChange={fn} label="..." />
// - mode="date": value is a Date object (or null); onChange receives a Date object
// - mode="time": value is a "HH:MM" string; onChange receives "HH:MM" string

const DateTimePicker = ({ mode = 'date', value, onChange, label }) => {
  const [open, setOpen] = React.useState(false);

  const displayText = (() => {
    if (mode === 'date') {
      if (!value) return label || 'Select date';
      const d = new Date(value);
      return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    }
    return value || label || 'Select time';
  })();

  const handleDateConfirm = (dateStr) => {
    // dateStr is "YYYY-MM-DD", convert to Date object
    if (onChange) onChange(new Date(dateStr));
    setOpen(false);
  };

  const handleTimeConfirm = (timeStr) => {
    if (onChange) onChange(timeStr);
    setOpen(false);
  };

  const dateValue = value instanceof Date
    ? `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`
    : (typeof value === 'string' && value.includes('-') ? value : '');

  return (
    <>
      <TouchableOpacity
        style={pickerStyles.trigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={[pickerStyles.triggerText, !value && { color: '#AAAAAA' }]}>
          {displayText}
        </Text>
        <Text style={pickerStyles.triggerIcon}>{mode === 'date' ? '📅' : '🕐'}</Text>
      </TouchableOpacity>

      {mode === 'date' ? (
        <DatePickerModal
          visible={open}
          value={dateValue}
          onConfirm={handleDateConfirm}
          onClose={() => setOpen(false)}
        />
      ) : (
        <TimePickerModal
          visible={open}
          value={typeof value === 'string' ? value : ''}
          onConfirm={handleTimeConfirm}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};

const pickerStyles = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#FAFAFA',
  },
  triggerText: { fontSize: 14, color: '#1A1A1A', fontWeight: '500' },
  triggerIcon: { fontSize: 18 },
});

export default DateTimePicker;

