CepAnalist/
├── backend/                # Tüm Python, Yapay Zeka ve API işleri burada
│   ├── main.py             # FastAPI'nin giriş noktası
│   ├── models/             # Eğittiğimiz AI modellerini (.pkl) buraya kaydedeceğiz
│   ├── scripts/            # Veri çekme ve analiz scriptleri
│   ├── services/           # İş mantığı (ML tahminleri, teknik analiz)
│   └── requirements.txt    # Az önce hazırladığımız kütüphane listesi
├── frontend/               # React Native (Mobil Uygulama) kodları burada
└── README.md               # Proje açıklaması

## Kurulum ve Çalıştırma (Kısa Özet)

### 1. Backend (FastAPI + ML API)

1. Terminal (PowerShell) aç:
   ```powershell
   cd "c:\Users\cihan\OneDrive\Masaüstü\CEPANALIST\backend"
   ```
2. Sanal ortam oluştur ve aktif et (ilk kurulumda):
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```
3. Model dosyasını kontrol et:
   - `backend\models\THYAO_model.pkl` dosyası mevcut olmalı.
4. Backend’i başlat:
   ```powershell
   python .\main.py
   ```
   - Çalıştığını test etmek için tarayıcıdan: `http://localhost:5000/`

### 2. Frontend (React Native / Expo)

1. Terminal aç:
   ```powershell
   cd "c:\Users\cihan\OneDrive\Masaüstü\CEPANALIST\frontend\CepAnalistMobil"
   ```
2. Bağımlılıkları kur (ilk kurulumda):
   ```powershell
   npm install
   ```
3. API adresini ayarla:
   - `constants\Config.ts` içinde:
     ```ts
     export const API_URL = "http://BILGISAYAR_IP_ADRESI:5000";
     ```
   - `BILGISAYAR_IP_ADRESI` için Windows’ta:
     ```powershell
     ipconfig
     ```
     komutuyla `IPv4 Address` değerini kullan.
4. Expo’yu başlat:
   ```powershell
   npx expo start
   ```
   - Web: `w` tuşu → `http://localhost:8081`
   - Telefon: Aynı Wi‑Fi’da Expo Go ile ekrandaki QR kodu tara.

### 3. Kullanım

- Uygulama açıldığında üstte:
  - `✅ Sunucu Aktif` yazıyorsa backend bağlantısı tamamdır.
- Sembol kutusuna örneğin:
  - BIST: `THYAO.IS`, `GARAN.IS`
  - Kripto: `BTC-USD`, `ETH-USD`
- “Analiz Et” butonuna bas:
  - Sinyal (AL / SAT),
  - Güven oranı,
  - Son fiyat,
  - Son 20 günlük fiyat grafiği ekranda görünür.