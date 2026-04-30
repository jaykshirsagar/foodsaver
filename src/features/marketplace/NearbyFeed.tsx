import { Alert, Image, Platform, StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { RankedListing } from '../../types/marketplace';

type NearbyFeedProps = {
  listings: RankedListing[];
  canDelete?: boolean;
  onDelete?: (listingId: string) => Promise<void>;
  onSelectListing?: (listing: RankedListing) => void;
};

const CATEGORY_LABELS: Record<string, string> = {
  Bakery: 'Brutarie',
  Produce: 'Produse proaspete',
  Dairy: 'Lactate',
  Prepared: 'Preparat',
};

export function NearbyFeed({ listings, canDelete = false, onDelete, onSelectListing }: NearbyFeedProps) {
  const { width } = useWindowDimensions();
  const compact = width < 420;
  const columnCount = width >= 1460 ? 3 : width >= 1024 ? 2 : 1;

  function confirmDelete(listingId: string) {
    if (!onDelete) {
      return;
    }
    const deleteHandler = onDelete;

    async function executeDelete() {
      try {
        await deleteHandler(listingId);
        Alert.alert('Succes', 'Anuntul a fost sters.');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Nu am putut sterge anuntul.';
        Alert.alert('Eroare', message);
      }
    }

    if (Platform.OS === 'web') {
      const accepted = typeof globalThis.confirm === 'function'
        ? globalThis.confirm('Esti sigur ca vrei sa stergi acest anunt?')
        : true;
      if (accepted) {
        void executeDelete();
      }
      return;
    }

    Alert.alert('Confirmare', 'Esti sigur ca vrei sa stergi acest anunt?', [
      { text: 'Anuleaza', style: 'cancel' },
      {
        text: 'Sterge',
        style: 'destructive',
        onPress: () => {
          void executeDelete();
        },
      },
    ]);
  }

  return (
    <View style={[styles.sectionCard, compact && styles.sectionCardCompact]}>
      <Text style={styles.sectionTitle}>Feed din apropiere</Text>
      <View style={styles.feedGrid}>
        {listings.map((entry) => (
          <View
            key={entry.id}
            style={[
              styles.feedCard,
              compact && styles.feedCardCompact,
              columnCount === 2 && styles.feedCardTwoCols,
              columnCount === 3 && styles.feedCardThreeCols,
            ]}
          >
            <Pressable onPress={() => onSelectListing?.(entry)}>
              {entry.imageUrls.length > 0 ? (
                <Image
                  source={{ uri: entry.imageUrls[0] }}
                  style={[
                    styles.cardImage,
                    compact && styles.cardImageCompact,
                    columnCount >= 2 && styles.cardImageDesktop,
                  ]}
                />
              ) : null}
              <View style={styles.feedTopRow}>
                <Text style={styles.feedTitle}>{entry.title}</Text>
                <Text style={styles.scoreBadge}>Scor {entry.score.toFixed(0)}</Text>
              </View>
              <Text style={styles.feedMeta}>Listat de {entry.owner}</Text>
              <Text style={styles.feedMeta}>{CATEGORY_LABELS[entry.category] ?? entry.category} | {entry.quantity}</Text>
              <Text style={styles.feedMeta}>
                {entry.distance.toFixed(1)} km distanta | expira in {entry.expiresInHours}h
              </Text>
              <Text style={styles.feedDescription} numberOfLines={2}>
                {entry.description || 'Fara descriere disponibila.'}
              </Text>
              <Text style={styles.feedPrice}>
                {entry.mode === 'Donate' ? 'Donatie' : `Vanzare: ${entry.priceRon.toFixed(2)} RON`}
              </Text>
              <Text style={styles.feedTapHint}>Apasa pentru detalii</Text>
            </Pressable>
            {canDelete && onDelete ? (
              <Pressable style={styles.deleteButton} onPress={() => confirmDelete(entry.id)}>
                <Text style={styles.deleteText}>Sterge anunt</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: '#121922',
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1f2d3f',
    gap: 10,
  },
  sectionCardCompact: {
    borderRadius: 20,
    padding: 10,
  },
  sectionTitle: {
    color: '#f4f7fb',
    fontSize: 18,
    fontWeight: '700',
  },
  feedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  feedCard: {
    backgroundColor: '#0f141c',
    borderColor: '#2a3b52',
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    gap: 4,
    width: '100%',
  },
  feedCardTwoCols: {
    width: '49.2%',
  },
  feedCardThreeCols: {
    width: '32.6%',
  },
  feedCardCompact: {
    borderRadius: 16,
    padding: 10,
  },
  cardImage: {
    width: '100%',
    height: 170,
    borderRadius: 18,
    marginBottom: 6,
  },
  cardImageCompact: {
    height: 130,
    borderRadius: 14,
    marginBottom: 4,
  },
  cardImageDesktop: {
    height: 140,
  },
  feedTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedTitle: {
    color: '#eff5fb',
    fontWeight: '700',
    fontSize: 16,
    flexShrink: 1,
    marginRight: 8,
  },
  scoreBadge: {
    color: '#13253a',
    backgroundColor: '#88bff6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    overflow: 'hidden',
    fontWeight: '700',
    fontSize: 12,
  },
  feedMeta: {
    color: '#a6bacf',
  },
  feedPrice: {
    marginTop: 3,
    color: '#f4ce58',
    fontWeight: '700',
  },
  feedDescription: {
    marginTop: 4,
    color: '#9fb5cb',
    lineHeight: 19,
  },
  feedTapHint: {
    marginTop: 6,
    color: '#7fb4e8',
    fontWeight: '600',
    fontSize: 12,
  },
  deleteButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#7f1d1d',
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#450a0a',
  },
  deleteText: {
    color: '#fecaca',
    fontWeight: '700',
  },
});
