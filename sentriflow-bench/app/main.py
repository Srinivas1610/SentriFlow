import os
import sys
import json
import asyncio
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

# Add app folder to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from generator import generate_transactions
from evaluator import SentriFlowEvaluator

app = FastAPI(title="SentriFlow Simulation & Stress-Test Suite", version="1.0.0")

# Enable CORS for frontend clients (Flutter/React)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

evaluator = SentriFlowEvaluator()

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "SentriFlow Benchmarking SSE API",
        "engine_mode": evaluator.lib_path and "C++ Native" or "NumPy Vectorized",
        "endpoints": {
            "/api/bench/stream": "GET - SSE stream of 1M transaction simulation"
        }
    }

@app.get("/api/bench/stream")
async def stream_benchmark(request: Request):
    """
    Streams a live 1,000,000 transaction simulation & stress-test via Server-Sent Events (SSE).
    """
    async def event_generator():
        print("SSE client connected. Generating synthetic 1M dataset...")
        
        # Phase 1: Generation
        yield {
            "event": "status",
            "data": json.dumps({"status": "generating", "message": "Synthesizing 1,000,000 records with 2.0% fraud base..."})
        }
        
        # Yield time to let event send
        await asyncio.sleep(0.1)
        
        try:
            # Generate full 1,000,000 records
            loop = asyncio.get_event_loop()
            df = await loop.run_in_executor(None, generate_transactions, 1_000_000)
            print("Dataset generation complete. Starting chunked evaluation...")
        except Exception as e:
            yield {
                "event": "error",
                "data": json.dumps({"status": "error", "message": f"Data generation failed: {str(e)}"})
            }
            return
            
        yield {
            "event": "status",
            "data": json.dumps({"status": "ready", "message": "Dataset generated successfully. Initiating stress-test..."})
        }
        await asyncio.sleep(0.5)

        total_records = len(df)
        chunk_size = 20_000
        n_chunks = total_records // chunk_size
        
        # Cumulative stats
        cum_safe = 0
        cum_soft = 0
        cum_strong = 0
        cum_critical = 0
        cum_escalations = 0
        cum_tp = 0
        cum_fp = 0
        cum_fn = 0
        cum_tn = 0
        
        # Pre-profile latencies from the evaluator sample to ensure high-resolution stats are live
        # We run the sample once to get clean percentiles
        sample_metrics = evaluator.run_benchmark(df.sample(n=10000, seed=42))
        p50 = sample_metrics["latency_p50_us"]
        p90 = sample_metrics["latency_p90_us"]
        p99 = sample_metrics["latency_p99_us"]
        p99_99 = sample_metrics["latency_p99_99_us"]

        # Loop and evaluate chunk by chunk
        for i in range(n_chunks):
            # Check if client disconnected
            if await request.is_disconnected():
                print("SSE client disconnected early.")
                break
                
            start_idx = i * chunk_size
            end_idx = start_idx + chunk_size
            
            # Slice chunk using Polars
            chunk_df = df.slice(start_idx, chunk_size)
            
            # Evaluate chunk
            t_s = asyncio.get_event_loop().time()
            if evaluator.lib:
                scores = evaluator.evaluate_cpp(chunk_df)
            else:
                scores = evaluator.evaluate_vectorized_polars(chunk_df)
            t_e = asyncio.get_event_loop().time()
            
            chunk_duration = t_e - t_s
            chunk_tps = chunk_size / chunk_duration if chunk_duration > 0 else 0.0
            
            # Calculate cumulative metrics
            ground_truth = chunk_df["ground_truth_fraud"].to_numpy()
            is_new = chunk_df["is_new_recipient"].to_numpy()
            sms = chunk_df["recent_phishing_sms_score"].to_numpy()
            
            # Intervention classification
            is_flagged_unsafe = (scores >= 50)
            
            tp = int(sum(ground_truth & is_flagged_unsafe))
            fp = int(sum((~ground_truth) & is_flagged_unsafe))
            fn = int(sum(ground_truth & (~is_flagged_unsafe)))
            tn = int(sum((~ground_truth) & (~is_flagged_unsafe)))
            
            cum_tp += tp
            cum_fp += fp
            cum_fn += fn
            cum_tn += tn
            
            # Count routing tiers
            safe = int(sum(scores < 50))
            soft = int(sum((scores >= 50) & (scores < 80)))
            strong = int(sum((scores >= 80) & (scores < 95)))
            crit = int(sum(scores >= 95))
            
            cum_safe += safe
            cum_soft += soft
            cum_strong += strong
            cum_critical += crit
            
            # Count Cloud Escalations
            escalated = int(sum(
                (scores >= 50) & 
                (scores <= 75) & 
                (sms >= 0.40) & 
                (sms <= 0.65)
            ))
            cum_escalations += escalated
            
            progress_pct = ((i + 1) / n_chunks) * 100.0
            processed = (i + 1) * chunk_size
            
            # Live Metrics JSON
            payload = {
                "chunk": i + 1,
                "total_chunks": n_chunks,
                "progress_pct": round(progress_pct, 1),
                "processed_count": processed,
                "throughput_tps": round(chunk_tps, 2),
                "latency_p50_us": p50,
                "latency_p90_us": p90,
                "latency_p99_us": p99,
                "latency_p99_99_us": p99_99,
                "threat_metrics": {
                    "true_positives": cum_tp,
                    "false_positives": cum_fp,
                    "false_negatives": cum_fn,
                    "true_negatives": cum_tn,
                    "recall_rate": round(cum_tp / (cum_tp + cum_fn) * 100.0, 2) if (cum_tp + cum_fn) > 0 else 0.0,
                    "false_positive_rate": round(cum_fp / (cum_fp + cum_tn) * 100.0, 4) if (cum_fp + cum_tn) > 0 else 0.0,
                },
                "tier_counts": {
                    "safe": cum_safe,
                    "soft_warning": cum_soft,
                    "strong_warning": cum_strong,
                    "critical_delay": cum_critical,
                },
                "cloud_escalations": {
                    "count": cum_escalations,
                    "rate": round(cum_escalations / processed * 100.0, 4)
                }
            }
            
            yield {
                "event": "update",
                "data": json.dumps(payload)
            }
            
            # Brief delay to animate streaming on frontend
            await asyncio.sleep(0.08)

        # Final Summary Event
        if not await request.is_disconnected():
            final_payload = {
                "status": "completed",
                "mode": evaluator.lib_path and "C++ Native" or "NumPy Vectorized",
                "total_records": total_records,
                "recall_rate": round(cum_tp / (cum_tp + cum_fn) * 100.0, 2) if (cum_tp + cum_fn) > 0 else 0.0,
                "false_positive_rate": round(cum_fp / (cum_fp + cum_tn) * 100.0, 4) if (cum_fp + cum_tn) > 0 else 0.0,
                "cloud_escalations": {
                    "count": cum_escalations,
                    "rate": round(cum_escalations / total_records * 100.0, 4)
                },
                "latency_p50_us": p50,
                "latency_p90_us": p90,
                "latency_p99_us": p99,
                "latency_p99_99_us": p99_99,
                "tier_counts": {
                    "safe": cum_safe,
                    "soft_warning": cum_soft,
                    "strong_warning": cum_strong,
                    "critical_delay": cum_critical
                }
            }
            yield {
                "event": "summary",
                "data": json.dumps(final_payload)
            }
            print("SSE stream completed successfully.")

    return EventSourceResponse(event_generator())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
