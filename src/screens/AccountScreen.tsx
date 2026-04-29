import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Listing, UpdateListingPayload } from '../types/marketplace';

type AccountScreenProps = {
  listings: Listing[];
  onDeleteOwnListing: (listingId: string) => Promise<void>;
  onUpdateOwnListing: (listingId: string, payload: UpdateListingPayload) => Promise<void>;
};

export function AccountScreen({ listings, onDeleteOwnListing, onUpdateOwnListing }: AccountScreenProps) {
  const { profile, user, signOutUser } = useAuth();
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editExpires, setEditExpires] = useState('12');
  const [editPrice, setEditPrice] = useState('0');
  const [isSaving, setIsSaving] = useState(false);

  const ownListings = listings.filter(
    (entry) =>
      (user?.uid ? entry.ownerUid === user.uid : false) ||
      (!!profile?.displayName && entry.owner === profile.displayName),
  );

  const editingListing = ownListings.find((entry) => entry.id === editingListingId) ?? null;

  function openEditModal(listing: Listing) {
    setEditingListingId(listing.id);
    setEditTitle(listing.title);
    setEditDescription(listing.description);
    setEditQuantity(listing.quantity);
    setEditExpires(String(listing.expiresInHours));
    setEditPrice(String(listing.priceRon));
  }

  function closeEditModal() {
    if (isSaving) {
      return;
    }

    setEditingListingId(null);
  }

  async function saveEdit() {
    if (!editingListingId || isSaving) {
      return;
    }

    const expiresInHours = Number(editExpires);
    const priceRon = Number(editPrice.replace(',', '.'));
    if (!editTitle.trim() || !editQuantity.trim() || Number.isNaN(expiresInHours)) {
      Alert.alert('Date invalide', 'Completeaza titlul, cantitatea si un numar valid de ore.');
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateOwnListing(editingListingId, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        quantity: editQuantity.trim(),
        expiresInHours: Math.max(1, expiresInHours),
        priceRon: Number.isNaN(priceRon) ? 0 : Math.max(0, priceRon),
      });
      setEditingListingId(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Nu am putut salva modificarile.';
      Alert.alert('Eroare', message);
    } finally {
      setIsSaving(false);
    }
  }

  function confirmDelete(listingId: string) {
    Alert.alert('Confirmare', 'Esti sigur ca vrei sa stergi acest anunt?', [
      { text: 'Anuleaza', style: 'cancel' },
      {
        text: 'Sterge',
        style: 'destructive',
        onPress: () => {
          void onDeleteOwnListing(listingId);
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.card}>
          <Text style={styles.title}>Cont</Text>
          <Text style={styles.item}>Nume: {profile?.displayName ?? '-'}</Text>
          <Text style={styles.item}>Email: {profile?.email ?? '-'}</Text>
          <Text style={styles.item}>Rol: {profile?.role ?? '-'}</Text>
          <Pressable style={styles.button} onPress={signOutUser}>
            <Text style={styles.buttonText}>Deconectare</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.titleSmall}>Anunturile mele ({ownListings.length})</Text>
          {ownListings.length === 0 ? (
            <Text style={styles.emptyText}>Nu ai anunturi publicate momentan.</Text>
          ) : (
            ownListings.map((entry) => (
              <View key={entry.id} style={styles.listingRow}>
                <Text style={styles.listingTitle}>{entry.title}</Text>
                <Text style={styles.listingDescription} numberOfLines={2}>
                  {entry.description || 'Fara descriere disponibila.'}
                </Text>
                <Text style={styles.listingMeta}>{entry.quantity} | expira in {entry.expiresInHours}h</Text>
                <Text style={styles.listingPrice}>
                  {entry.mode === 'Donate' ? 'Donatie gratuita' : `Vanzare: ${entry.priceRon.toFixed(2)} RON`}
                </Text>
                <View style={styles.rowActions}>
                  <Pressable style={styles.secondaryButton} onPress={() => openEditModal(entry)}>
                    <Text style={styles.secondaryButtonText}>Editeaza</Text>
                  </Pressable>
                  <Pressable style={styles.dangerButton} onPress={() => confirmDelete(entry.id)}>
                    <Text style={styles.dangerButtonText}>Sterge</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={!!editingListing} transparent animationType="fade" onRequestClose={closeEditModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editeaza anunt</Text>

            <TextInput
              style={styles.input}
              placeholder="Titlu"
              placeholderTextColor="#8fa2b8"
              value={editTitle}
              onChangeText={setEditTitle}
            />
            <TextInput
              style={[styles.input, styles.inputDescription]}
              placeholder="Descriere"
              placeholderTextColor="#8fa2b8"
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
              textAlignVertical="top"
            />
            <TextInput
              style={styles.input}
              placeholder="Cantitate"
              placeholderTextColor="#8fa2b8"
              value={editQuantity}
              onChangeText={setEditQuantity}
            />
            <View style={styles.modalRow}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Ore"
                placeholderTextColor="#8fa2b8"
                value={editExpires}
                onChangeText={setEditExpires}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Pret RON"
                placeholderTextColor="#8fa2b8"
                value={editPrice}
                onChangeText={setEditPrice}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={closeEditModal}>
                <Text style={styles.modalCancelText}>Renunta</Text>
              </Pressable>
              <Pressable style={styles.modalSave} onPress={() => void saveEdit()} disabled={isSaving}>
                <Text style={styles.modalSaveText}>{isSaving ? 'Se salveaza...' : 'Salveaza'}</Text>
              </Pressable>
            </View>
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
    padding: 16,
    gap: 14,
  },
  card: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    backgroundColor: '#121922',
    borderWidth: 1,
    borderColor: '#1f2d3f',
    borderRadius: 26,
    padding: 18,
    gap: 8,
  },
  title: {
    color: '#f6fbff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  item: {
    color: '#d4e2ef',
    fontSize: 16,
  },
  titleSmall: {
    color: '#f6fbff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyText: {
    color: '#9cb2c9',
  },
  listingRow: {
    borderWidth: 1,
    borderColor: '#2a3b52',
    backgroundColor: '#0f141c',
    borderRadius: 20,
    padding: 12,
    gap: 4,
  },
  listingTitle: {
    color: '#eef5fb',
    fontSize: 16,
    fontWeight: '700',
  },
  listingMeta: {
    color: '#a6bacf',
  },
  listingDescription: {
    color: '#9fb5cb',
    lineHeight: 18,
  },
  listingPrice: {
    color: '#f4ce58',
    fontWeight: '700',
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#345172',
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#102133',
  },
  secondaryButtonText: {
    color: '#d5e5f7',
    fontWeight: '700',
  },
  dangerButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#7f1d1d',
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#450a0a',
  },
  dangerButtonText: {
    color: '#fecaca',
    fontWeight: '700',
  },
  button: {
    marginTop: 10,
    backgroundColor: '#f0b429',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#2f2200',
    fontWeight: '800',
    fontSize: 15,
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
    padding: 16,
    gap: 10,
  },
  modalTitle: {
    color: '#f3f9ff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  input: {
    backgroundColor: '#0f141c',
    borderColor: '#253447',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#e5f0ff',
  },
  inputDescription: {
    borderRadius: 20,
    minHeight: 84,
  },
  modalRow: {
    flexDirection: 'row',
    gap: 8,
  },
  halfInput: {
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  modalCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#345172',
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#0f1b29',
  },
  modalCancelText: {
    color: '#d5e5f7',
    fontWeight: '700',
  },
  modalSave: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f0b429',
  },
  modalSaveText: {
    color: '#2f2200',
    fontWeight: '800',
  },
});
