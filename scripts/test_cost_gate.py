#!/usr/bin/env python3
"""
Cost-Aware GitOps Gate — Phase 8 End-to-End Validation Test Suite
Automates testing of the three critical gate scenarios:
  1. Standard Within-Budget Deployment (Expect: PASS)
  2. Over-Budget Resource Request (Expect: DENY / BLOCKED)
  3. Authorized Budget Exception Override (Expect: PASS via override)
"""

import os
import sys
import json
import subprocess
import tempfile
import shutil

def run_cmd(cmd):
    """Run a shell command and return returncode, stdout, stderr."""
    proc = subprocess.run(cmd, shell=True, text=True, capture_output=True)
    return proc.returncode, proc.stdout, proc.stderr

def print_banner(title):
    print("\n" + "=" * 70)
    print(f"🧪 {title}")
    print("=" * 70)

def main():
    print_banner("Starting Cost-Aware GitOps Gate Phase 8 Test Suite")
    tests_passed = 0
    total_tests = 3

    rc, out, _ = run_cmd("conftest --version")
    if rc != 0:
        print("❌ Error: 'conftest' command not found in PATH. Please ensure Conftest is installed.")
        sys.exit(1)
    print(f"✅ Found Conftest: {out.strip()}")

    print_banner("TEST 1: Evaluating Standard Within-Budget Deployment")
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        mock_eval = {
            "summary": {"overall_status": "PASS"},
            "namespaces": {
                "agromart": {
                    "budget_usd": 100.0,
                    "alert_threshold_pct": 80,
                    "alert_threshold_usd": 80.0,
                    "current_spend_usd": 24.50,
                    "workload_projected_usd": 16.39,
                    "projected_total_usd": 40.89,
                    "allocated_cpu_cores": 0.5,
                    "max_cpu_cores": 2.0,
                    "allocated_memory_gib": 0.5,
                    "max_memory_gib": 4.0,
                    "status": "PASS"
                }
            }
        }
        json.dump(mock_eval, f)
        test1_file = f.name

    rc, stdout, stderr = run_cmd(f"conftest test {test1_file} --policy policy/")
    os.remove(test1_file)

    if rc == 0:
        print("✅ TEST 1 PASSED: Within-budget deployment successfully permitted.")
        tests_passed += 1
    else:
        print(f"❌ TEST 1 FAILED: Expected PASS, got exit code {rc}.\nOutput:\n{stdout}\n{stderr}")

    print_banner("TEST 2: Evaluating Over-Budget PR (Breaching $100 Budget & 2.0 Cores)")
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        mock_breach = {
            "summary": {"overall_status": "DENY"},
            "namespaces": {
                "agromart": {
                    "budget_usd": 100.0,
                    "alert_threshold_pct": 80,
                    "alert_threshold_usd": 80.0,
                    "current_spend_usd": 24.50,
                    "workload_projected_usd": 140.00,
                    "projected_total_usd": 164.50,
                    "allocated_cpu_cores": 4.0,
                    "max_cpu_cores": 2.0,
                    "allocated_memory_gib": 4.0,
                    "max_memory_gib": 4.0,
                    "status": "DENY"
                }
            }
        }
        json.dump(mock_breach, f)
        test2_file = f.name

    rc, stdout, stderr = run_cmd(f"conftest test {test2_file} --policy policy/")
    os.remove(test2_file)

    if rc != 0 and "BUDGET BREACH" in stdout:
        print("✅ TEST 2 PASSED: Over-budget PR was successfully BLOCKED by OPA policy.")
        print(f"   Policy Denial Message:\n   {stdout.strip()}")
        tests_passed += 1
    else:
        print(f"❌ TEST 2 FAILED: Expected DENY with budget breach, got exit code {rc}.\nOutput:\n{stdout}")

    print_banner("TEST 3: Evaluating Authorized Override (exception_approved = true)")
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        mock_override = {
            "override": True,
            "summary": {"overall_status": "DENY"},
            "namespaces": {
                "agromart": {
                    "budget_usd": 100.0,
                    "alert_threshold_pct": 80,
                    "alert_threshold_usd": 80.0,
                    "current_spend_usd": 24.50,
                    "workload_projected_usd": 140.00,
                    "projected_total_usd": 164.50,
                    "allocated_cpu_cores": 4.0,
                    "max_cpu_cores": 2.0,
                    "allocated_memory_gib": 4.0,
                    "max_memory_gib": 4.0,
                    "status": "DENY"
                }
            }
        }
        json.dump(mock_override, f)
        test3_file = f.name

    rc, stdout, stderr = run_cmd(f"conftest test {test3_file} --policy policy/")
    os.remove(test3_file)

    if rc == 0:
        print("✅ TEST 3 PASSED: Authorized override successfully bypassed policy block.")
        tests_passed += 1
    else:
        print(f"❌ TEST 3 FAILED: Expected override to PASS, got exit code {rc}.\nOutput:\n{stdout}")

    print_banner(f"Test Suite Summary: {tests_passed}/{total_tests} Tests Passed")
    if tests_passed == total_tests:
        print("🎉 All Cost-Aware GitOps Gate policy test scenarios validated successfully!\n")
        sys.exit(0)
    else:
        print("⚠️ Some validation tests failed. Review policy rules in policy/cost_gate.rego.\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
