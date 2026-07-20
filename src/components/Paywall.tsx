import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SystemIcon } from '@/components/system-icon';
import { lightImpactHaptic, selectionHaptic, successHaptic } from '@/feedback/haptics';
import { useUserStore } from '@/store/userStore';
import { color, font, letterSpacing, space, type } from '@/theme/tokens';

type Plan = 'yearly' | 'lifetime';

export function Paywall({
  onContinue,
  onContinueFree,
}: {
  onContinue: () => void;
  onContinueFree: () => void;
}) {
  const [plan, setPlan] = useState<Plan>('lifetime');
  const unlockFullAccess = useUserStore((state) => state.unlockFullAccess);

  const choosePlan = (next: Plan) => {
    selectionHaptic();
    setPlan(next);
  };

  const unlock = () => {
    lightImpactHaptic();
    // TestFlight beta entitlement: no App Store charge is initiated.
    unlockFullAccess();
    successHaptic();
    onContinue();
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>UNLOCK EVERYTHING</Text>
      <Text style={styles.title} accessibilityRole="header">Get full access</Text>
      <Text style={styles.subtitle}>All 127 words, every theme, and every future update.</Text>

      <View style={styles.options}>
        <PlanOption
          selected={plan === 'yearly'}
          onPress={() => choosePlan('yearly')}
          title="Yearly"
          price="$4.99"
          cadence="per year"
        />
        <PlanOption
          selected={plan === 'lifetime'}
          onPress={() => choosePlan('lifetime')}
          title="Lifetime"
          price="$9.99"
          cadence="one time"
          badge="BEST VALUE"
        />
      </View>

      <Pressable
        onPress={unlock}
        style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Continue with ${plan} full access`}
      >
        <Text style={styles.continueText}>Continue</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          selectionHaptic();
          onContinueFree();
        }}
        style={styles.freeButton}
        accessibilityRole="button"
      >
        <Text style={styles.freeText}>Continue with free</Text>
      </Pressable>
    </View>
  );
}

function PlanOption({
  selected,
  onPress,
  title,
  price,
  cadence,
  badge,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  price: string;
  cadence: string;
  badge?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.option, selected && styles.optionSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <View style={styles.optionCopy}>
        <View style={styles.optionTitleRow}>
          <Text style={styles.optionTitle}>{title}</Text>
          {badge && <Text style={styles.badge}>{badge}</Text>}
        </View>
        <Text style={styles.price}>{price}</Text>
        <Text style={styles.cadence}>{cadence}</Text>
      </View>
      {selected && (
        <SystemIcon name="checkmark" fallback="✓" size={18} color={color.ink} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 390, alignItems: 'center', paddingHorizontal: space.m },
  kicker: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.badge,
    color: color.inkMuted,
  },
  title: { fontFamily: font.display, fontSize: 36, color: color.ink, marginTop: space.s },
  subtitle: {
    fontFamily: font.serif,
    fontSize: type.small,
    lineHeight: 21,
    color: color.inkMuted,
    textAlign: 'center',
    maxWidth: 285,
    marginTop: space.s,
  },
  options: { width: '100%', gap: 10, marginTop: space.xl },
  option: {
    minHeight: 92,
    borderWidth: 1,
    borderColor: color.hairline,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.68)',
    paddingHorizontal: space.m,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
  },
  optionSelected: { borderColor: color.ink, borderWidth: 1.5, backgroundColor: '#FFFFFF' },
  radio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: color.inkFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: color.ink },
  radioInner: { width: 11, height: 11, borderRadius: 6, backgroundColor: color.ink },
  optionCopy: { flex: 1 },
  optionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  optionTitle: { fontFamily: font.serifSemiBold, fontSize: type.body, color: color.ink },
  badge: {
    fontFamily: font.serifMedium,
    fontSize: 8,
    letterSpacing: 0.7,
    color: '#7D3439',
    backgroundColor: '#F8DDE0',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  price: { fontFamily: font.display, fontSize: 25, color: color.ink, marginTop: 4 },
  cadence: { fontFamily: font.serif, fontSize: type.caption, color: color.inkMuted },
  continueButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.xl,
  },
  continueText: { fontFamily: font.serifSemiBold, fontSize: type.body, color: color.paper },
  freeButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.l },
  freeText: {
    fontFamily: font.serifMedium,
    fontSize: type.small,
    color: color.ink,
    textDecorationLine: 'underline',
  },
  pressed: { opacity: 0.78 },
});
