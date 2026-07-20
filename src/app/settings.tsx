import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SystemIcon } from '@/components/system-icon';
import { selectionHaptic, successHaptic, warningHaptic } from '@/feedback/haptics';
import { requestPermission } from '@/notifications/scheduler';
import { useUserStore } from '@/store/userStore';
import { color, font, space, type } from '@/theme/tokens';

export default function SettingsScreen() {
  const notifEnabled = useUserStore((state) => state.notifEnabled);
  const setNotifEnabled = useUserStore((state) => state.setNotifEnabled);
  const hapticsEnabled = useUserStore((state) => state.hapticsEnabled);
  const setHapticsEnabled = useUserStore((state) => state.setHapticsEnabled);
  const hasFullAccess = useUserStore((state) => state.accessLevel === 'full');
  const unlockFullAccess = useUserStore((state) => state.unlockFullAccess);

  const toggleNotifications = async (next: boolean) => {
    selectionHaptic();
    if (!next) return setNotifEnabled(false);
    const granted = await requestPermission();
    setNotifEnabled(granted);
    if (!granted && process.env.EXPO_OS !== 'web') {
      warningHaptic();
      Alert.alert('Notifications are off', 'Enable Emotionary notifications in system settings.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open settings', onPress: () => void Linking.openSettings() },
      ]);
    }
  };

  const restore = () => {
    selectionHaptic();
    unlockFullAccess();
    successHaptic();
    Alert.alert('Full access restored', 'This beta now has Emotionary Pro access.');
  };

  return (
    <SafeAreaView style={styles.backdrop} edges={['top']}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <SystemIcon name="arrow.left" fallback="←" size={20} color={color.ink} />
          </Pressable>
          <Text style={styles.title}>Settings</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.accountBlock}>
            <Text style={styles.accountTitle}>{hasFullAccess ? 'Emotionary Pro' : 'Guest'}</Text>
            <Text style={styles.accountSubtitle}>
              {hasFullAccess ? 'Full access is active' : 'Using Emotionary free'}
            </Text>
          </View>

          <Text style={styles.section}>ACCOUNT</Text>
          <View style={styles.group}>
            <SettingsRow
              label="Emotionary Pro"
              value={hasFullAccess ? 'Active' : 'Upgrade'}
              onPress={hasFullAccess ? undefined : () => router.push('/paywall' as Href)}
              chevron={!hasFullAccess}
            />
            <SettingsRow label="Restore Purchases" onPress={restore} chevron />
          </View>

          <Text style={styles.section}>PREFERENCES</Text>
          <View style={styles.group}>
            <SettingsRow
              label="Daily Reminder"
              control={
                <Switch
                  value={notifEnabled}
                  onValueChange={(value) => void toggleNotifications(value)}
                  trackColor={{ false: color.hairline, true: color.ink }}
                  thumbColor={color.card}
                />
              }
            />
            <SettingsRow
              label="Haptics"
              control={
                <Switch
                  value={hapticsEnabled}
                  onValueChange={setHapticsEnabled}
                  trackColor={{ false: color.hairline, true: color.ink }}
                  thumbColor={color.card}
                />
              }
            />
            <SettingsRow
              label="Notifications"
              value={notifEnabled ? 'On' : 'Off'}
              onPress={() => void Linking.openSettings()}
              chevron
            />
          </View>

          <Text style={styles.section}>MORE</Text>
          <View style={styles.group}>
            <SettingsRow
              label="Rate Emotionary"
              onPress={() => Alert.alert('Thank you', 'Rating will be available when Emotionary is public on the App Store.')}
              chevron
            />
            <SettingsRow
              label="Send Feedback"
              onPress={() => void Linking.openURL('mailto:hello@emotionarybook.com?subject=Emotionary%20feedback')}
              chevron
            />
            <SettingsRow
              label="Privacy Policy"
              onPress={() => void Linking.openURL('https://emotionarybook.com/privacy')}
              chevron
            />
          </View>

          <Text style={styles.version}>Version {Constants.expoConfig?.version ?? '1.3.0'}</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function SettingsRow({
  label,
  value,
  onPress,
  chevron = false,
  control,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  control?: React.ReactNode;
}) {
  const content = (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowEnd}>
        {value && <Text style={styles.rowValue}>{value}</Text>}
        {control}
        {chevron && <Text style={styles.chevron}>›</Text>}
      </View>
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button">{content}</Pressable>
  ) : content;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#DFDCD5', padding: 10 },
  sheet: { flex: 1, backgroundColor: color.card, borderRadius: 26, borderCurve: 'continuous', overflow: 'hidden' },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.m },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.display, fontSize: 26, color: color.ink },
  scroll: { paddingHorizontal: space.l, paddingBottom: space.xl },
  accountBlock: { alignItems: 'center', paddingVertical: space.m },
  accountTitle: { fontFamily: font.serifSemiBold, fontSize: type.body, color: color.ink },
  accountSubtitle: { fontFamily: font.serif, fontSize: type.caption, color: color.inkMuted, marginTop: 3 },
  section: { fontFamily: font.serifMedium, fontSize: 10, letterSpacing: 1.8, color: color.inkFaint, marginTop: space.l, marginBottom: space.s, paddingLeft: space.s },
  group: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: color.hairline, backgroundColor: '#FFFEFB', overflow: 'hidden' },
  row: { minHeight: 55, paddingHorizontal: space.m, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.hairline },
  rowLabel: { fontFamily: font.serif, fontSize: type.small, color: color.ink },
  rowEnd: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  rowValue: { fontFamily: font.serif, fontSize: type.small, color: color.inkMuted },
  chevron: { fontFamily: font.serif, fontSize: 25, color: color.inkFaint, lineHeight: 28 },
  version: { fontFamily: font.serif, fontSize: type.caption, color: color.inkFaint, textAlign: 'center', marginTop: space.xl },
});
