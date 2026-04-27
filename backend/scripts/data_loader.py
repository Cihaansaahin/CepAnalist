import yfinance as yf
import pandas_ta as ta
import pandas as pd
import time

def veriyi_hazirla(sembol, periyot="1y", timeout_sec=30, retry=3):
    try:
        print(f"[BİLGİ] {sembol} için veriler indiriliyor...")
        # auto_adjust=True ekleyerek yfinance uyarısını kapattık
        last_err = None
        for attempt in range(1, retry + 1):
            try:
                df = yf.download(
                    sembol,
                    period=periyot,
                    interval="1d",
                    auto_adjust=True,
                    timeout=timeout_sec,
                )
                last_err = None
                break
            except Exception as e:
                last_err = e
                print(f"[UYARI] İndirme denemesi {attempt}/{retry} başarısız: {e}")
                time.sleep(min(2 * attempt, 5))
        else:
            raise last_err
        
        if df is None or len(df) < 50:
            print(f"[HATA] {sembol} için yeterli veri bulunamadı!")
            return None

        # Sütun isimlerini düzelt (Bazen yfinance MultiIndex döndürebiliyor)
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        # Teknik göstergeleri hesapla
        # RSI
        df['RSI_14'] = ta.rsi(df['Close'], length=14)
        
        # MACD - Daha güvenli hesaplama yolu
        macd = ta.macd(df['Close'], fast=12, slow=26, signal=9)
        # MACD sütun isimleri bazen değişebilir, bu yüzden ilk 3 sütunu güvenle alıyoruz
        if macd is not None:
            df['MACD_12_26_9'] = macd.iloc[:, 0] # MACD ana çizgisi
        else:
            print("[HATA] MACD hesaplanamadı")
            return None
        
        # Hareketli Ortalamalar
        df['SMA_20'] = ta.sma(df['Close'], length=20)
        df['SMA_50'] = ta.sma(df['Close'], length=50)

        # NaN değerleri temizle
        df_temiz = df.dropna().copy()
        
        if df_temiz.empty:
            print("[HATA] Göstergeler hesaplandıktan sonra veri kalmadı!")
            return None

        print(f"[BAŞARILI] {len(df_temiz)} adet satır analiz için hazır.")
        return df_temiz

    except Exception as e:
        print(f"[HATA] Veri hazırlama sırasında bir sorun oluştu: {str(e)}")
        return None