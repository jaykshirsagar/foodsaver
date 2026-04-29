import { StyleSheet, Text, View } from 'react-native';
import { RankedListing } from '../../types/marketplace';

type NotificationsPanelProps = {
  listings: RankedListing[];
};

const CATEGORY_LABELS: Record<string, string> = {
  Bakery: 'Brutarie',
  Produce: 'Produse proaspete',
  Dairy: 'Lactate',
  Prepared: 'Preparat',
};

export function NotificationsPanel({ listings }: NotificationsPanelProps) {
  const notifications = listings.filter((entry) => entry.shouldNotify);

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Notificari prioritare ({notifications.length})</Text>
      {notifications.length === 0 ? (
        <Text style={styles.mutedText}>Nu exista oferte urgente apropiate pentru profilul tau.</Text>
      ) : (
        notifications.map((entry) => (
          <View key={entry.id} style={styles.notificationRow}>
            <Text style={styles.notificationTitle}>{entry.title}</Text>
            <Text style={styles.notificationMeta}>
              {CATEGORY_LABELS[entry.category] ?? entry.category} | {entry.distance.toFixed(1)} km | {entry.expiresInHours}h ramase
            </Text>
          </View>
        ))
      )}
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
  mutedText: {
    color: '#8ba1b6',
  },
  notificationRow: {
    backgroundColor: '#17273d',
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: '#2e4b72',
  },
  notificationTitle: {
    color: '#f7fbff',
    fontWeight: '700',
    fontSize: 15,
  },
  notificationMeta: {
    color: '#b6c9dc',
    marginTop: 3,
  },
});
