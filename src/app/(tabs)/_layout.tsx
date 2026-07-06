import { Redirect, Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

import { selectionHaptic } from '@/feedback/haptics';
import { useUserStore } from '@/store/userStore';
import { color, font } from '@/theme/tokens';

function TabGlyph({ glyph, color: tint }: { glyph: string; color: ColorValue }) {
  return <Text style={{ fontSize: 17, color: tint, lineHeight: 20 }}>{glyph}</Text>;
}

export default function TabsLayout() {
  const onboarded = useUserStore((s) => s.onboarded);
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenListeners={{
        tabPress: () => selectionHaptic(),
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.ink,
        tabBarInactiveTintColor: color.inkFaint,
        tabBarStyle: {
          backgroundColor: color.paper,
          borderTopColor: color.hairline,
        },
        tabBarLabelStyle: {
          fontFamily: font.serifMedium,
          fontSize: 11,
          letterSpacing: 0.4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color: tint }) => <TabGlyph glyph="✦" color={tint} />,
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: 'Browse',
          tabBarIcon: ({ color: tint }) => <TabGlyph glyph="≡" color={tint} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color: tint }) => <TabGlyph glyph="◈" color={tint} />,
        }}
      />
    </Tabs>
  );
}
