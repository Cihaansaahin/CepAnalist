import { Platform, StyleSheet, ActivityIndicator, TextInput, TouchableOpacity, View, Alert, Dimensions, ScrollView } from 'react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '@/lib/api';
import { useFavorites } from '@/hooks/useFavorites';
import { LineChart } from "react-native-chart-kit";
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExternalLink } from '@/components/external-link';
import { API_URL } from '@/constants/Config';
const screenWidth = Dimensions.get("window").width;

const SYMBOL_OPTIONS = [
  // Kripto
  'BTC-USD',
  'ETH-USD',
  'SOL-USD',
  'BNB-USD',
  'XRP-USD',
  'DOGE-USD',
  // BIST
  'THYAO.IS',
  'GARAN.IS',
  'AKBNK.IS',
  'ASELS.IS',
  'SAHOL.IS',
];

export default function HomeScreen() {
  const [status, setStatus] = useState("Bağlanıyor...");
  const [symbol, setSymbol] = useState('BTC-USD');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [training, setTraining] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState<string | null>(null);
  const trainingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [news, setNews] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);

  const confidenceColor =
    result && typeof result.guven_skoru === 'number'
      ? result.guven_skoru >= 80
        ? '#2E7D32' // yüksek güven - yeşil
        : result.guven_skoru >= 60
        ? '#FF8F00' // orta güven - turuncu
        : '#C62828' // düşük güven - kırmızı
      : '#0a7ea4';

  // Sembolün USD bazlı mı yoksa TL bazlı mı olduğuna göre para birimi sembolü
  const currencySymbol = symbol.toUpperCase().includes('-USD') ? '$' : '₺';

  // Chart için etiket dizisi (her veri bazlı); çakışmaları önlemek için aynı uzunlukta boş string üretir.
  const makeLabels = (arr: unknown[] | undefined) => (Array.isArray(arr) ? arr.map(() => '') : []);

  // Ek metrikler (değişim, en yüksek / en düşük, RSI sinyali)
  const priceHistory = result?.gecmis_fiyatlar ?? [];
  const firstPrice = priceHistory.length ? priceHistory[0] : null;
  const lastPrice = priceHistory.length ? priceHistory[priceHistory.length - 1] : null;
  const percentChange = firstPrice && lastPrice ? ((lastPrice - firstPrice) / firstPrice) * 100 : null;
  const minPrice = priceHistory.length ? Math.min(...priceHistory) : null;
  const maxPrice = priceHistory.length ? Math.max(...priceHistory) : null;

  // Açılış / kapanış farkına göre renk tonu (yükseliş/düşüş)
  const closeTrendColor =
    firstPrice != null && lastPrice != null
      ? lastPrice > firstPrice
        ? '#2E7D32'
        : lastPrice < firstPrice
        ? '#C62828'
        : '#0a7ea4'
      : '#0a7ea4';

  const lastRsi = result?.rsi?.length ? result.rsi[result.rsi.length - 1] : null;
  const rsiSignal = lastRsi != null
    ? lastRsi > 70
      ? 'Aşırı Alım'
      : lastRsi < 30
      ? 'Aşırı Satım'
      : 'Normal'
    : null;

  const advice = useMemo(() => {
    if (!result) return null;

    const lines: string[] = [];

    // 1) Model ve güven seviyesi (temel sinyal)
    if (result.sinyal) {
      const sinyal = result.sinyal;
      const guven = typeof result.guven_skoru === 'number' ? result.guven_skoru : null;

      if (guven != null) {
        const guvenKategori =
          guven >= 80 ? 'Yüksek' :
          guven >= 60 ? 'Orta' :
          'Düşük';

        lines.push(
          `• Model çıkışı: ${sinyal} (güven: ${guvenKategori} – %${guven}).`
        );

        if (guven < 60) {
          lines.push('• Bu sinyalde belirsizlik var; destek/direnç ve haber akışıyla çapraz kontrol önerilir.');
        }
      } else {
        lines.push(`Model çıkışı: ${sinyal}.`);
      }
    }

    // 2) Fiyat hareketi (son 20 gün)
    if (percentChange != null && minPrice != null && maxPrice != null && lastPrice != null) {
      lines.push(
        `• Son 20 günde fiyat %${percentChange.toFixed(2)} değişti (en yüksek ${maxPrice.toFixed(2)}, en düşük ${minPrice.toFixed(2)}, kapanış ${lastPrice.toFixed(2)}).`
      );
    }

    // 3) RSI yorumu
    if (lastRsi != null && rsiSignal) {
      const rsiComment =
        rsiSignal === 'Aşırı Alım'
          ? 'RSI 70 üzerinde; kısa vadede düzeltme riski olabilir.'
          : rsiSignal === 'Aşırı Satım'
          ? 'RSI 30 altında; tepki alımı ve momentum dönüşü gözlenebilir.'
          : 'RSI 30–70 arası; trend teyidi için diğer göstergelere bakın.';

      lines.push(`• RSI: ${lastRsi.toFixed(1)} (${rsiSignal}). ${rsiComment}`);
    }

    // 4) SMA trend yorumu
    const lastClose = lastPrice;
    const lastSma20 = result.sma20?.length ? result.sma20[result.sma20.length - 1] : null;
    const lastSma50 = result.sma50?.length ? result.sma50[result.sma50.length - 1] : null;

    if (lastClose != null && lastSma20 != null && lastSma50 != null) {
      if (lastSma20 > lastSma50 && lastClose > lastSma20) {
        lines.push('SMA20, SMA50 üzerinde ve kapanış üstünde; kısa vadeli momentum pozitif.');
      } else if (lastSma20 < lastSma50 && lastClose < lastSma20) {
        lines.push('SMA20, SMA50 altında ve kapanış altı; kısa vadeli momentum zayıf.');
      } else {
        lines.push('• SMA sinyalleri karışık; trendin doğrulanması için fiyatın SMA’lara göre hareketini izleyin.');
      }
    }

    // Çok uzun tek satır yerine, satır atlamalı daha okunabilir bir biçimde göster.
    return lines.join('\n\n');
  }, [result, lastPrice, lastRsi, rsiSignal, percentChange, minPrice, maxPrice]);

  const adviceLines = useMemo(() => (advice ? advice.split('\n\n') : []), [advice]);

  const adviceLineStyle = (line: string) => {
    // Önemli anahtar kelimelere göre renklendir.
    if (line.includes('Aşırı Alım') || (line.includes('AL') && !line.includes('SAT'))) {
      return { color: '#2E7D32', fontWeight: '700' };
    }
    if (line.includes('Aşırı Satım') || line.includes('SAT')) {
      return { color: '#C62828', fontWeight: '700' };
    }
    if (line.includes('RSI')) {
      return { color: '#6a1b9a', fontWeight: '600' };
    }
    if (line.includes('SMA')) {
      return { color: '#0a7ea4', fontWeight: '600' };
    }
    return {};
  };

  const getNewsCategory = (sym: string) => (sym.toUpperCase().includes('-USD') ? 'kripto' : 'borsa');

  const fetchNews = async (sym: string) => {
    setNewsLoading(true);
    setNewsError(null);

    try {
      const kat = getNewsCategory(sym);
const res = await api.get('/haberler', {
        params: { kategori: kat, limit: 5 },
      });

      if (res.data?.haberler) {
        setNews(res.data.haberler);
      } else {
        setNews([]);
        setNewsError('Haber bulunamadı.');
      }
    } catch {
      setNews([]);
      setNewsError('Haberler alınırken sorun oldu.');
    } finally {
      setNewsLoading(false);
    }
  };

  useEffect(() => {
    api.get('/').then(() => setStatus("✅ Sunucu Aktif")).catch(() => setStatus("❌ Bağlantı Yok"));
  }, []);

  const getPrediction = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/tahmin/${symbol.toUpperCase()}`);
      setResult(response.data);
      await fetchNews(symbol);
    } catch {
      Alert.alert("Hata", "Bağlantı kurulamadı.");
    } finally { setLoading(false); }
  };

  const checkTrainingStatus = async (jobId: string) => {
    try {
      const res = await api.get(`/egitim/${jobId}/status`);
      const status = res.data?.status;
      setTrainingStatus(status);
      if (status === 'done' || (typeof status === 'string' && status.startsWith('error'))) {
        setTraining(false);
        if (trainingIntervalRef.current) {
          clearInterval(trainingIntervalRef.current);
          trainingIntervalRef.current = null;
        }
      }
    } catch {
      // hata olsa da bekle ve yeniden dene
    }
  };

  const startTraining = async () => {
    setTraining(true);
    setTrainingStatus('Başlatılıyor...');

    try {
      const res = await api.post('/egitim', {
        symbol: symbol.toUpperCase(),
      });
      const jobId = res.data?.job_id || symbol.toUpperCase();
      setTrainingStatus('Eğitim başlatıldı. Durum izleniyor...');

      const interval = setInterval(() => {
        checkTrainingStatus(jobId);
      }, 3000);

      trainingIntervalRef.current = interval;
    } catch {
      setTraining(false);
      setTrainingStatus('Eğitim başlatılamadı.');
    }
  };

  useEffect(() => {
    return () => {
      if (trainingIntervalRef.current) {
        clearInterval(trainingIntervalRef.current);
      }
    };
  }, []);

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={{ color: '#fff' }}>Cep Analist AI 🚀</ThemedText>
        <ThemedText style={{ color: '#fff', opacity: 0.8 }}>{status}</ThemedText>
      </ThemedView>

      <View style={styles.searchSection}>
        <TextInput style={styles.input} value={symbol} onChangeText={setSymbol} placeholder="Sembol (Örn: THYAO.IS)" autoCapitalize="characters" />
        <TouchableOpacity style={styles.button} onPress={getPrediction}>
          {loading ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Analiz Et</ThemedText>}
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.symbolList}>
        {SYMBOL_OPTIONS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[
              styles.symbolChip,
              symbol.toUpperCase() === s.toUpperCase() && styles.symbolChipActive,
            ]}
            onPress={() => setSymbol(s)}>
            <ThemedText
              style={[
                styles.symbolChipText,
                symbol.toUpperCase() === s.toUpperCase() && styles.symbolChipTextActive,
              ]}>
              {s}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {result && result.sinyal && (
        <View style={styles.resultWrapper}>
          <View style={[styles.card, { borderTopColor: result.sinyal.includes('AL') ? '#4CAF50' : '#F44336' }]}>
            <View style={styles.cardHeader}>
              <ThemedText style={styles.symbolTitle}>{result.sembol}</ThemedText>
              <ThemedText style={styles.date}>{result.tarih}</ThemedText>
            </View>

            <View style={styles.priceRow}>
              <View>
                <ThemedText style={[styles.price, { color: confidenceColor }]}>{result.son_fiyat} {currencySymbol}</ThemedText>
                <View style={styles.priceMetaRow}>
                  <View style={styles.priceMetaItem}>
                    <ThemedText style={styles.metricLabel}>Açılış</ThemedText>
                    <ThemedText style={[styles.metricValue, styles.numericValue, { color: '#cfd8e3' }]}>{firstPrice ? `${firstPrice.toFixed(2)} ${currencySymbol}` : '-'}</ThemedText>
                  </View>
                  <View style={styles.priceMetaItem}>
                    <ThemedText style={styles.metricLabel}>Kapanış</ThemedText>
                    <ThemedText style={[styles.metricValue, styles.numericValue, { color: closeTrendColor }]}>{lastPrice ? `${lastPrice.toFixed(2)} ${currencySymbol}` : '-'}</ThemedText>
                  </View>
                </View>
              </View>
              <View style={[styles.badge, { backgroundColor: result.sinyal.includes('AL') ? '#E8F5E9' : '#FFEBEE' }]}> 
                <ThemedText numberOfLines={1} adjustsFontSizeToFit style={{ color: result.sinyal.includes('AL') ? '#2E7D32' : '#C62828', fontWeight: 'bold' }}>
                  {result.sinyal}
                </ThemedText>
              </View>
            </View>

            <View style={styles.trainingRow}>
              <TouchableOpacity
                style={[styles.button, training && { opacity: 0.6 }]}
                onPress={startTraining}
                disabled={training}
              >
                {training ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.buttonText}>Modeli Eğit</ThemedText>
                )}
              </TouchableOpacity>
              {trainingStatus ? (
                <ThemedText style={styles.trainingStatus}>{trainingStatus}</ThemedText>
              ) : null}
            </View>

            {result.gecmis_fiyatlar?.length > 0 && (
              <>
                <ThemedText style={styles.chartTitle}>Son 20 Günlük Trend</ThemedText>
                <LineChart
                  data={{
                    labels: makeLabels(result.gecmis_fiyatlar),
                    datasets: [
                      {
                        data: result.gecmis_fiyatlar ?? [],
                        color: (opacity = 1) => `rgba(10, 126, 164, ${opacity})`,
                        strokeWidth: 2,
                      },
                      {
                        data: result.sma20 ?? [],
                        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                        strokeWidth: 2,
                      },
                      {
                        data: result.sma50 ?? [],
                        color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
                        strokeWidth: 2,
                      },
                    ],
                  }}
                  width={screenWidth - 75}
                  height={180}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                />
              </>
            )}

            {result.rsi?.length > 0 && (
              <>
                <ThemedText style={styles.chartTitle}>RSI (14) - Son 20 Gün</ThemedText>
                <LineChart
                  data={{ labels: makeLabels(result.rsi), datasets: [{ data: result.rsi ?? [], color: (opacity = 1) => `rgba(156, 39, 176, ${opacity})`, strokeWidth: 2 }] }}
                  width={screenWidth - 75}
                  height={130}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                />
              </>
            )}

            {result.macd?.length > 0 && (
              <>
                <ThemedText style={styles.chartTitle}>MACD (12,26,9) - Son 20 Gün</ThemedText>
                <LineChart
                  data={{ labels: makeLabels(result.macd), datasets: [{ data: result.macd ?? [], color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`, strokeWidth: 2 }] }}
                  width={screenWidth - 75}
                  height={130}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                />
              </>
            )}

            {priceHistory.length > 0 && (
              <View style={styles.metricsRow}>
                <View style={styles.metricCard}>
                  <ThemedText type="subtitle" style={styles.metricLabel}>20g Değişim</ThemedText>
                  <ThemedText style={styles.metricValue}>{percentChange?.toFixed(2)}%</ThemedText>
                </View>
                <View style={styles.metricCard}>
                  <ThemedText type="subtitle" style={styles.metricLabel}>En Yüksek</ThemedText>
                  <ThemedText style={styles.metricValue}>{maxPrice?.toFixed(2)} {currencySymbol}</ThemedText>
                </View>
                <View style={styles.metricCard}>
                  <ThemedText type="subtitle" style={styles.metricLabel}>En Düşük</ThemedText>
                  <ThemedText style={styles.metricValue}>{minPrice?.toFixed(2)} {currencySymbol}</ThemedText>
                </View>
              </View>
            )}

            {(newsLoading || news.length > 0 || newsError) && (
              <View style={styles.newsSection}>
                <ThemedText style={styles.chartTitle}>İlgili Haberler</ThemedText>

                {newsLoading && (
                  <View style={styles.center}>
                    <ActivityIndicator color="#0a7ea4" />
                  </View>
                )}

                {newsError && (
                  <ThemedText style={styles.errorText}>{newsError}</ThemedText>
                )}

                {!newsLoading && !newsError && news.length === 0 && (
                  <ThemedText style={styles.noDataText}>Haber bulunamadı.</ThemedText>
                )}

                {!newsLoading && news.length > 0 && (
                  <View style={styles.newsList}>
                    {news.map((h, idx) => (
                      <View key={idx} style={styles.newsCard}>
                        <ThemedText type="subtitle" numberOfLines={2}>
                          {h.baslik}
                        </ThemedText>
                        {h.kaynak && <ThemedText style={styles.newsMeta}>{h.kaynak}</ThemedText>}
                        {h.tarih && <ThemedText style={styles.newsMeta}>{new Date(h.tarih).toLocaleString()}</ThemedText>}
                        {h.link && (
                          <ExternalLink href={h.link} style={styles.newsLink}>
                            <ThemedText type="link">Haberi Aç</ThemedText>
                          </ExternalLink>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {rsiSignal && (
              <View style={styles.metricRow}>
                <ThemedText style={styles.metricLabel}>RSI (son):</ThemedText>
                <ThemedText style={styles.metricValue}>{lastRsi?.toFixed(1)} ({rsiSignal})</ThemedText>
              </View>
            )}

            <ThemedText style={[styles.confidence, { color: confidenceColor }]}>

              Güven Oranı: %{result.guven_skoru}
            </ThemedText>
            {advice ? (
              <View style={styles.adviceBox}>
                <ThemedText type="subtitle" style={styles.adviceTitle}>Tavsiye</ThemedText>
                {adviceLines.map((line, idx) => (
                  <ThemedText key={idx} style={[styles.adviceText, adviceLineStyle(line)]}>
                    {line}
                  </ThemedText>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const chartConfig = {
  backgroundColor: "#fff", backgroundGradientFrom: "#fff", backgroundGradientTo: "#fff",
  color: (opacity = 1) => `rgba(10, 126, 164, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, 0.5)`,
  propsForDots: { r: "3", strokeWidth: "2", stroke: "#0a7ea4" },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1720' },
  header: { padding: 40, paddingTop: 60, backgroundColor: '#0f2433', borderBottomRightRadius: 30 },
  searchSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, flexDirection: 'row', gap: 10, marginTop: -20 },
  input: { flex: 1, backgroundColor: '#fff', padding: 15, borderRadius: 12, elevation: 3 },
  button: { backgroundColor: '#1D3D47', padding: 15, borderRadius: 12, justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  symbolList: { paddingHorizontal: 20, paddingBottom: 10, gap: 8 },
  symbolChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#324a5f',
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  symbolChipActive: {
    backgroundColor: '#1D3D47',
    borderColor: '#1D3D47',
  },
  symbolChipText: {
    fontSize: 12,
    color: '#cfd8e3',
  },
  symbolChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  resultWrapper: { padding: 20 },
  card: { backgroundColor: '#10212f', borderRadius: 20, padding: 15, borderTopWidth: 6, elevation: 5, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  symbolTitle: { fontSize: 22, fontWeight: 'bold' },
  date: { color: '#c2cbd3' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  trainingRow: { marginTop: 12, marginBottom: 10 },
  trainingStatus: { marginTop: 8, fontSize: 12, opacity: 0.8, color: '#cfd8e3' },
  price: { fontSize: 26, fontWeight: 'bold', color: '#f5f7fa' },
  badge: { padding: 8, borderRadius: 8, flexShrink: 1, marginLeft: 10 },
  chartTitle: { fontSize: 14, fontWeight: '600', color: '#9aa4b2' },
  chart: { marginVertical: 10, marginLeft: -15, borderRadius: 16 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 12 },
  metricCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  metricLabel: { fontSize: 12, opacity: 0.8, marginBottom: 4 },
  metricValue: { fontSize: 16, fontWeight: '700' },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  priceMetaRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  priceMetaItem: { alignItems: 'flex-start' },
  numericValue: { fontFamily: 'System', fontWeight: '700', fontSize: 16 },
  newsSection: { marginTop: 16 },
  newsList: { gap: 10 },
  newsCard: { padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  newsMeta: { fontSize: 12, opacity: 0.7, marginTop: 4 },
  newsLink: { marginTop: 8 },
  noDataText: { opacity: 0.7, marginTop: 10 },
  adviceBox: { marginTop: 12, padding: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: 'rgba(10,126,164,0.4)', elevation: 4, shadowColor: 'rgba(0,0,0,0.25)', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  adviceTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6, color: '#0a3a5a' },
  adviceText: { fontSize: 14, color: '#0b1720', opacity: 0.95, lineHeight: 20, marginBottom: 8 },
  confidence: { textAlign: 'center', marginTop: 10, fontWeight: 'bold', color: '#0a7ea4' }
});