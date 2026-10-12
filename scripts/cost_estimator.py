#!/usr/bin/env python3
"""
Cost-Aware GitOps Gate — Projected Cost Estimator
Calculates projected monthly compute cost for Kubernetes workloads based on
CPU requests, memory requests, and replica counts, combining it with actual
Month-To-Date spend to generate data/cost_evaluation.json for policy evaluation.
"""

import os
import sys
import json
import re
import argparse
from datetime import datetime, timezone

# ── AWS Pricing Constants (US-East-1 Standard Rates) ──────────────────────────
# Formula: Hourly rate * 730 hours/month
# AWS General Purpose vCPU: ~$0.04048/hour -> ~$29.55/month
# AWS General Purpose RAM:  ~$0.004445/GB-hour -> ~$3.24/month
CPU_MONTHLY_RATE_USD = 29.55
RAM_MONTHLY_RATE_USD = 3.24

def parse_cpu(cpu_str):
    """Convert Kubernetes CPU string (e.g., '250m', '1', '0.5') to float cores."""
    if not cpu_str:
        return 0.1  
    s = str(cpu_str).strip()
    if s.endswith("m"):
        return float(s[:-1]) / 1000.0
    return float(s)

def parse_memory_gib(mem_str):
    """Convert Kubernetes memory string (e.g., '256Mi', '1Gi', '512M') to float GiB."""
    if not mem_str:
        return 0.128 
    s = str(mem_str).strip()
    if s.endswith("Gi"):
        return float(s[:-2])
    if s.endswith("G"):
        return float(s[:-1]) * 0.931
    if s.endswith("Mi"):
        return float(s[:-2]) / 1024.0
    if s.endswith("M"):
        return float(s[:-1]) / 1000.0
    return float(s) / (1024.0 ** 3)

def load_yaml_simple(filepath):
    try:
        import yaml
        with open(filepath, "r") as f:
            return yaml.safe_load(f)
    except ImportError:
        # Fallback parser if PyYAML isn't installed
        with open(filepath, "r") as f:
            content = f.read()
        return content

def scan_workloads(gitops_dir):
    """Scan all YAML deployment manifests in gitops/ and aggregate resources per namespace."""
    import yaml

    workloads_by_namespace = {}

    for root, _, files in os.walk(gitops_dir):
        for file in files:
            if not file.endswith((".yaml", ".yml")):
                continue
            if file in ("budgets.yaml", "argocd-app.yaml", "service-account.yaml", "namespace.yaml"):
                continue

            filepath = os.path.join(root, file)
            with open(filepath, "r") as f:
                try:
                    docs = yaml.safe_load_all(f)
                    for doc in docs:
                        if not doc or doc.get("kind") != "Deployment":
                            continue

                        metadata = doc.get("metadata", {})
                        namespace = metadata.get("namespace", "default")
                        name = metadata.get("name", file)

                        spec = doc.get("spec", {})
                        replicas = int(spec.get("replicas", 1))

                        pod_spec = spec.get("template", {}).get("spec", {})
                        containers = pod_spec.get("containers", [])

                        total_dep_cpu = 0.0
                        total_dep_mem = 0.0

                        for c in containers:
                            resources = c.get("resources", {})
                            requests = resources.get("requests", {})
                            cpu = parse_cpu(requests.get("cpu", "100m"))
                            mem = parse_memory_gib(requests.get("memory", "128Mi"))
                            total_dep_cpu += cpu
                            total_dep_mem += mem

                        # Multiply by replicas
                        dep_cpu = round(total_dep_cpu * replicas, 3)
                        dep_mem = round(total_dep_mem * replicas, 3)

                        if namespace not in workloads_by_namespace:
                            workloads_by_namespace[namespace] = {
                                "cpu_cores": 0.0,
                                "memory_gib": 0.0,
                                "deployments": []
                            }

                        workloads_by_namespace[namespace]["cpu_cores"] += dep_cpu
                        workloads_by_namespace[namespace]["memory_gib"] += dep_mem
                        workloads_by_namespace[namespace]["deployments"].append({
                            "name": name,
                            "replicas": replicas,
                            "cpu_cores": dep_cpu,
                            "memory_gib": dep_mem
                        })
                except Exception as e:
                    print(f"⚠️  Skipping {file} due to parsing warning: {e}")

    return workloads_by_namespace

