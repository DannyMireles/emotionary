import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  PixelRatio,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { findWord, useContentStore } from '@/content/store';
import { localDateString } from '@/daily/engine';
import { lightImpactHaptic, selectionHaptic, successHaptic, warningHaptic } from '@/feedback/haptics';
import { CARD_BASE_HEIGHT, CARD_BASE_WIDTH, ShareCard } from '@/share/ShareCard';
import { useUserStore } from '@/store/userStore';
import { color, font, letterSpacing, space, type } from '@/theme/tokens';

const SHARE_TARGETS = [
  { key: 'instagram', label: 'Instagram', icon: 'ig' },
  { key: 'imessage', label: 'iMessage', icon: '✉' },
  { key: 'facebook', label: 'Facebook', icon: 'f' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'wa' },
] as const;

export default function ShareModal() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const words = useContentStore((s) => s.words);
  const recordShare = useUserStore((s) => s.recordShare);
  const { width: winW, height: winH } = useWindowDimensions();

  const shotRef = useRef<View>(null);
  const [laidOut, setLaidOut] = useState(false);
  const [busy, setBusy] = useState<'idle' | 'saving' | 'sharing'>('idle');
  const [saved, setSaved] = useState(false);

  const word = slug ? findWord(words, slug) : undefined;
  if (!word) {
    router.back();
    return null;
  }

  // Fit the 9:16 preview inside the window with room for the buttons.
  const cardWidth = Math.min(winW * 0.72, (winH * 0.54 * CARD_BASE_WIDTH) / CARD_BASE_HEIGHT);

  // Native-only modules are imported lazily inside the handlers — a static
  // import of expo-media-library breaks web/server rendering (its classes
  // extend a native module that is undefined off-device).
  //
  // Capture options are logical points: divide the pixel target by the device
  // scale so every device emits exactly 1080×1920 (DESIGN.md §10).
  const capture = async () => {
    const { captureRef } = await import('react-native-view-shot');
    return captureRef(shotRef, {
      format: 'png',
      quality: 1,
      width: CARD_BASE_WIDTH / PixelRatio.get(),
      height: CARD_BASE_HEIGHT / PixelRatio.get(),
    });
  };

  const notAvailableOnWeb = () =>
    Alert.alert('Not available here', 'Saving and sharing cards works in the mobile app.');

  const onDownload = async () => {
    lightImpactHaptic();
    if (Platform.OS === 'web') return notAvailableOnWeb();
    setBusy('saving');
    try {
      const MediaLibrary = await import('expo-media-library');
      // Write-only save — no READ_MEDIA_* permissions (DESIGN.md §10).
      const perm = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
      if (!perm.granted) {
        warningHaptic();
        Alert.alert('Permission needed', 'Allow Emotionary to save photos to download word cards.');
        return;
      }
      const uri = await capture();
      await MediaLibrary.Asset.create(uri);
      setSaved(true);
      recordShare(word.slug, localDateString());
      successHaptic();
    } catch {
      warningHaptic();
      Alert.alert('Something went wrong', 'The card could not be saved. Please try again.');
    } finally {
      setBusy('idle');
    }
  };

  const onShare = async () => {
    lightImpactHaptic();
    if (Platform.OS === 'web') return notAvailableOnWeb();
    setBusy('sharing');
    try {
      const Sharing = await import('expo-sharing');
      const uri = await capture();
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share this word' });
      recordShare(word.slug, localDateString());
      successHaptic();
    } catch {
      warningHaptic();
      Alert.alert('Something went wrong', 'The card could not be shared. Please try again.');
    } finally {
      setBusy('idle');
    }
  };

  const ready = laidOut && busy === 'idle';

  return (
    <View style={styles.backdrop}>
      <SafeAreaView style={styles.safe}>
        <Pressable
          onPress={() => {
            selectionHaptic();
            router.back();
          }}
          style={styles.close}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
        >
          <Text style={styles.closeGlyph}>✕</Text>
        </Pressable>

        <View
          ref={shotRef}
          collapsable={false}
          onLayout={() => setLaidOut(true)}
          style={styles.shadow}
        >
          <ShareCard word={word} width={cardWidth} />
        </View>

        <View style={styles.buttons}>
          <Pressable
            onPress={onDownload}
            disabled={!ready}
            style={[styles.button, styles.buttonGhost, !ready && styles.disabled]}
            accessibilityRole="button"
          >
            <Text style={styles.buttonGhostText}>
              {busy === 'saving' ? 'SAVING…' : saved ? 'SAVED ✓' : 'DOWNLOAD'}
            </Text>
          </Pressable>
          <Pressable
            onPress={onShare}
            disabled={!ready}
            style={[styles.button, styles.buttonSolid, !ready && styles.disabled]}
            accessibilityRole="button"
          >
            <Text style={styles.buttonSolidText}>{busy === 'sharing' ? 'SHARING…' : 'SHARE'}</Text>
          </Pressable>
        </View>
        <View style={styles.targetRow}>
          {SHARE_TARGETS.map((target) => (
            <Pressable
              key={target.key}
              onPress={onShare}
              disabled={!ready}
              style={[styles.targetButton, !ready && styles.disabled]}
              accessibilityRole="button"
              accessibilityLabel={`Share to ${target.label}`}
            >
              <View style={styles.targetIcon}>
                <Text style={styles.targetIconText}>{target.icon}</Text>
              </View>
              <Text style={styles.targetLabel}>{target.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.caption}>Sized for Instagram / Facebook Stories</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: color.overlay },
  safe: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  close: {
    position: 'absolute',
    top: 64,
    right: space.l,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  closeGlyph: { fontSize: 15, color: color.ink },
  shadow: {
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 8,
  },
  buttons: { flexDirection: 'row', gap: space.m, marginTop: space.l },
  button: {
    borderRadius: 999,
    paddingHorizontal: 26,
    paddingVertical: 12,
    minWidth: 132,
    alignItems: 'center',
  },
  buttonGhost: { backgroundColor: 'rgba(255,255,255,0.22)' },
  buttonGhostText: {
    fontFamily: font.serifMedium,
    fontSize: type.small - 1,
    letterSpacing: letterSpacing.caps,
    color: '#FFFFFF',
  },
  buttonSolid: { backgroundColor: '#FFFFFF' },
  buttonSolidText: {
    fontFamily: font.serifMedium,
    fontSize: type.small - 1,
    letterSpacing: letterSpacing.caps,
    color: color.ink,
  },
  disabled: { opacity: 0.5 },
  targetRow: {
    flexDirection: 'row',
    gap: space.m,
    marginTop: space.m,
    maxWidth: 330,
  },
  targetButton: {
    alignItems: 'center',
    gap: 5,
    width: 66,
  },
  targetIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetIconText: {
    fontFamily: font.serifSemiBold,
    fontSize: type.small,
    color: color.ink,
    textTransform: 'uppercase',
  },
  targetLabel: {
    fontFamily: font.serif,
    fontSize: 10,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
  },
  caption: {
    fontFamily: font.serif,
    fontSize: type.caption,
    color: 'rgba(255,255,255,0.75)',
    marginTop: space.m,
  },
});
