import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import api from '@/lib/api';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_URL } from '@/constants/Config';

type Haber = {
  baslik: string;
  ozet?: string;
  kaynak?: string;
  tarih?: string;
  link?: string;
};

const KATEGORILER = [
  { id: 'kripto', label: 'Kripto Haberleri' },
  { id: 'borsa', label: 'Borsa Haberleri' },
];

export default function NewsScreen() {
  const [kategori, setKategori] = useState<'kripto' | 'borsa'>('kripto');
  const [haberler, setHaberler] = useState<Haber[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = async (kat: 'kripto' | 'borsa') => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/haberler', {
        params: { kategori: kat, limit: 10 },
      });
      if (res.data?.error) {
        setError(res.data.error);
        setHaberler([]);
      } else {
        setHaberler(res.data.haberler ?? []);
      }
    } catch {
      setError('Haberler alınırken bir sorun oluştu.');
      setHaberler([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(kategori);
  }, [kategori]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>
          Piyasa Haberleri
        </ThemedText>
        <ThemedText style={styles.headerSubtitle}>
          Kripto ve borsa için son haberler
        </ThemedText>
      </View>

      <View style={styles.tabRow}>
        {KATEGORILER.map((k) => (
          <TouchableOpacity
            key={k.id}
            style={[
              styles.tabButton,
              kategori === k.id && styles.tabButtonActive,
            ]}
            onPress={() => setKategori(k.id as 'kripto' | 'borsa')}>
            <ThemedText
              style={[
                styles.tabText,
                kategori === k.id && styles.tabTextActive,
              ]}>
              {k.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color="#0a7ea4" />
        </View>
      )}

      {!loading && error && (
        <View style={styles.center}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      )}

      {!loading && !error && (
        <ScrollView contentContainerStyle={styles.list}>
          {haberler.map((h, idx) => (
            <ThemedView key={idx} style={styles.card}>
              <ThemedText type="subtitle" numberOfLines={2}>
                {h.baslik}
              </ThemedText>
              {h.kaynak && (
                <ThemedText style={styles.sourceText}>{h.kaynak}</ThemedText>
              )}
              {h.tarih && (
                <ThemedText style={styles.dateText}>
                  {new Date(h.tarih).toLocaleString()}
                </ThemedText>
              )}
              {h.ozet && (
                <ThemedText numberOfLines={3} style={styles.summaryText}>
                  {h.ozet}
                </ThemedText>
              )}
              {h.link && (
                <ExternalLink href={h.link} style={styles.link}>
                  <ThemedText type="link">Haberi Aç</ThemedText>
                </ExternalLink>
              )}
            </ThemedView>
          ))}
          {haberler.length === 0 && !loading && !error && (
            <View style={styles.center}>
              <ThemedText>Gösterilecek haber bulunamadı.</ThemedText>
            </View>
          )}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 12 },
  headerTitle: { marginBottom: 4 },
  headerSubtitle: { opacity: 0.7 },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#324a5f',
  },
  tabButtonActive: {
    backgroundColor: '#1D3D47',
    borderColor: '#1D3D47',
  },
  tabText: {
    fontSize: 13,
  },
  tabTextActive: {
    fontWeight: '600',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  errorText: {
    color: '#C62828',
    textAlign: 'center',
  },
  list: {
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    padding: 12,
    borderRadius: 12,
  },
  sourceText: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  dateText: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  summaryText: {
    marginTop: 8,
  },
  link: {
    marginTop: 8,
  },
});
