import os
import sys
import time
import ctypes
import numpy as np
import polars as pl

class SentriFlowEvaluator:
    def __init__(self):
        self.lib_path = ""
        self.lib = None
        self._load_cpp_extension()

    def _load_cpp_extension(self):
        """Attempts to load the compiled C++ DLL/shared library."""
        native_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "native")
        
        # Check platform shared lib names
        if sys.platform.startswith("win"):
            lib_name = "evaluator.dll"
        elif sys.platform.startswith("darwin"):
            lib_name = "evaluator.dylib"
        else:
            lib_name = "evaluator.so"
            
        full_path = os.path.join(native_dir, lib_name)
        if os.path.exists(full_path):
            try:
                self.lib = ctypes.CDLL(full_path)
                # Define argtypes and restype
                self.lib.evaluate_batch.argtypes = [
                    ctypes.POINTER(ctypes.c_double), # amounts
                    ctypes.POINTER(ctypes.c_bool),   # is_new_recipients
                    ctypes.POINTER(ctypes.c_int),    # community_spam_flags
                    ctypes.POINTER(ctypes.c_bool),   # is_unknown_callers
                    ctypes.POINTER(ctypes.c_double), # recent_sms_scores
                    ctypes.POINTER(ctypes.c_int),    # risk_scores
                    ctypes.c_int                     # size
                ]
                self.lib.evaluate_batch.restype = None
                self.lib_path = full_path
                print(f"C++ Native Extension loaded successfully from {full_path}")
            except Exception as e:
                print(f"Failed to load CDLL from {full_path}: {e}. Falling back to Python/Polars.")
        else:
            print("C++ Native Extension not found. Falling back to Python/Polars.")

    def evaluate_vectorized_polars(self, df: pl.DataFrame) -> np.ndarray:
        """Vectorized evaluation in Polars (highly optimized native Rust speed)."""
        # community_spam_flags > 5 -> +40
        # is_unknown_caller_active -> +35
        # recent_phishing_sms_score > 0.70 -> +45
        # amount > 50,000 and is_new_recipient -> +25
        
        amounts = df["amount"].to_numpy()
        is_new_recipients = df["is_new_recipient"].to_numpy()
        community_flags = df["community_spam_flags"].to_numpy()
        unknown_callers = df["is_unknown_caller_active"].to_numpy()
        sms_scores = df["recent_phishing_sms_score"].to_numpy()
        
        scores = np.zeros(len(df), dtype=np.int32)
        
        scores += np.where(community_flags > 5, 40, 0)
        scores += np.where(unknown_callers, 35, 0)
        scores += np.where(sms_scores > 0.70, 45, 0)
        scores += np.where((amounts > 50000.0) & is_new_recipients, 25, 0)
        
        # Clip/cap at 100
        return np.clip(scores, 0, 100)

    def evaluate_cpp(self, df: pl.DataFrame) -> np.ndarray:
        """Evaluates using the C++ native extension via ctypes."""
        if not self.lib:
            return self.evaluate_vectorized_polars(df)
            
        size = len(df)
        
        # Convert columns to compatible numpy contiguous arrays
        amounts = np.ascontiguousarray(df["amount"].to_numpy(), dtype=np.float64)
        is_new_recipients = np.ascontiguousarray(df["is_new_recipient"].to_numpy(), dtype=np.bool_)
        community_flags = np.ascontiguousarray(df["community_spam_flags"].to_numpy(), dtype=np.int32)
        unknown_callers = np.ascontiguousarray(df["is_unknown_caller_active"].to_numpy(), dtype=np.bool_)
        sms_scores = np.ascontiguousarray(df["recent_phishing_sms_score"].to_numpy(), dtype=np.float64)
        
        # Output buffer
        risk_scores = np.zeros(size, dtype=np.int32)
        
        # Get pointers to memory
        amounts_ptr = amounts.ctypes.data_as(ctypes.POINTER(ctypes.c_double))
        new_rec_ptr = is_new_recipients.ctypes.data_as(ctypes.POINTER(ctypes.c_bool))
        flags_ptr = community_flags.ctypes.data_as(ctypes.POINTER(ctypes.c_int))
        call_ptr = unknown_callers.ctypes.data_as(ctypes.POINTER(ctypes.c_bool))
        sms_ptr = sms_scores.ctypes.data_as(ctypes.POINTER(ctypes.c_double))
        out_ptr = risk_scores.ctypes.data_as(ctypes.POINTER(ctypes.c_int))
        
        # Invoke C++ DLL function
        self.lib.evaluate_batch(
            amounts_ptr, new_rec_ptr, flags_ptr, call_ptr, sms_ptr, out_ptr, size
        )
        
        return risk_scores

    def run_benchmark(self, df: pl.DataFrame, batch_size: int = 1_000_000) -> dict:
        """
        Runs the benchmark on the dataframe.
        Measures throughput on the batch, and measures high-resolution single-record latencies
        on a random sample to isolate function processing overhead.
        """
        size = len(df)
        print(f"Starting evaluation of {size:,} records...")
        
        # 1. Measure batch execution time (Throughput)
        t_start = time.perf_counter()
        if self.lib:
            scores = self.evaluate_cpp(df)
            mode = "C++ Native"
        else:
            scores = self.evaluate_vectorized_polars(df)
            mode = "NumPy Vectorized"
        t_end = time.perf_counter()
        
        batch_duration = t_end - t_start
        tps = size / batch_duration
        
        # 2. Add scores and outcomes back to Polars
        df = df.with_columns([
            pl.Series("risk_score", scores)
        ])
        
        # Determine Routing Outcomes
        # Risk Score 0–49: SAFE
        # Risk Score 50–79: SOFT_WARNING
        # Risk Score 80–94: STRONG_WARNING
        # Risk Score 95–100: CRITICAL_DELAY
        df = df.with_columns([
            pl.when(df["risk_score"] < 50).then(pl.lit("SAFE"))
            .when(df["risk_score"] < 80).then(pl.lit("SOFT_WARNING"))
            .when(df["risk_score"] < 95).then(pl.lit("STRONG_WARNING"))
            .otherwise(pl.lit("CRITICAL_DELAY"))
            .alias("routing_outcome")
        ])
        
        # Determine Tier 3 Cloud Escalations
        # If Risk Score is between 50 and 75 AND recent_phishing_sms_score is uncertain (0.40–0.65)
        df = df.with_columns([
            pl.Series("is_tier3_escalated", 
                (df["risk_score"] >= 50) & 
                (df["risk_score"] <= 75) & 
                (df["recent_phishing_sms_score"] >= 0.40) & 
                (df["recent_phishing_sms_score"] <= 0.65)
            )
        ])
        
        # 3. High-resolution latency profiling (run a sample of 10,000 transactions individually)
        sample_size = min(10000, size)
        sample_df = df.sample(n=sample_size, seed=42)
        
        # Extract features for single-record latency test
        amounts = sample_df["amount"].to_numpy()
        is_new_rec = sample_df["is_new_recipient"].to_numpy()
        flags = sample_df["community_spam_flags"].to_numpy()
        calls = sample_df["is_unknown_caller_active"].to_numpy()
        sms = sample_df["recent_phishing_sms_score"].to_numpy()
        
        latencies_ns = []
        
        # Run individual iterations using high-resolution timers
        for i in range(sample_size):
            t_s = time.perf_counter_ns()
            # Evaluate single record logic
            score = 0
            if flags[i] > 5:
                score += 40
            if calls[i]:
                score += 35
            if sms[i] > 0.70:
                score += 45
            if amounts[i] > 50000.0 and is_new_rec[i]:
                score += 25
            if score > 100:
                score = 100
            t_e = time.perf_counter_ns()
            latencies_ns.append(t_e - t_s)
            
        latencies_ns = np.array(latencies_ns)
        
        # Calculate Latency Percentiles (convert to microseconds)
        p50 = np.percentile(latencies_ns, 50) / 1000.0
        p90 = np.percentile(latencies_ns, 90) / 1000.0
        p99 = np.percentile(latencies_ns, 99) / 1000.0
        p99_99 = np.percentile(latencies_ns, 99.99) / 1000.0
        
        # 4. Compute Threat Metrics (Fraud Catch & False Positives)
        # Truth values
        is_fraud_truth = df["ground_truth_fraud"].to_numpy()
        is_flagged_unsafe = (scores >= 50) # any warning or delay is an intervention
        
        tp = np.sum(is_fraud_truth & is_flagged_unsafe)
        fp = np.sum((~is_fraud_truth) & is_flagged_unsafe)
        fn = np.sum(is_fraud_truth & (~is_flagged_unsafe))
        tn = np.sum((~is_fraud_truth) & (~is_flagged_unsafe))
        
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
        
        escalated_count = df["is_tier3_escalated"].sum()
        escalation_rate = escalated_count / size
        
        outcomes_counts = df["routing_outcome"].value_counts().to_dicts()
        outcomes_map = {item["routing_outcome"]: item["count"] for item in outcomes_counts}
        
        metrics = {
            "mode": mode,
            "total_records": size,
            "total_duration_sec": batch_duration,
            "throughput_tps": tps,
            "latency_p50_us": p50,
            "latency_p90_us": p90,
            "latency_p99_us": p99,
            "latency_p99_99_us": p99_99,
            "threat_metrics": {
                "true_positives": int(tp),
                "false_positives": int(fp),
                "false_negatives": int(fn),
                "true_negatives": int(tn),
                "recall_rate": recall,
                "false_positive_rate": fpr,
            },
            "tier_counts": {
                "safe": outcomes_map.get("SAFE", 0),
                "soft_warning": outcomes_map.get("SOFT_WARNING", 0),
                "strong_warning": outcomes_map.get("STRONG_WARNING", 0),
                "critical_delay": outcomes_map.get("CRITICAL_DELAY", 0),
            },
            "cloud_escalations": {
                "count": int(escalated_count),
                "rate": escalation_rate
            }
        }
        
        return metrics

if __name__ == "__main__":
    from generator import generate_transactions
    df = generate_transactions(100_000)
    evaluator = SentriFlowEvaluator()
    metrics = evaluator.run_benchmark(df)
    import json
    print(json.dumps(metrics, indent=2))
