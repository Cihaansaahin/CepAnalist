# CEPANALIST Geliştirme TODO

## Öncelikli (🚀 Kritik - Üretim Hazırlığı)
- [x] **Hata Yönetimi**: Frontend axios interceptor (retry + offline). Backend model None check.
- [x] **Config Güvenliği**: API_URL env support + CORS domain list.
- [x] **Model Safety**: Global model race condition fix (Redis/Celery).
- [x] **.env Template**: backend/.env.example oluştur.

## Orta Öncelik (⭐ Geliştirme)
- [ ] **Favoriler**: AsyncStorage + autocomplete search.
- [ ] **Pull-to-Refresh**: QueryClient (TanStack).
- [ ] **ML Tuning**: Optuna hyperparam search.
- [ ] **Tests**: pytest (backend), Jest (frontend).

## Düşük Öncelik (🔮 Gelecek)
- [ ] LSTM modeli.
- [ ] Push notifications.
- [ ] Docker deployment.

**Progress**: 4/12 tamamlandı (Hata + Config + env).

