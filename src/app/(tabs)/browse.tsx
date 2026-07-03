import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WordCard } from '@/components/WordCard';
import { useContentStore } from '@/content/store';
import type { Level, WordType } from '@/content/types';
import { color, font, letterSpacing, levelPalettes, space, type, typeMeta } from '@/theme/tokens';

const TYPE_FILTERS: { key: WordType | 'all'; label: string; glyph?: string }[] = [
  { key: 'all', label: 'ALL TYPES' },
  { key: 'wanderword', label: typeMeta.wanderword.label, glyph: typeMeta.wanderword.glyph },
  { key: 'hidden_english', label: typeMeta.hidden_english.label, glyph: typeMeta.hidden_english.glyph },
  { key: 'psychology', label: typeMeta.psychology.label, glyph: typeMeta.psychology.glyph },
];

const LEVELS: Level[] = [1, 2, 3, 4, 5];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export default function BrowseScreen() {
  const words = useContentStore((s) => s.words);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<WordType | 'all'>('all');
  const [levelFilter, setLevelFilter] = useState<Level | 0>(0);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return words
      .filter((w) => (typeFilter === 'all' ? true : w.type === typeFilter))
      .filter((w) => (levelFilter === 0 ? true : w.level === levelFilter))
      .filter((w) =>
        q.length === 0 ? true : normalize(w.word).includes(q) || normalize(w.definition).includes(q),
      )
      .sort((a, b) => a.word.localeCompare(b.word));
  }, [words, query, typeFilter, levelFilter]);

  const hasActiveFilters = query.length > 0 || typeFilter !== 'all' || levelFilter !== 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Text style={styles.title} accessibilityRole="header">
        Browse
      </Text>

      <TextInput
        style={styles.search}
        placeholder="Search words and meanings"
        placeholderTextColor={color.inkFaint}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        accessibilityLabel="Search words"
        clearButtonMode="while-editing"
      />

      <View style={styles.chipsWrap}>
        {TYPE_FILTERS.map((f) => {
          const active = typeFilter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setTypeFilter(f.key)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Filter: ${f.label}`}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f.glyph ? `${f.glyph} ` : ''}
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.levelRow}>
        <Pressable
          onPress={() => setLevelFilter(0)}
          style={styles.levelAll}
          accessibilityRole="button"
          accessibilityState={{ selected: levelFilter === 0 }}
          accessibilityLabel="All levels"
        >
          <Text style={[styles.levelAllText, levelFilter === 0 && styles.levelAllActive]}>
            ALL LEVELS
          </Text>
        </Pressable>
        {LEVELS.map((lvl) => {
          const active = levelFilter === lvl;
          return (
            <Pressable
              key={lvl}
              onPress={() => setLevelFilter(active ? 0 : lvl)}
              style={[
                styles.levelDot,
                { backgroundColor: levelPalettes[lvl].deep },
                active && styles.levelDotActive,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Level ${lvl}`}
              hitSlop={6}
            />
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(w) => w.slug}
        renderItem={({ item }) => <WordCard word={item} />}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No words match.</Text>
            {hasActiveFilters && (
              <Pressable
                onPress={() => {
                  setQuery('');
                  setTypeFilter('all');
                  setLevelFilter(0);
                }}
                accessibilityRole="button"
              >
                <Text style={styles.clearText}>Clear filters</Text>
              </Pressable>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  title: {
    fontFamily: font.display,
    fontSize: type.title,
    color: color.ink,
    textAlign: 'center',
    marginTop: space.s,
  },
  search: {
    fontFamily: font.serif,
    fontSize: type.small,
    color: color.ink,
    backgroundColor: color.card,
    borderColor: color.hairline,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: space.m,
    paddingVertical: 10,
    marginHorizontal: space.l,
    marginTop: space.m,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space.s,
    paddingHorizontal: space.l,
    marginTop: space.m,
  },
  chip: {
    borderColor: color.hairline,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: color.card,
  },
  chipActive: { backgroundColor: color.ink, borderColor: color.ink },
  chipText: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.inkMuted,
  },
  chipTextActive: { color: color.paper },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginTop: space.m,
    marginBottom: space.s,
  },
  levelAll: { minHeight: 32, justifyContent: 'center' },
  levelAllText: {
    fontFamily: font.serifMedium,
    fontSize: type.badge - 1,
    letterSpacing: letterSpacing.caps,
    color: color.inkFaint,
  },
  levelAllActive: { color: color.ink },
  levelDot: { width: 18, height: 18, borderRadius: 9 },
  levelDotActive: {
    borderWidth: 2,
    borderColor: color.ink,
    transform: [{ scale: 1.15 }],
  },
  list: { paddingHorizontal: space.l, paddingTop: space.s, paddingBottom: space.xl },
  emptyWrap: { alignItems: 'center', marginTop: space.xxl, gap: space.m },
  emptyText: { fontFamily: font.serif, fontSize: type.body, color: color.inkMuted },
  clearText: {
    fontFamily: font.serifMedium,
    fontSize: type.small,
    color: color.ink,
    textDecorationLine: 'underline',
  },
});
