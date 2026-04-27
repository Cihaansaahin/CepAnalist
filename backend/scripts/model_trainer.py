import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib
import os
from data_loader import veriyi_hazirla

def modeli_egit(sembol="THYAO.IS"):
    # 1. Veriyi hazırla (data_loader'dan fonksiyonu çağırıyoruz)
    df = veriyi_hazirla(sembol)
    if df is None: return

    # 2. Etiket Oluştur (Target): Yarınki kapanış bugünküden yüksekse 1, değilse 0
    df['Target'] = (df['Close'].shift(-1) > df['Close']).astype(int)
    
    # Son satırın hedefi belli olmadığı için (yarın henüz gelmedi) onu çıkarıyoruz
    df.dropna(inplace=True)

    # 3. Özellikleri (Features) ve Hedefi (Target) belirle
    # Modelin bakacağı ipuçları:
    features = ['RSI_14', 'MACD_12_26_9', 'SMA_20', 'SMA_50']
    X = df[features]
    y = df['Target']

    # 4. Veriyi Eğitim ve Test olarak ayır (%80 Eğitim, %20 Test)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # 5. Modeli Kur ve Eğit (Random Forest - Rastgele Orman Algoritması)
    print(f"\n[BİLGİ] {sembol} için model eğitiliyor...")
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # 6. Başarıyı Ölç
    tahminler = model.predict(X_test)
    basari = accuracy_score(y_test, tahminler)
    print(f"[BAŞARILI] Model Doğruluk Oranı: %{basari*100:.2f}")

    # 7. Modeli Kaydet (models/ klasörüne)
    if not os.path.exists('models'): os.makedirs('models')
    model_yolu = f"models/{sembol.replace('.IS', '')}_model.pkl"
    joblib.dump(model, model_yolu)
    print(f"[KAYDEDİLDİ] Model şuraya kaydedildi: {model_yolu}")

if __name__ == "__main__":
    modeli_egit("THYAO.IS")