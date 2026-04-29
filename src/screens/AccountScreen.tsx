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
import {
  formatAuthError,
  updateCurrentUserDisplayName,
  updateCurrentUserPasswordWithCurrent,
} from '../services/authService';
import { syncOwnerNameInListings } from '../services/listingService';
import { updateUserDisplayName } from '../services/userProfileService';
import { Listing, UpdateListingPayload } from '../types/marketplace';

type AccountScreenProps = {
  listings: Listing[];
  onDeleteOwnListing: (listingId: string) => Promise<void>;
  onUpdateOwnListing: (listingId: string, payload: UpdateListingPayload) => Promise<void>;
};

export function AccountScreen({ listings, onDeleteOwnListing, onUpdateOwnListing }: AccountScreenProps) {
  const { profile, user, signOutUser } = useAuth();
  const [showNameModal, setShowNameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
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

  function openNameModal() {
    setNewDisplayName(profile?.displayName ?? '');
    setShowNameModal(true);
  }

  function openPasswordModal() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setShowPasswordModal(true);
  }

  async function saveDisplayName() {
    if (!user || isUpdatingName) {
      return;
    }

    const cleanName = newDisplayName.trim();
    if (cleanName.length < 2) {
      Alert.alert('Nume invalid', 'Numele trebuie sa aiba cel putin 2 caractere.');
      return;
    }

    setIsUpdatingName(true);
    try {
      await updateCurrentUserDisplayName(cleanName);
      await updateUserDisplayName(user.uid, cleanName);
      await syncOwnerNameInListings(user.uid, cleanName);
      setShowNameModal(false);
      Alert.alert('Succes', 'Numele a fost actualizat.');
    } catch (error: unknown) {
      Alert.alert('Eroare', formatAuthError(error));
    } finally {
      setIsUpdatingName(false);
    }
  }

  async function savePassword() {
    if (isUpdatingPassword) {
      return;
    }

    if (!currentPassword) {
      Alert.alert('Parola actuala lipseste', 'Introdu parola actuala pentru confirmare.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Parola invalida', 'Parola trebuie sa aiba minimum 6 caractere.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert('Parole diferite', 'Parolele nu coincid.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updateCurrentUserPasswordWithCurrent(currentPassword, newPassword);
      setShowPasswordModal(false);
      Alert.alert('Succes', 'Parola a fost actualizata.');
    } catch (error: unknown) {
      Alert.alert('Eroare', formatAuthError(error));
    } finally {
      setIsUpdatingPassword(false);
    }
  }

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
          <View style={styles.rowActions}>
            <Pressable style={styles.secondaryButton} onPress={openNameModal}>
              <Text style={styles.secondaryButtonText}>Schimba nume</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={openPasswordModal}>
              <Text style={styles.secondaryButtonText}>Schimba parola</Text>
            </Pressable>
          </View>
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

      <Modal visible={showNameModal} transparent animationType="fade" onRequestClose={() => setShowNameModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Schimba numele</Text>
            <TextInput
              style={styles.input}
              placeholder="Nume nou"
              placeholderTextColor="#8fa2b8"
              value={newDisplayName}
              onChangeText={setNewDisplayName}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setShowNameModal(false)}>
                <Text style={styles.modalCancelText}>Renunta</Text>
              </Pressable>
              <Pressable style={styles.modalSave} onPress={() => void saveDisplayName()} disabled={isUpdatingName}>
                <Text style={styles.modalSaveText}>{isUpdatingName ? 'Se salveaza...' : 'Salveaza'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Schimba parola</Text>
            <View style={styles.passwordField}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Parola actuala"
                placeholderTextColor="#8fa2b8"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
              />
              <Pressable style={styles.revealButton} onPress={() => setShowCurrentPassword((prev) => !prev)}>
                <Text style={styles.revealButtonText}>{showCurrentPassword ? 'Ascunde' : 'Arata'}</Text>
              </Pressable>
            </View>
            <View style={styles.passwordField}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Parola noua"
                placeholderTextColor="#8fa2b8"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
              />
              <Pressable style={styles.revealButton} onPress={() => setShowNewPassword((prev) => !prev)}>
                <Text style={styles.revealButtonText}>{showNewPassword ? 'Ascunde' : 'Arata'}</Text>
              </Pressable>
            </View>
            <View style={styles.passwordField}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Confirma parola"
                placeholderTextColor="#8fa2b8"
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <Pressable style={styles.revealButton} onPress={() => setShowConfirmPassword((prev) => !prev)}>
                <Text style={styles.revealButtonText}>{showConfirmPassword ? 'Ascunde' : 'Arata'}</Text>
              </Pressable>
            </View>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setShowPasswordModal(false)}>
                <Text style={styles.modalCancelText}>Renunta</Text>
              </Pressable>
              <Pressable style={styles.modalSave} onPress={() => void savePassword()} disabled={isUpdatingPassword}>
                <Text style={styles.modalSaveText}>{isUpdatingPassword ? 'Se salveaza...' : 'Actualizeaza'}</Text>
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
  passwordField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  passwordInput: {
    flex: 1,
  },
  revealButton: {
    borderWidth: 1,
    borderColor: '#345172',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#102133',
  },
  revealButtonText: {
    color: '#d5e5f7',
    fontWeight: '700',
    fontSize: 12,
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
