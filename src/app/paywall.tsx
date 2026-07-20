import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientInk } from '@/components/AmbientInk';
import { Paywall } from '@/components/Paywall';
import { selectionHaptic } from '@/feedback/haptics';
import { color, space } from '@/theme/tokens';

export default function PaywallScreen() {
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <SafeAreaView style={styles.screen}>
      <AmbientInk />
      <Pressable
        onPress={() => {
          selectionHaptic();
          close();
        }}
        style={styles.close}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Text style={styles.closeText}>×</Text>
      </Pressable>
      <View style={styles.content}>
        <Paywall onContinue={close} onContinueFree={close} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8EEE8' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.m },
  close: {
    position: 'absolute',
    zIndex: 2,
    right: space.m,
    top: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: color.ink, fontSize: 27 },
});
