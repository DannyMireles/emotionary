import { useMemo, useState } from 'react';
import { FlatList, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WordCard } from '@/components/WordCard';
import { WordTypeIcon } from '@/components/word-type-icon';
import { useContentStore } from '@/content/store';
import type { Level, WordType } from '@/content/types';
import { localDateString, wordOfDay } from '@/daily/engine';
import { canViewWord } from '@/entitlements';
import { selectionHaptic } from '@/feedback/haptics';
import { useUserStore } from '@/store/userStore';
import { color, font, letterSpacing, levelPalettes, space, type, typeMeta } from '@/theme/tokens';

const TYPE_FILTERS: { key: WordType | 'all'; label: string }[] = [
  { key: 'all', label: 'ALL TYPES' },
  { key: 'wanderword', label: typeMeta.wanderword.label },
  { key: 'hidden_english', label: typeMeta.hidden_english.label },
  { key: 'psychology', label: typeMeta.psychology.label },
];

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
  const [keyOpen, setKeyOpen] = useState(false);
  const hasFullAccess = useUserStore((state) => state.accessLevel === 'full');
  const todaysSlug = wordOfDay(words, localDateString())?.slug ?? null;

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return words
      .filter((w) => (typeFilter === 'all' ? true : w.type === typeFilter))
      .filter((w) =>
        q.length === 0 ? true : normalize(w.word).includes(q) || normalize(w.definition).includes(q),
      )
      .sort((a, b) => a.word.localeCompare(b.word));
  }, [words, query, typeFilter]);

  const hasActiveFilters = query.length > 0 || typeFilter !== 'all';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.title} accessibilityRole="header">
          Browse
        </Text>
        <Pressable
          onPress={() => {
            selectionHaptic();
            setKeyOpen(true);
          }}
          style={styles.keyButton}
          accessibilityRole="button"
          accessibilityLabel="How categorization works"
          hitSlop={8}
        >
          <Text style={styles.keyButtonText}>?</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search words and meanings"
        placeholderTextColor={color.inkFaint}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        accessibilityLabel="Search words"
        clearButtonMode="while-editing"
        returnKeyType="search"
        onSubmitEditing={Keyboard.dismiss}
      />

      <View style={styles.chipsWrap}>
        {TYPE_FILTERS.map((f) => {
          const active = typeFilter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => {
                Keyboard.dismiss();
                selectionHaptic();
                setTypeFilter(f.key);
              }}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Filter: ${f.label}`}
            >
              {f.key !== 'all' && (
                <WordTypeIcon
                  wordType={f.key}
                  size={14}
                  color={active ? color.paper : color.inkMuted}
                />
              )}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(w) => w.slug}
        renderItem={({ item }) => (
          <WordCard
            word={item}
            locked={!canViewWord(item, todaysSlug, hasFullAccess)}
          />
        )}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScrollBeginDrag={Keyboard.dismiss}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No words match.</Text>
            {hasActiveFilters && (
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  selectionHaptic();
                  setQuery('');
                  setTypeFilter('all');
                }}
                accessibilityRole="button"
              >
                <Text style={styles.clearText}>Clear filters</Text>
              </Pressable>
            )}
          </View>
        }
      />

      <BrowseKeyModal visible={keyOpen} onClose={() => setKeyOpen(false)} />
    </SafeAreaView>
  );
}

function BrowseKeyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Key</Text>
            <Pressable
              onPress={() => {
                selectionHaptic();
                onClose();
              }}
              style={styles.modalClose}
              accessibilityRole="button"
              accessibilityLabel="Close key"
            >
              <Text style={styles.modalCloseText}>×</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalSection}>LEVELS</Text>
            <KeyLevel level={1} name="FLEETING" body="Light, fleeting, surface sensations" />
            <KeyLevel
              level={2}
              name="UNDERCURRENTS"
              body="Present but subtle, humming beneath the surface"
            />
            <KeyLevel
              level={3}
              name="IN-BETWEEN"
              body="Complex, mixed, pulling in two directions at once"
            />
            <KeyLevel
              level={4}
              name="THE WEIGHT"
              body="Heavy, slow, demanding your full attention"
            />
            <KeyLevel
              level={5}
              name="THE DEPTHS"
              body="The most intense, transformative human experiences"
            />

            <Text style={styles.modalSection}>ICON KEY</Text>
            <IconKey
              wordType="wanderword"
              title="WANDERWORD"
              body="A word from another language or culture that has no direct English equivalent. You'll see a world icon next to a word that has cultural origins."
            />
            <IconKey
              wordType="hidden_english"
              title="HIDDEN ENGLISH"
              body="A real English word that exists in the dictionary but rarely makes it into everyday conversation. These have been here all along, but most people were just never introduced to them."
            />
            <IconKey
              wordType="psychology"
              title="PSYCHOLOGY"
              body="A term with roots in psychology simplified here for everyday use. These words belong to everyone, not just those who've sat across from a therapist."
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function KeyLevel({ level, name, body }: { level: Level; name: string; body: string }) {
  return (
    <View style={styles.keyLine}>
      <View style={[styles.keyDot, { backgroundColor: levelPalettes[level].deep }]}>
        <Text style={styles.keyDotText}>{level}</Text>
      </View>
      <View style={styles.keyCopy}>
        <Text style={styles.keyTitle}>LEVEL {level} = {name}</Text>
        <Text style={styles.keyBody}>{body}</Text>
      </View>
    </View>
  );
}

function IconKey({
  wordType,
  title,
  body,
}: {
  wordType: WordType;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.keyLine}>
      <View style={styles.iconKeyWrap}>
        <WordTypeIcon wordType={wordType} size={17} color={color.inkMuted} />
      </View>
      <View style={styles.keyCopy}>
        <Text style={styles.keyTitle}>{title}</Text>
        <Text style={styles.keyBody}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  headerRow: {
    marginTop: space.s,
    paddingHorizontal: space.l,
    minHeight: 42,
    justifyContent: 'center',
  },
  title: {
    fontFamily: font.display,
    fontSize: type.title,
    color: color.ink,
    textAlign: 'center',
  },
  keyButton: {
    position: 'absolute',
    right: space.l,
    top: 1,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyButtonText: {
    fontFamily: font.serifSemiBold,
    fontSize: type.body,
    color: color.ink,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderColor: color.hairline,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: color.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.l,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '82%',
    borderRadius: 18,
    backgroundColor: color.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    overflow: 'hidden',
  },
  modalHeader: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.hairline,
  },
  modalTitle: { fontFamily: font.display, fontSize: type.title - 2, color: color.ink },
  modalClose: {
    position: 'absolute',
    right: space.m,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: { fontSize: 20, color: color.inkMuted },
  modalScroll: { padding: space.l, gap: space.m, paddingBottom: space.xl },
  modalSection: {
    fontFamily: font.serifMedium,
    fontSize: type.badge,
    letterSpacing: letterSpacing.caps,
    color: color.inkFaint,
    marginTop: space.xs,
  },
  keyLine: { flexDirection: 'row', gap: space.m, alignItems: 'flex-start' },
  keyDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  keyDotText: { fontFamily: font.serifSemiBold, fontSize: type.caption, color: color.paper },
  iconKeyWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyCopy: { flex: 1 },
  keyTitle: {
    fontFamily: font.serifSemiBold,
    fontSize: type.small,
    color: color.ink,
  },
  keyBody: {
    fontFamily: font.serif,
    fontSize: type.caption,
    lineHeight: type.caption * 1.45,
    color: color.inkMuted,
    marginTop: 2,
  },
});
