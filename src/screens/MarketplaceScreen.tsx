import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { NearbyFeed } from '../features/marketplace/NearbyFeed';
import { NotificationsPanel } from '../features/marketplace/NotificationsPanel';
import { useAuth } from '../context/AuthContext';
import { buyListing, subscribePurchasedListingIds } from '../services/listingService';
import { rankListings } from '../services/matchingService';
import { Listing, RankedListing } from '../types/marketplace';

type MarketplaceScreenProps = {
  listings: Listing[];
  onDeleteListing: (listingId: string) => Promise<void>;
};

const CATEGORY_LABELS: Record<string, string> = {
  Bakery: 'Brutarie',
  Produce: 'Produse proaspete',
  Dairy: 'Lactate',
  Prepared: 'Preparat',
};

export function MarketplaceScreen({ listings, onDeleteListing }: MarketplaceScreenProps) {
  const { width, height } = useWindowDimensions();
  const compact = width < 420;
  const tablet = width >= 768;
  const marketMaxWidth = width >= 1460 ? 1120 : width >= 1024 ? 980 : 860;
  const { profile, user } = useAuth();
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [purchasedListingIds, setPurchasedListingIds] = useState<string[]>([]);
  const [isBuying, setIsBuying] = useState(false);

  const ranked = useMemo(() => {
    if (!profile) {
      return [];
    }

    return rankListings(listings, profile);
  }, [listings, profile]);

  const selectedListing = useMemo<RankedListing | null>(
    () => ranked.find((item) => item.id === selectedListingId) ?? null,
    [ranked, selectedListingId],
  );

  const visibleRanked = useMemo(
    () => ranked.filter((item) => !purchasedListingIds.includes(item.id)),
    [ranked, purchasedListingIds],
  );

  useEffect(() => {
    if (!user) {
      setPurchasedListingIds([]);
      return;
    }

    const unsubscribe = subscribePurchasedListingIds(
      user.uid,
      (ids) => {
        setPurchasedListingIds(ids);
      },
      (error) => {
        console.warn('Purchases listener error', error);
      },
    );

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!selectedListingId) {
      return;
    }

    if (!selectedListing) {
      setSelectedListingId(null);
    }
  }, [selectedListingId, selectedListing]);

  async function handleBuy() {
    if (!selectedListingId || !selectedListing || !user || isBuying) {
      return;
    }

    setIsBuying(true);
    try {
      await buyListing(user.uid, selectedListing);
      setSelectedListingId(null);
      Alert.alert('Comanda trimisa', 'Produsul a fost rezervat si eliminat din lista curenta.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Nu am putut finaliza comanda.';
      Alert.alert('Eroare', message);
    } finally {
      setIsBuying(false);
    }
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Se incarca profilul</Text>
          <Text style={styles.mutedText}>Lipseste documentul profilului din Firestore.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.page,
          compact && styles.pageCompact,
          tablet && styles.pageTablet,
        ]}
      >
        <View style={[styles.contentColumn, { maxWidth: marketMaxWidth }, compact && styles.contentColumnCompact]}>
          <View style={[styles.heroCard, compact && styles.heroCardCompact]}>
            <Text style={styles.eyebrow}>Piata</Text>
            <Text style={[styles.heading, compact && styles.headingCompact]}>Iteme existente pe piata</Text>
            <Text style={[styles.subHeading, compact && styles.subHeadingCompact]}>
              Salut, {profile.displayName}. Vezi anunturile apropiate si ofertele urgente.
            </Text>
          </View>

          <NotificationsPanel listings={visibleRanked} />
          <NearbyFeed
            listings={visibleRanked}
            canDelete={profile.role === 'admin'}
            onDelete={onDeleteListing}
            onSelectListing={(listing) => setSelectedListingId(listing.id)}
          />
        </View>
      </ScrollView>

      <Modal
        visible={!!selectedListing}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedListingId(null)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              compact && styles.modalCardCompact,
              { maxHeight: Math.min(height * 0.9, 720) },
            ]}
          >
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              {selectedListing?.imageUrls.length ? (
                <Image
                  source={{ uri: selectedListing.imageUrls[0] }}
                  style={[styles.modalImage, compact && styles.modalImageCompact]}
                />
              ) : null}

              <Text style={[styles.modalTitle, compact && styles.modalTitleCompact]}>{selectedListing?.title}</Text>
              <Text style={styles.modalSubTitle}>Publicat de {selectedListing?.owner}</Text>

              <Text style={styles.modalLabel}>Descriere</Text>
              <Text style={styles.modalValue}>{selectedListing?.description || 'Fara descriere disponibila.'}</Text>

              <Text style={styles.modalLabel}>Categorie</Text>
              <Text style={styles.modalValue}>
                {selectedListing ? (CATEGORY_LABELS[selectedListing.category] ?? selectedListing.category) : '-'}
              </Text>

              <Text style={styles.modalLabel}>Cantitate</Text>
              <Text style={styles.modalValue}>{selectedListing?.quantity ?? '-'}</Text>

              <Text style={styles.modalLabel}>Expira in</Text>
              <Text style={styles.modalValue}>{selectedListing?.expiresInHours ?? '-'} ore</Text>

              <Text style={styles.modalPrice}>
                {selectedListing?.mode === 'Donate'
                  ? 'Donatie gratuita'
                  : `Vanzare: ${selectedListing?.priceRon.toFixed(2) ?? '0.00'} RON`}
              </Text>

              <View style={styles.modalButtonRow}>
                <Pressable style={styles.closeButton} onPress={() => setSelectedListingId(null)}>
                  <Text style={styles.closeButtonText}>Inchide</Text>
                </Pressable>
                <Pressable style={styles.buyButton} onPress={() => void handleBuy()} disabled={isBuying}>
                  <Text style={styles.buyButtonText}>{isBuying ? 'Se proceseaza...' : 'Buy'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0c1117',
  },
  page: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 24,
  },
  pageCompact: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 16,
  },
  pageTablet: {
    paddingHorizontal: 22,
  },
  contentColumn: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
    gap: 14,
  },
  contentColumnCompact: {
    gap: 10,
  },
  heroCard: {
    backgroundColor: '#132033',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#29405f',
  },
  heroCardCompact: {
    borderRadius: 20,
    padding: 14,
  },
  eyebrow: {
    color: '#93c5fd',
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  heading: {
    color: '#f6fbff',
    fontSize: 25,
    fontWeight: '800',
    marginTop: 6,
  },
  headingCompact: {
    fontSize: 22,
  },
  subHeading: {
    color: '#c4d5e5',
    marginTop: 8,
    lineHeight: 20,
  },
  subHeadingCompact: {
    marginTop: 6,
    lineHeight: 18,
    fontSize: 13,
  },
  sectionCard: {
    backgroundColor: '#121922',
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1f2d3f',
    gap: 10,
  },
  sectionTitle: {
    color: '#f4f7fb',
    fontSize: 18,
    fontWeight: '700',
  },
  mutedText: {
    color: '#8ba1b6',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 12, 20, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#121922',
    borderWidth: 1,
    borderColor: '#2a415f',
    borderRadius: 26,
    overflow: 'hidden',
  },
  modalCardCompact: {
    borderRadius: 20,
  },
  modalScrollContent: {
    padding: 16,
    gap: 8,
  },
  modalImage: {
    width: '100%',
    height: 220,
    borderRadius: 20,
    marginBottom: 2,
  },
  modalImageCompact: {
    height: 170,
    borderRadius: 16,
  },
  modalTitle: {
    color: '#f3f9ff',
    fontSize: 24,
    fontWeight: '800',
  },
  modalTitleCompact: {
    fontSize: 21,
  },
  modalSubTitle: {
    color: '#a8bfd6',
    marginBottom: 4,
  },
  modalLabel: {
    color: '#8fb0d0',
    fontWeight: '700',
    marginTop: 4,
  },
  modalValue: {
    color: '#e1eefc',
    lineHeight: 20,
  },
  modalPrice: {
    marginTop: 8,
    color: '#f4ce58',
    fontWeight: '800',
    fontSize: 18,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  closeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#345172',
    borderRadius: 999,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#0f1b29',
  },
  closeButtonText: {
    color: '#d5e5f7',
    fontWeight: '700',
  },
  buyButton: {
    flex: 1,
    backgroundColor: '#f0b429',
    borderRadius: 999,
    paddingVertical: 11,
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#2f2200',
    fontWeight: '800',
  },
});
