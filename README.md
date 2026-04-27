# 📱 CepAnalist

**CepAnalist**, borsa ve finans verilerini makine öğrenmesi algoritmalarıyla analiz eden, gerçek zamanlı sinyaller üreten modern bir Full-Stack mobil uygulamadır. Kullanıcılara teknik analiz ve fiyat tahminlerini kullanıcı dostu bir arayüzle sunar.

---

## 🛠️ Teknolojiler

<div align="center">

| **Backend** | **Frontend** | **Veri & ML** |
|:---:|:---:|:---:|
| ![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54) | ![React Native](https://img.shields.io/badge/react_native-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) | ![Pandas](https://img.shields.io/badge/pandas-%23150458.svg?style=for-the-badge&logo=pandas&logoColor=white) |
| ![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi) | ![Expo](https://img.shields.io/badge/expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white) | ![Scikit-Learn](https://img.shields.io/badge/scikit--learn-%23F7931E.svg?style=for-the-badge&logo=scikit-learn&logoColor=white) |
| ![Uvicorn](https://img.shields.io/badge/uvicorn-20232a?style=for-the-badge) | ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white) | ![YFinance](https://img.shields.io/badge/Yahoo--Finance-FF0000?style=for-the-badge) |

</div>

---

## 📁 Proje Yapısı

```text
CepAnalist/
├── backend/                # API ve Makine Öğrenmesi katmanı
│   ├── main.py             # Sunucu giriş noktası (FastAPI)
│   ├── models/             # Eğitilmiş ML modelleri (.pkl)
│   ├── scripts/            # Veri çekme ve işleme araçları
│   ├── services/           # Analiz ve tahmin mantığı
│   └── requirements.txt    # Python kütüphaneleri
├── frontend/               # Mobil Uygulama katmanı
│   └── CepAnalistMobil/    # React Native / Expo projesi
└── README.md               # Proje dökümantasyonu
```


## Kurulum ve Çalıştırma (Kısa Özet)

### 1. Backend (FastAPI + ML API)

1. Terminal (PowerShell) aç:
   ```powershell
   cd "c:\Users\cihan\OneDrive\Masaüstü\CEPANALIST\backend" (kendi dosya yolunuz)
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

## 📸 Uygulama Ekran Görüntüleri

<div align="center">
  <img src="./screenshots/app_ss1.png" width="30%" />
  <img src="./screenshots/app_ss2.png" width="30%" />
  <img src="./screenshots/app_ss3.png" width="30%" />
  <img src="./screenshots/app_ss4.png" width="30%" />
</div>