def main():
    parser = argparse.ArgumentParser(description="Estimate projected monthly costs from GitOps manifests.")
    parser.add_argument("--gitops-dir", default="gitops", help="Path to gitops manifests directory")
    parser.add_argument("--budgets-file", default="gitops/budgets.yaml", help="Path to budgets.yaml")
    parser.add_argument("--spend-file", default="data/current_spend.json", help="Path to current_spend.json")
    parser.add_argument("--output", default="data/cost_evaluation.json", help="Path for evaluation output")
    args = parser.parse_args()

    # 1. Load Budgets
    import yaml
    if not os.path.exists(args.budgets_file):
        print(f"❌ Error: Budgets file not found at {args.budgets_file}")
        sys.exit(1)

    with open(args.budgets_file, "r") as f:
        budgets_doc = yaml.safe_load(f)
    budget_map = {item["name"]: item for item in budgets_doc.get("namespaces", [])}

    # 2. Load Current MTD Spend
    current_spend_map = {}
    if os.path.exists(args.spend_file):
        with open(args.spend_file, "r") as f:
            spend_data = json.load(f)
            current_spend_map = spend_data.get("namespaces", {})
    else:
        print(f"ℹ️  Spend file not found at {args.spend_file}. Using $0.00 MTD baseline.")

    # 3. Scan Workloads
    workloads = scan_workloads(args.gitops_dir)

    # 4. Compute Evaluation
    evaluation = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total_budget_usd": 0.0,
            "total_current_spend_usd": 0.0,
            "total_projected_usd": 0.0,
            "overall_status": "PASS"
        },
        "namespaces": {}
    }

    all_namespaces = set(budget_map.keys()).union(set(workloads.keys()))

    for ns in sorted(all_namespaces):
        b = budget_map.get(ns, {
            "monthly_budget_usd": 100.0,
            "alert_threshold_pct": 80,
            "max_cpu_cores": 4.0,
            "max_memory_gib": 8.0
        })

        wl = workloads.get(ns, {"cpu_cores": 0.0, "memory_gib": 0.0, "deployments": []})
        cpu_cores = round(wl["cpu_cores"], 2)
        memory_gib = round(wl["memory_gib"], 2)

        # Workload monthly projected cost
        workload_cost = round((cpu_cores * CPU_MONTHLY_RATE_USD) + (memory_gib * RAM_MONTHLY_RATE_USD), 2)

        # Current MTD spend
        current_spend = current_spend_map.get(ns, 0.0)

        # Total projected
        projected_total = round(current_spend + workload_cost, 2)
        budget_limit = float(b.get("monthly_budget_usd", 100.0))
        alert_threshold_pct = float(b.get("alert_threshold_pct", 80))
        alert_limit = round(budget_limit * (alert_threshold_pct / 100.0), 2)
        max_cpu = float(b.get("max_cpu_cores", 4.0))
        max_mem = float(b.get("max_memory_gib", 8.0))

        # Status check
        if projected_total > budget_limit or cpu_cores > max_cpu or memory_gib > max_mem:
            status = "DENY"
            evaluation["summary"]["overall_status"] = "DENY"
        elif projected_total >= alert_limit:
            status = "WARN"
            if evaluation["summary"]["overall_status"] != "DENY":
                evaluation["summary"]["overall_status"] = "WARN"
        else:
            status = "PASS"

        evaluation["namespaces"][ns] = {
            "budget_usd": budget_limit,
            "alert_threshold_pct": alert_threshold_pct,
            "alert_threshold_usd": alert_limit,
            "current_spend_usd": current_spend,
            "workload_projected_usd": workload_cost,
            "projected_total_usd": projected_total,
            "allocated_cpu_cores": cpu_cores,
            "max_cpu_cores": max_cpu,
            "allocated_memory_gib": memory_gib,
            "max_memory_gib": max_mem,
            "status": status,
            "deployments": wl.get("deployments", [])
        }

        evaluation["summary"]["total_budget_usd"] += budget_limit
        evaluation["summary"]["total_current_spend_usd"] += current_spend
        evaluation["summary"]["total_projected_usd"] += projected_total

    # Round totals
    evaluation["summary"]["total_budget_usd"] = round(evaluation["summary"]["total_budget_usd"], 2)
    evaluation["summary"]["total_current_spend_usd"] = round(evaluation["summary"]["total_current_spend_usd"], 2)
    evaluation["summary"]["total_projected_usd"] = round(evaluation["summary"]["total_projected_usd"], 2)

    # 5. Write Output JSON
    out_dir = os.path.dirname(args.output)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    with open(args.output, "w") as f:
        json.dump(evaluation, f, indent=2)

    print(f"📊 Cost evaluation completed -> {args.output}")
    print(f"   Overall Status: {evaluation['summary']['overall_status']}")
    for ns, details in evaluation["namespaces"].items():
        print(f"   - [{details['status']}] {ns}: ${details['projected_total_usd']:.2f} / ${details['budget_usd']:.2f} (CPU: {details['allocated_cpu_cores']}/{details['max_cpu_cores']} cores, RAM: {details['allocated_memory_gib']}/{details['max_memory_gib']} GiB)")

if __name__ == "__main__":
    main()
