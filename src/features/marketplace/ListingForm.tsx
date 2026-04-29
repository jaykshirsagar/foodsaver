import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ListingInterest } from '../../types/auth';
import { CreateListingPayload } from '../../types/marketplace';

const CATEGORIES: ListingInterest[] = ['Bakery', 'Produce', 'Dairy', 'Prepared'];
const CATEGORY_LABELS: Record<ListingInterest, string> = {
  Bakery: 'Brutarie',
  Produce: 'Produse proaspete',
  Dairy: 'Lactate',
  Prepared: 'Preparat',
};

type ListingFormProps = {
  canCreate: boolean;
  onCreate: (payload: CreateListingPayload) => Promise<void>;
};

export function ListingForm({ canCreate, onCreate }: ListingFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expires, setExpires] = useState('12');
  const [price, setPrice] = useState('0');
  const [category, setCategory] = useState<ListingInterest>('Produce');
  const [imageDataUris, setImageDataUris] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.45,
      base64: true,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    if (!asset?.base64) {
      return;
    }

    const mimeType = asset.mimeType ?? 'image/jpeg';
    const dataUri = `data:${mimeType};base64,${asset.base64}`;
    setImageDataUris((prev) => (prev.length >= 4 ? prev : [...prev, dataUri]));
  }

  function removeImage(uri: string) {
    setImageDataUris((prev) => prev.filter((item) => item !== uri));
  }

  async function submit() {
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanQuantity = quantity.trim();
    const expiresInHours = Number(expires);
    const parsedPrice = Number(price.replace(',', '.'));
    const normalizedPrice = Number.isNaN(parsedPrice) ? 0 : Math.max(0, parsedPrice);
    const mode = normalizedPrice <= 0 ? 'Donate' : 'Price';

    if (!canCreate || !cleanTitle || !cleanQuantity || Number.isNaN(expiresInHours) || isSubmitting) {
      return;
    }

    setSubmitError('');
    setIsSubmitting(true);
    try {
      await onCreate({
        title: cleanTitle,
        description: cleanDescription,
        quantity: cleanQuantity,
        expiresInHours: Math.max(1, expiresInHours),
        mode,
        priceRon: normalizedPrice,
        category,
        imageDataUris,
      });
      setTitle('');
      setDescription('');
      setQuantity('');
      setExpires('12');
      setPrice('0');
      setCategory('Produce');
      setImageDataUris([]);
    } catch (error: unknown) {
      const text = error instanceof Error ? error.message : 'Publicarea a esuat. Incearca din nou.';
      setSubmitError(text);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Adaugare rapida</Text>
      <TextInput
        placeholder="Titlu aliment"
        placeholderTextColor="#7a8a93"
        style={styles.input}
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        placeholder="Descriere produs"
        placeholderTextColor="#7a8a93"
        style={[styles.input, styles.multilineInput]}
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
      />
      <TextInput
        placeholder="Cantitate, ex: 4 kg"
        placeholderTextColor="#7a8a93"
        style={styles.input}
        value={quantity}
        onChangeText={setQuantity}
      />

      <View style={styles.row}>
        <TextInput
          placeholder="Ore pana la expirare"
          placeholderTextColor="#7a8a93"
          style={[styles.input, styles.halfInput]}
          value={expires}
          onChangeText={setExpires}
          keyboardType="numeric"
        />
        <TextInput
          placeholder="Pret RON (0 = donatie)"
          placeholderTextColor="#7a8a93"
          style={[styles.input, styles.halfInput]}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />
      </View>

      <Text style={styles.fieldLabel}>Categorie</Text>
      <View style={styles.pillsWrap}>
        {CATEGORIES.map((item) => (
          <Pressable
            key={item}
            style={[styles.pill, category === item && styles.pillActive]}
            onPress={() => setCategory(item)}
          >
            <Text style={[styles.pillText, category === item && styles.pillTextActive]}>
              {CATEGORY_LABELS[item]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Poze</Text>
      <Pressable style={styles.secondaryButton} onPress={pickImage}>
        <Text style={styles.secondaryButtonText}>Adauga poza ({imageDataUris.length}/4)</Text>
      </Pressable>

      {imageDataUris.length > 0 ? (
        <View style={styles.previewRow}>
          {imageDataUris.map((uri) => (
            <Pressable key={uri} style={styles.previewWrap} onPress={() => removeImage(uri)}>
              <Image source={{ uri }} style={styles.previewImage} />
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>x</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

      <Pressable
        style={[styles.primaryButton, (!canCreate || isSubmitting) && styles.primaryButtonDisabled]}
        onPress={submit}
        disabled={!canCreate || isSubmitting}
      >
        <Text style={styles.primaryButtonText}>
          {!canCreate
            ? 'Doar vanzatorii sau adminii pot publica'
            : isSubmitting
              ? 'Se publica...'
              : 'Publica anuntul'}
        </Text>
      </Pressable>
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
  sectionTitle: {
    color: '#f4f7fb',
    fontSize: 18,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#0f141c',
    borderColor: '#253447',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#e5f0ff',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  halfInput: {
    flex: 1,
  },
  multilineInput: {
    borderRadius: 20,
    minHeight: 86,
  },
  fieldLabel: {
    color: '#a7b8c8',
    marginTop: 2,
    fontWeight: '600',
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderColor: '#345172',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pillActive: {
    backgroundColor: '#22558f',
    borderColor: '#84b9f2',
  },
  pillText: {
    color: '#9cb2c9',
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#f8fcff',
  },
  primaryButton: {
    marginTop: 4,
    backgroundColor: '#f0b429',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#64748b',
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#345172',
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#d6e6f7',
    fontWeight: '700',
  },
  previewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewWrap: {
    position: 'relative',
  },
  previewImage: {
    width: 64,
    height: 64,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2d3d53',
  },
  previewBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 11,
    lineHeight: 11,
  },
  errorText: {
    color: '#fca5a5',
    lineHeight: 18,
  },
  primaryButtonText: {
    color: '#2f2200',
    fontWeight: '800',
    fontSize: 15,
  },
});
