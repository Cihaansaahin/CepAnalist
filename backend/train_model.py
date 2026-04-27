import argparse
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split

from scripts.data_loader import veriyi_hazirla


def create_labels(df: pd.DataFrame, horizon_days: int, up_th: float, down_th: float) -> pd.DataFrame:
    """
    Gelecek N günün toplam getirisine göre AL / SAT etiketi üret.

    - getiri = (Close_{t+N} - Close_t) / Close_t
    - getiri >= up_th   -> 1 (AL)
    - getiri <= down_th -> 0 (SAT)
    - aradakiler eğitimden çıkarılır
    """
    future_close = df["Close"].shift(-horizon_days)
    ret = (future_close - df["Close"]) / df["Close"]

    df = df.copy()
    df["label_raw"] = np.where(
        ret >= up_th,
        1,
        np.where(ret <= down_th, 0, np.nan),
    )
    df = df.dropna(subset=["label_raw"])
    df["label"] = df["label_raw"].astype(int)
    df = df.drop(columns=["label_raw"])
    return df


def train(
    symbol: str,
    period: str = "2y",
    horizon_days: int = 5,
    up_th: float = 0.03,
    down_th: float = -0.03,
    model_path: str = "models/THYAO_model.pkl",
) -> None:
    print(f"[EĞİTİM] {symbol} için veri hazırlanıyor (periyot={period})...")
    df = veriyi_hazirla(symbol, periyot=period)

    if df is None or df.empty:
        print("[HATA] Veri hazırlanamadı, eğitim iptal.")
        return

    df = create_labels(df, horizon_days=horizon_days, up_th=up_th, down_th=down_th)

    if df.empty:
        print("[HATA] Etiket üretildikten sonra hiç satır kalmadı. Eşik değerleri çok agresif olabilir.")
        return

    feature_cols = ["RSI_14", "MACD_12_26_9", "SMA_20", "SMA_50"]
    missing = [c for c in feature_cols if c not in df.columns]
    if missing:
        print(f"[HATA] Eksik feature kolonları: {missing}")
        return

    X = df[feature_cols]
    y = df["label"]

    if len(df) < 200:
        print(f"[UYARI] Sadece {len(df)} satır veri var, model çok güvenilir olmayabilir.")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, shuffle=False
    )

    print(
        f"[BİLGİ] Eğitim veri seti: {len(X_train)} satır, Test seti: {len(X_test)} satır"
    )

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=6,
        random_state=42,
        n_jobs=-1,
    )

    print("[EĞİTİM] Model eğitiliyor...")
    model.fit(X_train, y_train)

    print("[TEST] Test verisi üzerinde performans:")
    y_pred = model.predict(X_test)
    print(classification_report(y_test, y_pred, digits=3))

    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    joblib.dump(model, model_path)
    print(f"[KAYIT] Model kaydedildi: {model_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="CepAnalist modeli için eğitim script'i"
    )
    parser.add_argument(
        "symbol",
        type=str,
        help="Eğitim yapılacak sembol (örn. THYAO.IS, BTC-USD)",
    )
    parser.add_argument(
        "--period",
        type=str,
        default="2y",
        help="Yfinance periyodu (örn. 1y, 2y, 5y)",
    )
    parser.add_argument(
        "--horizon",
        type=int,
        default=5,
        help="Kaç gün sonrası getiriye göre etiketleneceği (varsayılan: 5)",
    )
    parser.add_argument(
        "--up",
        type=float,
        default=0.03,
        help="Yukarı yönlü eşik (ör: 0.03 = %%3 artış -> AL)",
    )
    parser.add_argument(
        "--down",
        type=float,
        default=-0.03,
        help="Aşağı yönlü eşik (ör: -0.03 = %%3 düşüş -> SAT)",
    )
    parser.add_argument(
        "--model-path",
        type=str,
        default="models/THYAO_model.pkl",
        help="Kaydedilecek model yolu (main.py ile uyumlu olmalı)",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    train(
        symbol=args.symbol,
        period=args.period,
        horizon_days=args.horizon,
        up_th=args.up,
        down_th=args.down,
        model_path=args.model_path,
    )

