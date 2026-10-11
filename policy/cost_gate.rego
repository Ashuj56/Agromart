package main

# Default policy: allow deployment unless a deny rule matches
default allow = false

# ── DENY Rules (Block CI / Deployment) ────────────────────────────────────────

# 1. Block if projected spend breaches the namespace budget
deny[msg] {
    some ns
    ns_data := input.namespaces[ns]
    ns_data.projected_total_usd > ns_data.budget_usd
    not exception_approved
    msg := sprintf("❌ [BUDGET BREACH] Namespace '%v' projected spend ($%.2f) exceeds monthly budget ($%.2f) by $%.2f", [
        ns,
        ns_data.projected_total_usd,
        ns_data.budget_usd,
        ns_data.projected_total_usd - ns_data.budget_usd
    ])
}

# 2. Block if allocated CPU cores exceed the namespace ceiling
deny[msg] {
    some ns
    ns_data := input.namespaces[ns]
    ns_data.allocated_cpu_cores > ns_data.max_cpu_cores
    not exception_approved
    msg := sprintf("❌ [CPU LIMIT EXCEEDED] Namespace '%v' requested %.2f CPU cores, but maximum allowed is %.2f cores", [
        ns,
        ns_data.allocated_cpu_cores,
        ns_data.max_cpu_cores
    ])
}

# 3. Block if allocated memory exceeds the namespace ceiling
deny[msg] {
    some ns
    ns_data := input.namespaces[ns]
    ns_data.allocated_memory_gib > ns_data.max_memory_gib
    not exception_approved
    msg := sprintf("❌ [MEMORY LIMIT EXCEEDED] Namespace '%v' requested %.2f GiB memory, but maximum allowed is %.2f GiB", [
        ns,
        ns_data.allocated_memory_gib,
        ns_data.max_memory_gib
    ])
}

# ── WARN Rules (Flag PR for review, but do not block) ─────────────────────────

warn[msg] {
    some ns
    ns_data := input.namespaces[ns]
    ns_data.projected_total_usd >= ns_data.alert_threshold_usd
    ns_data.projected_total_usd <= ns_data.budget_usd
    msg := sprintf("⚠️ [BUDGET WARNING] Namespace '%v' is at %.1f%% of budget ($%.2f / $%.2f). Alert threshold is %v%% ($%.2f).", [
        ns,
        (ns_data.projected_total_usd / ns_data.budget_usd) * 100,
        ns_data.projected_total_usd,
        ns_data.budget_usd,
        ns_data.alert_threshold_pct,
        ns_data.alert_threshold_usd
    ])
}

# ── EXCEPTION / OVERRIDE Logic ────────────────────────────────────────────────

# An authorized exception flag or label can bypass the cost block
exception_approved {
    input.override == true
}

# Allow rule passes when there are zero denials (or exception is approved)
allow {
    count(deny) == 0
}
