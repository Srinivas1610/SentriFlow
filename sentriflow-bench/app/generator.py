import numpy as np
import polars as pl
import time

def generate_transactions(n_records: int = 1_000_000, seed: int = 42) -> pl.DataFrame:
    """
    Generates n_records synthetic UPI transactions with ~2.0% ground-truth fraud.
    Leverages NumPy for vectorized generation and Polars for fast DataFrame construction.
    """
    np.random.seed(seed)
    
    # 1. Ground truth fraud indicator (2% fraud rate)
    ground_truth_fraud = np.random.rand(n_records) < 0.02
    n_fraud = np.sum(ground_truth_fraud)
    n_safe = n_records - n_fraud
    
    # 2. Transaction IDs (e.g., TXN_98402912)
    # Generate random 8-digit integers for IDs
    txn_ids = np.random.randint(10000000, 99999999, size=n_records)
    txn_id_strs = [f"TXN_{tid}" for tid in txn_ids]
    
    # 3. Masked Sender & Recipient UPIs
    # Create pools of mock senders and recipients
    sender_pool = [f"user{i:05d}@okbank" for i in range(1, 10001)]
    recipient_pool = [f"rec{i:05d}@okupi" for i in range(1, 10001)]
    mule_pool = [f"mule{i:03d}@scambank" for i in range(1, 101)] # Mule accounts
    
    # Clean recipient and sender selection
    senders = np.random.choice(sender_pool, size=n_records)
    recipients = np.random.choice(recipient_pool, size=n_records)
    
    # For fraud records, target mule recipients
    fraud_recipients = np.random.choice(mule_pool, size=n_fraud)
    recipients[ground_truth_fraud] = fraud_recipients
    
    # 4. Amount (Exponential distribution: median ~450, long tail up to 100,000)
    # Median of exponential distribution is scale * ln(2) => scale = 450 / ln(2) ~ 649.212
    scale = 450.0 / np.log(2.0)
    amounts = np.random.exponential(scale=scale, size=n_records)
    
    # Elevate amount for 40% of fraud records (whales/sweeps)
    fraud_amounts_elevated = np.random.uniform(15000.0, 100000.0, size=n_fraud)
    elevate_mask = np.random.rand(n_fraud) < 0.40
    
    # Mix of elevated fraud amounts and exponential fraud amounts
    fraud_amounts = amounts[ground_truth_fraud]
    fraud_amounts[elevate_mask] = fraud_amounts_elevated[elevate_mask]
    amounts[ground_truth_fraud] = fraud_amounts
    
    # Clip amounts between ₹1 and ₹1,00,000
    amounts = np.clip(amounts, 1.0, 100000.0).round(2)
    
    # 5. Is new recipient
    is_new_recipient = np.random.rand(n_records) < 0.35 # 35% chance for normal users
    is_new_recipient[ground_truth_fraud] = np.random.rand(n_fraud) < 0.85 # 85% chance for fraud
    
    # 6. Community spam flags (0 to 50)
    # Safe recipients usually have 0 flags (occasionally 1 or 2)
    safe_flags = np.random.geometric(p=0.9, size=n_safe) - 1 # shifted geometric
    safe_flags = np.clip(safe_flags, 0, 3)
    
    # Mule/fraud recipients have high flag counts (mean ~15, max 50)
    fraud_flags = np.random.negative_binomial(n=5, p=0.25, size=n_fraud)
    fraud_flags = np.clip(fraud_flags, 0, 50)
    
    community_flags = np.zeros(n_records, dtype=int)
    community_flags[~ground_truth_fraud] = safe_flags
    community_flags[ground_truth_fraud] = fraud_flags
    
    # 7. Active unknown caller during checkout (Bool)
    # 2% of safe transactions have this active call (coincidence)
    safe_call = np.random.rand(n_safe) < 0.02
    # 60% of fraud transactions have an active call (social engineering)
    fraud_call = np.random.rand(n_fraud) < 0.60
    
    is_unknown_caller_active = np.zeros(n_records, dtype=bool)
    is_unknown_caller_active[~ground_truth_fraud] = safe_call
    is_unknown_caller_active[ground_truth_fraud] = fraud_call
    
    # 8. Recent Phishing SMS Score (0.0 to 1.0)
    # Safe users: mostly around 0.0 (phishing sms rare, rule engine scoring < 0.20)
    safe_sms = np.random.beta(a=0.5, b=8, size=n_safe)
    
    # Fraud users: highly elevated (mean ~0.80)
    fraud_sms = np.random.beta(a=8, b=2, size=n_fraud)
    # Force ~18% of fraud users to have uncertain SMS scores (0.40 - 0.65) to meet target escalation rate
    uncertain_fraud_mask = np.random.rand(n_fraud) < 0.18
    fraud_sms[uncertain_fraud_mask] = np.random.uniform(0.40, 0.65, size=np.sum(uncertain_fraud_mask))
    
    recent_phishing_sms_score = np.zeros(n_records, dtype=float)
    recent_phishing_sms_score[~ground_truth_fraud] = safe_sms
    recent_phishing_sms_score[ground_truth_fraud] = fraud_sms
    recent_phishing_sms_score = np.clip(recent_phishing_sms_score, 0.0, 1.0).round(4)
    
    # 9. Is external QR (Bool)
    # 15% of safe transactions are triggered by external QR
    safe_qr = np.random.rand(n_safe) < 0.15
    # 65% of fraud transactions are triggered by external QR / malicious links
    fraud_qr = np.random.rand(n_fraud) < 0.65
    
    is_external_qr = np.zeros(n_records, dtype=bool)
    is_external_qr[~ground_truth_fraud] = safe_qr
    is_external_qr[ground_truth_fraud] = fraud_qr
    
    # Construct Polars DataFrame
    df = pl.DataFrame({
        "txn_id": txn_id_strs,
        "sender_upi": senders,
        "recipient_upi": recipients,
        "amount": amounts,
        "is_new_recipient": is_new_recipient,
        "community_spam_flags": community_flags,
        "is_unknown_caller_active": is_unknown_caller_active,
        "recent_phishing_sms_score": recent_phishing_sms_score,
        "is_external_qr": is_external_qr,
        "ground_truth_fraud": ground_truth_fraud
    })
    
    return df

if __name__ == "__main__":
    t0 = time.perf_counter()
    df = generate_transactions(1_000_000)
    t1 = time.perf_counter()
    print(f"Generated {len(df):,} records in {t1 - t0:.3f} seconds.")
    print("Fraud rate: ", (df["ground_truth_fraud"].sum() / len(df)) * 100, "%")
    print(df.head().to_dicts())
