import { StyleSheet, Text, View } from 'react-native';

import { color, font, space, type } from '@/theme/tokens';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function StreakCalendar({ streak }: { streak: number }) {
  const today = new Date().getDay();

  return (
    <View style={styles.wrap} accessibilityLabel={`${streak} day streak`}>
      <View style={styles.days}>
        {DAY_LABELS.map((label, day) => {
          const daysAgo = (today - day + 7) % 7;
          const current = day === today;
          const completed = !current && daysAgo > 0 && daysAgo < streak;
          return (
            <View
              key={`${label}-${day}`}
              style={[styles.day, completed && styles.completed, current && styles.current]}
            >
              <Text style={[styles.dayText, current && styles.currentText]}>{label}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.streak}>🔥 {streak}-day streak</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: space.m,
    marginTop: 2,
    marginBottom: space.s,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: space.m,
    paddingVertical: 10,
  },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  day: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completed: { backgroundColor: '#F2E9DE' },
  current: { backgroundColor: color.ink, borderColor: color.ink },
  dayText: { fontFamily: font.serifMedium, fontSize: type.caption, color: color.ink },
  currentText: { color: color.paper },
  streak: {
    fontFamily: font.serifSemiBold,
    fontSize: type.caption,
    color: color.ink,
    marginTop: space.s,
  },
});
