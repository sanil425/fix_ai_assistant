"""
FIX MVP Main Module

Self-test runner for the FIX engine. Imports core functions from fix_engine.py
and runs the same validation tests to ensure everything works correctly.
"""

import json
from fix_engine import (
    build_fix,
    parse_fix, 
    validate_fix,
    explain_exec_report,
    lookup_tag,
    SpecsRegistry
)

# ---------- Self-check (only when run directly) ----------
if __name__ == "__main__":
    # Test the SpecsRegistry singleton
    registry = SpecsRegistry()
    print(json.dumps({
        "components": list(registry.specs["components"].keys()),
        "messages": list(registry.specs["messages"].keys()),
        "rulesLoaded": bool(registry.specs["rules"]),
        "orderStateLoaded": bool(registry.specs["order_state"])
    }, indent=2))

    # quick validate+build of a simple Limit Day D (uses only core fields)
    sample_d = {"11":"A1-001","54":"1","60":"2025-08-14T01:02:03Z","40":"2","44":125,"59":"0","55":"AAPL","38":100}
    v = validate_fix("D", sample_d)
    print("Validate D:", v)
    if v["ok"]:
        b = build_fix("D", sample_d)
        print("Build D (pretty):", b["pretty"])

    # quick explain of a PARTIAL ExecReport
    er_map = parse_fix("8=FIX.4.4|35=8|150=1|39=1|37=OID-1001|11=A1-001|54=1|38=1000|32=200|31=125.3|14=200|151=800|6=125.3|55=AAPL|10=000")
    print("Explain ER:", explain_exec_report(er_map))
