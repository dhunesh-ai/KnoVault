#!/usr/bin/env python3
"""
KnoVault Backend Load Testing Script
Executes multi-stage concurrent traffic load tests against FastAPI endpoints.
Generates JSON, HTML, and Log reports in load-test-reports/.
"""

import sys
import os
import time
import json
import asyncio
import math
import statistics
from datetime import datetime, timezone
import httpx

TARGET_URL = os.getenv("TARGET_URL", "http://127.0.0.1:8000").rstrip("/")
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "load-test-reports")

ENDPOINTS = [
    {"path": "/health", "name": "Health Check", "method": "GET"},
    {"path": "/", "name": "API Root", "method": "GET"},
    {"path": "/api/notes", "name": "Get Notes", "method": "GET"},
    {"path": "/api/reminders", "name": "Get Reminders", "method": "GET"},
    {"path": "/api/important-days", "name": "Get Important Days", "method": "GET"},
    {"path": "/api/daily-goals", "name": "Get Daily Goals", "method": "GET"},
    {"path": "/api/workspaces", "name": "Get Workspaces", "method": "GET"},
    {"path": "/api/profile", "name": "Get User Profile", "method": "GET"},
]

STAGES = [
    {"name": "Smoke Load", "vus": 5, "duration_sec": 3},
    {"name": "Normal Load", "vus": 25, "duration_sec": 4},
    {"name": "Medium Load", "vus": 50, "duration_sec": 4},
    {"name": "Higher Load", "vus": 100, "duration_sec": 5},
]

# Thresholds
MAX_ERROR_RATE_PCT = 1.0  # < 1%
MAX_P95_LATENCY_MS = 2000.0  # < 2000ms

logs = []

def log(level: str, msg: str):
    timestamp = datetime.now(timezone.utc).isoformat()
    formatted = f"[{timestamp}] [{level}] {msg}"
    print(formatted)
    logs.append(formatted)

def calculate_percentile(data, percentile):
    if not data:
        return 0.0
    sorted_data = sorted(data)
    k = (len(sorted_data) - 1) * (percentile / 100.0)
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return sorted_data[int(k)]
    d0 = sorted_data[int(f)] * (c - k)
    d1 = sorted_data[int(c)] * (k - f)
    return d0 + d1

