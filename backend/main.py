from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import joblib
import os
import requests
import time
from dotenv import load_dotenv
from pydantic import BaseModel
from threading import Thread, Lock

from scripts.data_loader import veriyi_hazirla
from train_model import train as train_model

load_dotenv()

app = FastAPI()

# --- CORS AYARLARI (Telefondan erişim için ) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Geliştirme aşamasında tüm kaynaklara izin veriyoruz. Üretimde bunu kısıtlamak önemli.
    allow_credentials=True,
    allow_methods=["*"], # Tüm HTTP metodlarına izin veriyoruz (GET, POST, vb.)
    allow_headers=["*"],
)

# Modeli yükle (Yolun doğru olduğundan emin ol)
MODEL_PATH = "models/THYAO_model.pkl"
NEWS_API_KEY = os.getenv("MARKETAUX_API_KEY")

training_states = {}
training_lock = Lock()

if os.path.exists(MODEL_PATH):
    model = joblib.load(MODEL_PATH)
    print(f"[SİSTEM] Model başarıyla yüklendi: {MODEL_PATH}")
else:
    model = None
    print(f"[HATA] Model dosyası bulunamadı! Lütfen önce modeli eğitin.")

@app.get("/")
def home():
    return {
        "durum": "Analiz Sunucusu Aktif",
        "mesaj": "Cep Analist Backend'e Hoş Geldiniz",
    }

@app.get("/tahmin/{sembol}")
def tahmin_et(sembol: str):
    try:
        print(f"\n[İŞLEM] {sembol} için talep alındı...")
        
        # 1. Veriyi çek ve indikatörleri hesapla
        df = veriyi_hazirla(sembol)
        
        if df is None or df.empty:
            return {"error": "Veri çekilemedi. Sembolü kontrol edin (Örn: BTC-USD)."}

        # 2. Modelin beklediği sütunları seç (Eğitimdeki sırayla aynı olmalı)
        # Örn: RSI_14, MACD_12_26_9, SMA_20, SMA_50
        X_son = df[['RSI_14', 'MACD_12_26_9', 'SMA_20', 'SMA_50']].iloc[[-1]]
        
        # 3. Model kontrolü
        if model is None:
            return {"error": "Model yüklenemedi. Lütfen modeli eğitin (/egitim endpoint)."}
        
        # 3. Tahmin yap
        tahmin = model.predict(X_son)[0]
        olasiklar = model.predict_proba(X_son)[0]
        
        # 4. Yanıtı hazırla
        yanit = {
    "sembol": sembol.upper(),
    "sinyal": "AL (YÜKSELİŞ BEKLENTİSİ)" if tahmin == 1 else "SAT (DÜŞÜŞ BEKLENTİSİ)",
    "guven_skoru": int(max(olasiklar) * 100),
    "son_fiyat": float(round(df['Close'].iloc[-1].item(), 2)),
    "tarih": str(df.index[-1].date()),
    # GRAFİK İÇİN: Son 20 günün kapanış fiyatlarını ve ek indikatörleri gönderiyoruz
    "gecmis_fiyatlar": df['Close'].tail(20).tolist(),
    "sma20": df['SMA_20'].tail(20).tolist(),
    "sma50": df['SMA_50'].tail(20).tolist(),
    "rsi": df['RSI_14'].tail(20).tolist(),
    "macd": df['MACD_12_26_9'].tail(20).tolist(),
}
        
        print(f"[BAŞARILI] Tahmin: {yanit['sinyal']} - Güven: %{yanit['guven_skoru']}")
        return yanit

    except Exception as e:
        print(f"[HATA] Beklenmedik bir sorun oluştu: {str(e)}")
        return {"error": f"Sunucu hatası: {str(e)}"}


