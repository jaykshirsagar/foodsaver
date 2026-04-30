import { createElement, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Image, Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
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
  const { width } = useWindowDimensions();
  const compactWidth = width < 420;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expiresAt, setExpiresAt] = useState(() => new Date(Date.now() + 12 * 60 * 60 * 1000));
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<ListingInterest>('Produce');
  const [imageDataUris, setImageDataUris] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [webDateInput, setWebDateInput] = useState(() => formatDateForWeb(expiresAt));
  const [webTimeInput, setWebTimeInput] = useState(() => formatTimeForWeb(expiresAt));

  function formatDateTime(value: Date): string {
    return value.toLocaleString('ro-RO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function toHoursUntilExpiration(value: Date): number {
    return Math.max(1, Math.ceil((value.getTime() - Date.now()) / (60 * 60 * 1000)));
  }

  function formatDateForWeb(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatTimeForWeb(value: Date): string {
    const hour = String(value.getHours()).padStart(2, '0');
    const minute = String(value.getMinutes()).padStart(2, '0');
    return `${hour}:${minute}`;
  }

  function syncWebDateTimeInputs(value: Date) {
    setWebDateInput(formatDateForWeb(value));
    setWebTimeInput(formatTimeForWeb(value));
  }

  function parseWebDateTime(dateText: string, timeText: string): Date | null {
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText.trim());
    const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeText.trim());
    if (!dateMatch || !timeMatch) {
      return null;
    }

    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    const candidate = new Date(year, month - 1, day, hours, minutes, 0, 0);

    if (
      Number.isNaN(candidate.getTime())
      || candidate.getFullYear() !== year
      || candidate.getMonth() !== month - 1
      || candidate.getDate() !== day
    ) {
      return null;
    }

    return candidate;
  }

  function handleWebDateChange(value: string) {
    setWebDateInput(value);
    const parsed = parseWebDateTime(value, webTimeInput);
    if (parsed) {
      setExpiresAt(parsed);
    }
  }

  function handleWebTimeChange(value: string) {
    setWebTimeInput(value);
    const parsed = parseWebDateTime(webDateInput, value);
    if (parsed) {
      setExpiresAt(parsed);
    }
  }

  function handleDateTimeChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (event.type === 'dismissed') {
      setShowDateTimePicker(false);
      return;
    }

    if (!selectedDate) {
      return;
    }

    if (pickerMode === 'date') {
      const nextDate = new Date(expiresAt);
      nextDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setExpiresAt(nextDate);
      syncWebDateTimeInputs(nextDate);
      setPickerMode('time');
      return;
    }

    const nextDate = new Date(expiresAt);
    nextDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
    setExpiresAt(nextDate);
    syncWebDateTimeInputs(nextDate);
    setShowDateTimePicker(false);
    setPickerMode('date');
  }

  function openDateTimePicker() {
    setPickerMode('date');
    setShowDateTimePicker(true);
  }

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
    const expiresInHours = toHoursUntilExpiration(expiresAt);
    const parsedPrice = Number(price.replace(',', '.'));
    const normalizedPrice = Number.isNaN(parsedPrice) ? 0 : Math.max(0, parsedPrice);
    const mode = normalizedPrice <= 0 ? 'Donate' : 'Price';

    if (!canCreate || !cleanTitle || !cleanQuantity || isSubmitting) {
      return;
    }

    if (expiresAt.getTime() <= Date.now()) {
      setSubmitError('Alege o data si ora din viitor pentru expirare.');
      return;
    }

    setSubmitError('');
    setIsSubmitting(true);
    try {
      await onCreate({
        title: cleanTitle,
        description: cleanDescription,
        quantity: cleanQuantity,
        expiresInHours,
        expiresAtMs: expiresAt.getTime(),
        mode,
        priceRon: normalizedPrice,
        category,
        imageDataUris,
      });
      setTitle('');
      setDescription('');
      setQuantity('');
      const resetDate = new Date(Date.now() + 12 * 60 * 60 * 1000);
      setExpiresAt(resetDate);
      syncWebDateTimeInputs(resetDate);
      setPrice('');
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

      {Platform.OS === 'web' ? (
        <View style={styles.webDateGroup}>
          <Text style={styles.dateInputLabel}>Expira la</Text>
          <Text style={styles.datePreviewText}>Selectat: {formatDateTime(expiresAt)}</Text>
          <View style={[styles.webDateNativeRow, compactWidth && styles.webDateNativeRowCompact]}>
            {createElement('input' as never, {
              type: 'date',
              value: webDateInput,
              min: formatDateForWeb(new Date()),
              onChange: (event: { target: { value: string } }) => handleWebDateChange(event.target.value),
              style: {
                width: '100%',
                boxSizing: 'border-box',
                borderRadius: 14,
                border: '1px solid #253447',
                background: '#0f141c',
                color: '#e5f0ff',
                padding: '11px 14px',
                fontSize: 14,
                outline: 'none',
                minHeight: 44,
              },
            })}
            {createElement('input' as never, {
              type: 'time',
              value: webTimeInput,
              onChange: (event: { target: { value: string } }) => handleWebTimeChange(event.target.value),
              style: {
                width: '100%',
                boxSizing: 'border-box',
                borderRadius: 14,
                border: '1px solid #253447',
                background: '#0f141c',
                color: '#e5f0ff',
                padding: '11px 14px',
                fontSize: 14,
                outline: 'none',
                minHeight: 44,
              },
            })}
          </View>
          <TextInput
            placeholder="Pret RON (0 = donatie)"
            placeholderTextColor="#7a8a93"
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />
        </View>
      ) : (
        <View style={styles.row}>
          <Pressable style={[styles.input, styles.halfInput, styles.dateInputButton]} onPress={openDateTimePicker}>
            <Text style={styles.dateInputLabel}>Expira la</Text>
            <Text style={styles.dateInputValue}>{formatDateTime(expiresAt)}</Text>
          </Pressable>
          <TextInput
            placeholder="Pret RON (0 = donatie)"
            placeholderTextColor="#7a8a93"
            style={[styles.input, styles.halfInput]}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />
        </View>
      )}

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

      {Platform.OS !== 'web' && showDateTimePicker ? (
        <DateTimePicker
          value={expiresAt}
          mode={pickerMode}
          minimumDate={new Date()}
          is24Hour
          onChange={handleDateTimeChange}
        />
      ) : null}

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
  dateInputButton: {
    justifyContent: 'center',
    borderRadius: 20,
  },
  dateInputLabel: {
    color: '#8ca3bb',
    fontSize: 12,
    marginBottom: 2,
  },
  dateInputValue: {
    color: '#e5f0ff',
    fontWeight: '700',
    fontSize: 13,
  },
  datePreviewText: {
    color: '#b7cbe0',
    fontSize: 12,
    marginBottom: 2,
  },
  webDateGroup: {
    gap: 6,
  },
  webDateNativeRow: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    gap: 8,
  },
  webDateNativeRowCompact: {
    flexDirection: 'column',
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
