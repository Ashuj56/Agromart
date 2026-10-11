#!/usr/bin/env python3
"""
Cost-Aware GitOps Gate — Prometheus Cost Metrics Exporter
Reads data/cost_evaluation.json and exposes standard Prometheus metrics on HTTP port 9102
for ingestion by Prometheus and visualization in Grafana dashboards.
"""

import os
import sys
import json
import time
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = int(os.getenv("EXPORTER_PORT", "9102"))
EVAL_FILE = os.getenv("EVAL_FILE", "data/cost_evaluation.json")

def generate_prometheus_metrics():
    """Format cost evaluation data into Prometheus exposition text format."""
    if not os.path.exists(EVAL_FILE):
        return "# HELP gitops_cost_exporter_up Exporter status\n# TYPE gitops_cost_exporter_up gauge\ngitops_cost_exporter_up 0\n"

    try:
        with open(EVAL_FILE, "r") as f:
            data = json.load(f)
    except Exception as e:
        return f"# Error reading {EVAL_FILE}: {e}\n"

    lines = [
        "# HELP gitops_cost_current_spend_usd Month-to-date actual spend in USD",
        "# TYPE gitops_cost_current_spend_usd gauge",
    ]
    for ns, details in data.get("namespaces", {}).items():
        lines.append(f'gitops_cost_current_spend_usd{{namespace="{ns}"}} {details.get("current_spend_usd", 0.0)}')

    lines.extend([
        "# HELP gitops_cost_budget_limit_usd Monthly budget limit in USD from budgets.yaml",
        "# TYPE gitops_cost_budget_limit_usd gauge",
    ])
    for ns, details in data.get("namespaces", {}).items():
        lines.append(f'gitops_cost_budget_limit_usd{{namespace="{ns}"}} {details.get("budget_usd", 0.0)}')

    lines.extend([
        "# HELP gitops_cost_projected_total_usd Projected total monthly spend in USD",
        "# TYPE gitops_cost_projected_total_usd gauge",
    ])
    for ns, details in data.get("namespaces", {}).items():
        lines.append(f'gitops_cost_projected_total_usd{{namespace="{ns}"}} {details.get("projected_total_usd", 0.0)}')

    lines.extend([
        "# HELP gitops_cost_allocated_cpu_cores Total CPU cores requested by workloads",
        "# TYPE gitops_cost_allocated_cpu_cores gauge",
    ])
    for ns, details in data.get("namespaces", {}).items():
        lines.append(f'gitops_cost_allocated_cpu_cores{{namespace="{ns}"}} {details.get("allocated_cpu_cores", 0.0)}')

    lines.extend([
        "# HELP gitops_cost_allocated_memory_gib Total memory in GiB requested by workloads",
        "# TYPE gitops_cost_allocated_memory_gib gauge",
    ])
    for ns, details in data.get("namespaces", {}).items():
        lines.append(f'gitops_cost_allocated_memory_gib{{namespace="{ns}"}} {details.get("allocated_memory_gib", 0.0)}')

    lines.extend([
        "# HELP gitops_cost_gate_status Gate policy status (1 = PASS, 0 = DENY)",
        "# TYPE gitops_cost_gate_status gauge",
    ])
    for ns, details in data.get("namespaces", {}).items():
        val = 1 if details.get("status") in ("PASS", "WARN") else 0
        lines.append(f'gitops_cost_gate_status{{namespace="{ns}"}} {val}')

    lines.append("")
    return "\n".join(lines)

class MetricsHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path in ("/metrics", "/"):
            metrics_text = generate_prometheus_metrics()
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
            self.end_headers()
            self.wfile.write(metrics_text.encode("utf-8"))
        elif self.path == "/health":
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"OK")
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Quiet standard HTTP access logs
        return

def main():
    server = HTTPServer(("0.0.0.0", PORT), MetricsHandler)
    print(f"🚀 Prometheus Cost Exporter listening on http://0.0.0.0:{PORT}/metrics")
    print(f"   Reading evaluation data from: {EVAL_FILE}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Exporter shutting down gracefully.")
        server.server_close()

if __name__ == "__main__":
    main()