@app.get("/haberler")
def haberler(kategori: str = "kripto", limit: int = 10):
    """
    Marketaux üzerinden kripto ve borsa haberlerini çeker.
    MARKETAUX_API_KEY .env içinde tanımlı olmalıdır.
    """
    if not NEWS_API_KEY:
        return {
            "error": "Haber servisi için MARKETAUX_API_KEY bulunamadı. Lütfen backend klasörüne .env ekleyin."
        }

    kat = kategori.lower()
    url = "https://api.marketaux.com/v1/news/all"

    base_limit = max(1, min(limit, 20))

    # Kategoriye göre farklı filtreler uygula
    if kat == "kripto":
        params = {
            "api_token": NEWS_API_KEY,
            "language": "tr,en",
            "limit": base_limit,
            "topics": "crypto",
            # Popüler kripto varlıklar için daraltma
            "entities": "BTC-USD,ETH-USD,SOL-USD,BNB-USD,XRP-USD,DOGE-USD",
        }
    elif kat == "borsa":
        params = {
            "api_token": NEWS_API_KEY,
            "language": "tr,en",
            "limit": base_limit,
            "topics": "stock",
            # Daha çok Borsa İstanbul / Türkiye odaklı haberler
            "countries": "tr",
        }
    else:
        params = {
            "api_token": NEWS_API_KEY,
            "language": "tr,en",
            "limit": base_limit,
            "topics": "finance",
        }

    try:
        last_err = None
        resp = None
        for attempt in range(1, 4):
            try:
                # Marketaux zaman zaman yavaş olabiliyor; timeout'u yükseltip retry yapıyoruz.
                resp = requests.get(url, params=params, timeout=20)
                last_err = None
                break
            except Exception as e:
                last_err = e
                print(f"[UYARI] Haber servisi denemesi {attempt}/3 başarısız: {e}")
                time.sleep(min(2 * attempt, 5))

        if last_err is not None or resp is None:
            return {"error": f"Haber servisi isteğinde hata: {last_err}"}

        if resp.status_code != 200:
            return {
                "error": "Haber servisi hatası",
                "status_code": resp.status_code,
            }

        raw = resp.json()
        items = raw.get("data", []) or []

        # Aynı link'li haberleri tekilleştir
        seen_links = set()
        haberler = []
        for it in items:
            link = it.get("url")
            if link and link in seen_links:
                continue
            if link:
                seen_links.add(link)

            haberler.append(
                {
                    "baslik": it.get("title"),
                    "ozet": it.get("description") or it.get("snippet"),
                    "kaynak": it.get("source"),
                    "tarih": it.get("published_at"),
                    "link": link,
                }
            )

        return {
            "kategori": kat,
            "adet": len(haberler),
            "haberler": haberler,
        }
    except Exception as e:
        print(f"[HATA] Haber servisi isteğinde hata: {e}")
        return {"error": f"Haber servisi isteğinde hata: {e}"}


class TrainingRequest(BaseModel):
    symbol: str
    period: str = "2y"
    horizon: int = 5
    up: float = 0.03
    down: float = -0.03


def _run_training(job_id: str, params: TrainingRequest):
    try:
        with training_lock:
            training_states[job_id] = "running"

        train_model(
            symbol=params.symbol,
            period=params.period,
            horizon_days=params.horizon,
            up_th=params.up,
            down_th=params.down,
            model_path=MODEL_PATH,
        )

        # Model güncellendikten sonra tekrar yükle (isteğe bağlı)
        if os.path.exists(MODEL_PATH):
            try:
                with training_lock:
                    global model
                    model = joblib.load(MODEL_PATH)
                    print(f"[SİSTEM] Model yeniden yüklendi: {MODEL_PATH}")
            except Exception as e:
                print(f"[UYARI] Model yeniden yüklenemedi: {e}")

        with training_lock:
            training_states[job_id] = "done"
    except Exception as e:
        with training_lock:
            training_states[job_id] = f"error: {e}"
        print(f"[HATA] Eğitim sırasında hata: {e}")


@app.post("/egitim")
def egitim(request: TrainingRequest):
    """Modeli yeniden eğitir. İsteği gönderince arka planda başlatır."""
    job_id = request.symbol.upper()

    with training_lock:
        if training_states.get(job_id) == "running":
            return {"status": "running", "job_id": job_id}
        training_states[job_id] = "queued"

    Thread(target=_run_training, args=(job_id, request), daemon=True).start()
    return {"status": "started", "job_id": job_id}


@app.get("/egitim/{job_id}/status")
def egitim_status(job_id: str):
    status = training_states.get(job_id.upper(), "unknown")
    return {"job_id": job_id.upper(), "status": status}


if __name__ == "__main__":
    import uvicorn
    # 0.0.0.0 sayesinde yerel ağdaki (Wi-Fi) tüm cihazlar erişebilir
    print("\n🚀 Sunucu başlatılıyor... Telefondan bağlanmak için IP adresini kontrol et.")
    uvicorn.run(app, host="0.0.0.0", port=5000)