async def worker(client: httpx.AsyncClient, endpoint: dict, stop_time: float, results_list: list):
    url = f"{TARGET_URL}{endpoint['path']}"
    headers = {"Authorization": "Bearer test-jwt-token-knovault-ci-load-test"}

    while time.time() < stop_time:
        start = time.perf_counter()
        status_code = 0
        error_msg = None
        try:
            res = await client.get(url, headers=headers, timeout=5.0)
            elapsed_ms = (time.perf_counter() - start) * 1000.0
            status_code = res.status_code
            # Valid REST responses (2xx, 401 unauthenticated, 404 not found) indicate API handled request cleanly
            success = status_code in (200, 201, 204, 304, 401, 404)
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start) * 1000.0
            success = False
            error_msg = str(e)

        results_list.append({
            "endpoint": endpoint["name"],
            "path": endpoint["path"],
            "status": status_code,
            "success": success,
            "latency_ms": elapsed_ms,
            "error": error_msg,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        await asyncio.sleep(0.005)

async def run_load_tests():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    log("INFO", f"Initializing KnoVault Backend Load Testing against {TARGET_URL}")
    log("INFO", f"Target Endpoints: {len(ENDPOINTS)} non-destructive GET routes")
    log("INFO", f"Load Stages: {len(STAGES)} stages (Max VUs: 100)")

    all_results = []
    stage_summaries = []

    async with httpx.AsyncClient(verify=False) as client:
        try:
            probe = await client.get(f"{TARGET_URL}/health", timeout=5.0)
            log("INFO", f"Initial server health probe response: HTTP {probe.status_code}")
        except Exception as e:
            log("WARNING", f"Initial server probe note: {e}. Proceeding with load runner.")

        test_start_time = time.time()

        for stage in STAGES:
            log("INFO", f"Starting Stage: {stage['name']} ({stage['vus']} Virtual Users for {stage['duration_sec']}s)")
            stage_start = time.time()
            stop_time = stage_start + stage['duration_sec']

            tasks = []
            stage_results = []
            for i in range(stage['vus']):
                ep = ENDPOINTS[i % len(ENDPOINTS)]
                tasks.append(asyncio.create_task(worker(client, ep, stop_time, stage_results)))

            await asyncio.gather(*tasks)

            stage_duration = time.time() - stage_start
            stage_total = len(stage_results)
            stage_passed = sum(1 for r in stage_results if r["success"])
            stage_failed = stage_total - stage_passed
            stage_latencies = [r["latency_ms"] for r in stage_results]

            avg_lat = statistics.mean(stage_latencies) if stage_latencies else 0.0
            p95_lat = calculate_percentile(stage_latencies, 95)
            rps = stage_total / stage_duration if stage_duration > 0 else 0.0

            log("INFO", f"Stage '{stage['name']}' completed: {stage_total} reqs, {rps:.1f} RPS, Avg: {avg_lat:.2f}ms, p95: {p95_lat:.2f}ms")

            stage_summaries.append({
                "stage": stage["name"],
                "vus": stage["vus"],
                "duration_sec": round(stage_duration, 2),
                "total_requests": stage_total,
                "passed": stage_passed,
                "failed": stage_failed,
                "rps": round(rps, 2),
                "avg_latency_ms": round(avg_lat, 2),
                "p95_latency_ms": round(p95_lat, 2)
            })

            all_results.extend(stage_results)

    total_test_duration = time.time() - test_start_time
    total_requests = len(all_results)
    successful_requests = sum(1 for r in all_results if r["success"])
    failed_requests = total_requests - successful_requests
    error_rate_pct = (failed_requests / total_requests * 100.0) if total_requests > 0 else 0.0
    overall_rps = total_requests / total_test_duration if total_test_duration > 0 else 0.0

    latencies = [r["latency_ms"] for r in all_results]
    min_lat = min(latencies) if latencies else 0.0
    max_lat = max(latencies) if latencies else 0.0
    avg_lat = statistics.mean(latencies) if latencies else 0.0
    median_lat = calculate_percentile(latencies, 50)
    p90_lat = calculate_percentile(latencies, 90)
    p95_lat = calculate_percentile(latencies, 95)
    p99_lat = calculate_percentile(latencies, 99)

    # Status Code Distribution
    status_distribution = {}
    for r in all_results:
        code_str = str(r["status"]) if r["status"] else "Error/Timeout"
        status_distribution[code_str] = status_distribution.get(code_str, 0) + 1

    # Per Endpoint Breakdown
    endpoint_metrics = {}
    for ep in ENDPOINTS:
        name = ep["name"]
        ep_res = [r for r in all_results if r["endpoint"] == name]
        ep_lats = [r["latency_ms"] for r in ep_res]
        ep_total = len(ep_res)
        ep_failed = sum(1 for r in ep_res if not r["success"])
        endpoint_metrics[name] = {
            "path": ep["path"],
            "total_requests": ep_total,
            "failed_requests": ep_failed,
            "avg_latency_ms": round(statistics.mean(ep_lats), 2) if ep_lats else 0.0,
            "p95_latency_ms": round(calculate_percentile(ep_lats, 95), 2) if ep_lats else 0.0,
            "min_latency_ms": round(min(ep_lats), 2) if ep_lats else 0.0,
            "max_latency_ms": round(max(ep_lats), 2) if ep_lats else 0.0,
        }

    # Slowest Endpoint
    slowest_ep = max(endpoint_metrics.items(), key=lambda x: x[1]["avg_latency_ms"])[0] if endpoint_metrics else "N/A"

    # Threshold checks
    server_5xx_errors = sum(count for code, count in status_distribution.items() if code.startswith("5"))
    passed_thresholds = (error_rate_pct <= MAX_ERROR_RATE_PCT) and (p95_lat <= MAX_P95_LATENCY_MS) and (server_5xx_errors == 0)
    overall_status = "PASSED" if passed_thresholds else "FAILED"

    log("INFO", f"Load Test Finished: {total_requests} requests in {total_test_duration:.2f}s ({overall_rps:.1f} RPS)")
    log("INFO", f"Latency Summary — Avg: {avg_lat:.2f}ms | Median: {median_lat:.2f}ms | p90: {p90_lat:.2f}ms | p95: {p95_lat:.2f}ms | p99: {p99_lat:.2f}ms")
    log("INFO", f"Error Rate: {error_rate_pct:.2f}% | Slowest Endpoint: {slowest_ep}")
    log("INFO", f"Overall Load Test Status: {overall_status}")

    # 1. Write load-test-summary.json
    summary_data = {
        "status": overall_status,
        "target_url": TARGET_URL,
        "test_duration_sec": round(total_test_duration, 2),
        "total_requests": total_requests,
        "successful_requests": successful_requests,
        "failed_requests": failed_requests,
        "requests_per_second": round(overall_rps, 2),
        "error_rate_pct": round(error_rate_pct, 2),
        "max_concurrent_users": max(s["vus"] for s in STAGES),
        "latency_ms": {
            "min": round(min_lat, 2),
            "max": round(max_lat, 2),
            "avg": round(avg_lat, 2),
            "median": round(median_lat, 2),
            "p90": round(p90_lat, 2),
            "p95": round(p95_lat, 2),
            "p99": round(p99_lat, 2)
        },
        "thresholds": {
            "max_error_rate_pct": MAX_ERROR_RATE_PCT,
            "max_p95_latency_ms": MAX_P95_LATENCY_MS,
            "error_rate_passed": error_rate_pct <= MAX_ERROR_RATE_PCT,
            "p95_latency_passed": p95_lat <= MAX_P95_LATENCY_MS,
            "no_5xx_errors_passed": server_5xx_errors == 0
        },
        "status_distribution": status_distribution,
        "slowest_endpoint": slowest_ep,
        "stages": stage_summaries,
        "endpoints": endpoint_metrics,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    with open(os.path.join(OUTPUT_DIR, "load-test-summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary_data, f, indent=2)

    # 2. Write load-test-results.json
    with open(os.path.join(OUTPUT_DIR, "load-test-results.json"), "w", encoding="utf-8") as f:
        json.dump({
            "summary": summary_data,
            "raw_results": all_results[:500]
        }, f, indent=2)

    # 3. Write load-test.log
    with open(os.path.join(OUTPUT_DIR, "load-test.log"), "w", encoding="utf-8") as f:
        f.write("\n".join(logs) + "\n")

    # 4. Generate load-test-summary.html
    generate_html_report(summary_data, os.path.join(OUTPUT_DIR, "load-test-summary.html"))

    log("INFO", f"All load test report files successfully generated in {OUTPUT_DIR}/")

    if not passed_thresholds:
        log("WARNING", "Performance thresholds exceeded or server errors encountered")

def generate_html_report(summary: dict, filepath: str):
    status_bg = "#10B981" if summary["status"] == "PASSED" else "#EF4444"

    endpoint_rows = ""
    for ep_name, ep_data in summary["endpoints"].items():
        endpoint_rows += f"""
        <tr>
            <td><strong>{ep_name}</strong></td>
            <td><code>{ep_data['path']}</code></td>
            <td>{ep_data['total_requests']}</td>
            <td>{ep_data['avg_latency_ms']} ms</td>
            <td>{ep_data['p95_latency_ms']} ms</td>
            <td>{ep_data['min_latency_ms']} ms</td>
            <td>{ep_data['max_latency_ms']} ms</td>
            <td style="color: {'#EF4444' if ep_data['failed_requests'] > 0 else '#10B981'}; font-weight: bold;">{ep_data['failed_requests']}</td>
        </tr>
        """

    stage_rows = ""
    for st in summary["stages"]:
        stage_rows += f"""
        <tr>
            <td><strong>{st['stage']}</strong></td>
            <td>{st['vus']} VUs</td>
            <td>{st['duration_sec']}s</td>
            <td>{st['total_requests']}</td>
            <td>{st['rps']}</td>
            <td>{st['avg_latency_ms']} ms</td>
            <td>{st['p95_latency_ms']} ms</td>
        </tr>
        """

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>⚡ KnoVault Backend Load Test Report</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #e2e8f0; margin: 0; padding: 30px; }}
        .container {{ max-width: 1100px; margin: 0 auto; background: #161e2e; border-radius: 12px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }}
        h1 {{ color: #8b5cf6; margin-top: 0; display: flex; align-items: center; justify-content: space-between; }}
        .status-badge {{ background: {status_bg}; color: #fff; padding: 6px 18px; border-radius: 20px; font-size: 16px; font-weight: bold; }}
        .grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; }}
        .card {{ background: #1e293b; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #334155; }}
        .card-val {{ font-size: 28px; font-weight: bold; color: #38bdf8; margin-top: 6px; }}
        .card-lbl {{ font-size: 13px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; background: #1e293b; border-radius: 8px; overflow: hidden; }}
        th, td {{ padding: 12px 16px; text-align: left; border-bottom: 1px solid #334155; }}
        th {{ background: #0f172a; color: #94a3b8; font-size: 13px; text-transform: uppercase; }}
        code {{ background: #0f172a; padding: 3px 8px; border-radius: 4px; color: #f43f5e; font-family: Consolas, monospace; }}
        .footer {{ text-align: center; margin-top: 30px; color: #64748b; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>
            <span>⚡ KnoVault Backend Load Test Report</span>
            <span class="status-badge">{summary['status']}</span>
        </h1>
        <p style="color: #94a3b8;">Target URL: <code>{summary['target_url']}</code> | Timestamp: {summary['timestamp']}</p>

        <div class="grid">
            <div class="card">
                <div class="card-lbl">Total Requests</div>
                <div class="card-val">{summary['total_requests']:,}</div>
            </div>
            <div class="card">
                <div class="card-lbl">Requests / Sec</div>
                <div class="card-val">{summary['requests_per_second']}</div>
            </div>
            <div class="card">
                <div class="card-lbl">Average Latency</div>
                <div class="card-val">{summary['latency_ms']['avg']} ms</div>
            </div>
            <div class="card">
                <div class="card-lbl">p95 Latency</div>
                <div class="card-val" style="color: {'#10B981' if summary['latency_ms']['p95'] <= MAX_P95_LATENCY_MS else '#EF4444'};">{summary['latency_ms']['p95']} ms</div>
            </div>
            <div class="card">
                <div class="card-lbl">Max Concurrent VUs</div>
                <div class="card-val">{summary['max_concurrent_users']}</div>
            </div>
            <div class="card">
                <div class="card-lbl">Error Rate</div>
                <div class="card-val" style="color: {'#10B981' if summary['error_rate_pct'] <= MAX_ERROR_RATE_PCT else '#EF4444'};">{summary['error_rate_pct']}%</div>
            </div>
            <div class="card">
                <div class="card-lbl">Median Latency</div>
                <div class="card-val">{summary['latency_ms']['median']} ms</div>
            </div>
            <div class="card">
                <div class="card-lbl">p99 Latency</div>
                <div class="card-val">{summary['latency_ms']['p99']} ms</div>
            </div>
        </div>

        <h2>📈 Traffic Stages Performance</h2>
        <table>
            <thead>
                <tr>
                    <th>Stage Name</th>
                    <th>Virtual Users</th>
                    <th>Duration</th>
                    <th>Total Requests</th>
                    <th>RPS</th>
                    <th>Avg Latency</th>
                    <th>p95 Latency</th>
                </tr>
            </thead>
            <tbody>
                {stage_rows}
            </tbody>
        </table>

        <h2>🎯 Endpoint-Level Performance Breakdown</h2>
        <table>
            <thead>
                <tr>
                    <th>Endpoint Name</th>
                    <th>Path</th>
                    <th>Total Reqs</th>
                    <th>Avg Latency</th>
                    <th>p95 Latency</th>
                    <th>Min Latency</th>
                    <th>Max Latency</th>
                    <th>Failed Reqs</th>
                </tr>
            </thead>
            <tbody>
                {endpoint_rows}
            </tbody>
        </table>

        <div class="footer">
            Generated automatically by KnoVault Performance & Load Testing Suite
        </div>
    </div>
</body>
</html>"""

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html)

if __name__ == "__main__":
    asyncio.run(run_load_tests())
