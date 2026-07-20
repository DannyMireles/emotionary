import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { selectionHaptic } from '@/feedback/haptics';
import type { NotifTime } from '@/store/userStore';
import { color, font, space, type } from '@/theme/tokens';

export function formatTime({ hour, minute }: NotifTime): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h12}:${String(minute).padStart(2, '0')} ${ampm}`;
}

function toDate({ hour, minute }: NotifTime): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

/**
 * Time-of-day picker: native spinner on iOS, dialog on Android,
 * simple steppers on web (verification surface only).
 */
export function TimeControl({
  value,
  onChange,
}: {
  value: NotifTime;
  onChange: (t: NotifTime) => void;
}) {
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  if (Platform.OS === 'web') {
    const step = (deltaMinutes: number) => {
      selectionHaptic();
      const total = (value.hour * 60 + value.minute + deltaMinutes + 1440) % 1440;
      onChange({ hour: Math.floor(total / 60), minute: total % 60 });
    };
    return (
      <View style={styles.webRow}>
        <Pressable onPress={() => step(-30)} style={styles.stepper} accessibilityRole="button">
          <Text style={styles.stepperText}>−</Text>
        </Pressable>
        <Text style={styles.webTime}>{formatTime(value)}</Text>
        <Pressable onPress={() => step(30)} style={styles.stepper} accessibilityRole="button">
          <Text style={styles.stepperText}>＋</Text>
        </Pressable>
      </View>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <View>
        <Pressable
          onPress={() => {
            selectionHaptic();
            setShowAndroidPicker(true);
          }}
          style={styles.androidRow}
          accessibilityRole="button"
          accessibilityLabel={`Delivery time, ${formatTime(value)}`}
        >
          <Text style={styles.webTime}>{formatTime(value)}</Text>
          <Text style={styles.changeText}>CHANGE</Text>
        </Pressable>
        {showAndroidPicker && (
          <DateTimePicker
            value={toDate(value)}
            mode="time"
            onValueChange={(_event, date) => {
              setShowAndroidPicker(false);
              selectionHaptic();
              onChange({ hour: date.getHours(), minute: date.getMinutes() });
            }}
            onDismiss={() => setShowAndroidPicker(false)}
          />
        )}
      </View>
    );
  }

  return (
    <DateTimePicker
      value={toDate(value)}
      mode="time"
      display="spinner"
      style={styles.iosPicker}
      onValueChange={(_event, date) => {
        selectionHaptic();
        onChange({ hour: date.getHours(), minute: date.getMinutes() });
      }}
    />
  );
}

const styles = StyleSheet.create({
  webRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.l },
  stepper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderColor: color.hairline,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: { fontSize: 18, color: color.ink },
  webTime: { fontFamily: font.serifSemiBold, fontSize: type.title - 4, color: color.ink },
  androidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.m,
    paddingVertical: space.s,
  },
  changeText: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: 1.4,
    color: color.inkMuted,
    textDecorationLine: 'underline',
  },
  iosPicker: { alignSelf: 'center' },
});
