"""
FIX Engine Core Module

Provides core FIX protocol functionality including parsing, validation, building,
and execution report explanation. Uses a singleton SpecsRegistry for efficient
JSON spec loading.
"""

import json
import os
import re
from typing import Dict, Any, List, Optional, Union

SOH = "\x01"


class SpecsRegistry:
    """Singleton registry for FIX knowledge base specs."""
    
    _instance = None
    _specs = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SpecsRegistry, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._specs is None:
            self._specs = self._load_specs()
    
    def _load_specs(self) -> Dict[str, Any]:
        """Load all JSON specs from the knowledge base directory."""
        # Try relative paths first, then absolute paths
        possible_paths = [
            "specs/fix_knowledge/fix4.4",
            "backend/specs/fix_knowledge/fix4.4",
            os.path.join(os.path.dirname(__file__), "specs/fix_knowledge/fix4.4")
        ]
        
        base_dir = None
        for path in possible_paths:
            if os.path.isdir(path):
                base_dir = path
                break
                
        if not base_dir:
            raise FileNotFoundError(f"Knowledge dir not found. Tried: {', '.join(possible_paths)}")
        
        # fields or core_fields
        fields_path = None
        for cand in ("fields.json", "core_fields.json"):
            p = os.path.join(base_dir, cand)
            if os.path.isfile(p):
                fields_path = p
                break
        if not fields_path:
            raise FileNotFoundError("fields.json or core_fields.json not found")
        
        with open(fields_path, "r", encoding="utf-8") as f:
            fields_json = json.load(f)
        
        # components
        comp_dir = os.path.join(base_dir, "components")
        components: Dict[str, Any] = {}
        if os.path.isdir(comp_dir):
            for fn in os.listdir(comp_dir):
                if fn.endswith(".json"):
                    with open(os.path.join(comp_dir, fn), "r", encoding="utf-8") as f:
                        spec = json.load(f)
                    key = spec.get("name") or fn.replace(".json", "")
                    components[key] = spec
        
        # messages keyed by msgType (e.g., "D","F","G","8")
        msg_dir = os.path.join(base_dir, "messages")
        if not os.path.isdir(msg_dir):
            raise FileNotFoundError(f"messages dir not found: {msg_dir}")
        
        messages: Dict[str, Any] = {}
        for fn in os.listdir(msg_dir):
            if fn.endswith(".json"):
                with open(os.path.join(msg_dir, fn), "r", encoding="utf-8") as f:
                    spec = json.load(f)
                mt = spec.get("msgType")
                if not mt:
                    raise ValueError(f"Message file missing msgType: {fn}")
                messages[mt] = spec
        
        # rules + order_state
        rules = None
        rules_path = os.path.join(base_dir, "rules.json")
        if os.path.isfile(rules_path):
            with open(rules_path, "r", encoding="utf-8") as f:
                rules = json.load(f)
        
        order_state = None
        os_path = os.path.join(base_dir, "order_state.json")
        if os.path.isfile(os_path):
            with open(os_path, "r", encoding="utf-8") as f:
                order_state = json.load(f)
        
        return {
            "base_dir": base_dir,
            "fields_json": fields_json,
            "components": components,
            "messages": messages,
            "rules": rules,
            "order_state": order_state,
        }
    
    @property
    def specs(self) -> Dict[str, Any]:
        """Get the loaded specs."""
        return self._specs
    
    def get_message_spec(self, msg_type: str) -> Optional[Dict[str, Any]]:
        """Get message specification by message type."""
        return self._specs["messages"].get(msg_type)
    
    def get_component(self, name: str) -> Optional[Dict[str, Any]]:
        """Get component specification by name."""
        return self._specs["components"].get(name)
    
    def lookup_tag(self, tag_or_name: str) -> Any:
        """Returns the field entry from fields.json/core_fields.json by tag (e.g., '99') or by name (e.g., 'StopPx')."""
        fj = self._specs.get("fields_json", {})
        # Fields are nested under "fields" key
        fields = fj.get("fields", {})
        key = str(tag_or_name)
        # direct by tag
        if key in fields:
            return fields[key]
        # by name (best-effort scan)
        for k, v in fields.items():
            if isinstance(v, dict) and str(v.get("name", "")).lower() == key.lower():
                return v
        return None


def normalize_delims(text: str, to_soh: bool) -> str:
    """Convert between '|' and SOH delimiters."""
    if to_soh:
        return text.replace("|", SOH)
    else:
        return text.replace(SOH, "|")


def parse_fix(fix_str: str) -> Dict[str, Any]:
    """Parse FIX string into a tag-value dictionary."""
    s = normalize_delims(fix_str, to_soh=True)
    out: Dict[str, Any] = {}
    for part in filter(None, s.split(SOH)):
        if "=" not in part:
            continue
        tag, val = part.split("=", 1)
        # keep as string unless purely numeric
        out[tag] = float(val) if re.fullmatch(r"-?\d+(\.\d+)?", val or "") else val
    return out


def _present(payload: Dict[str, Any], tags: List[Any]) -> List[str]:
    """Check which required tags are missing from payload."""
    missing = []
    for t in tags:
        t = str(t)
        if payload.get(t) is None:
            missing.append(t)
    return missing


def _equation_ok(payload: Dict[str, Any], lhs: List[Any], equals: Any) -> tuple[bool, float, float]:
    """Evaluate equation constraint (e.g., 14 + 151 = 38)."""
    total = 0.0
    op = "+"
    for tok in lhs:
        s = str(tok)
        if s in {"+", "-"}:
            op = s
            continue
        v = float(payload.get(s, 0) or 0)
        total = total + v if op == "+" else total - v
    rhs = float(payload.get(str(equals), float("nan")) or float("nan"))
    return (rhs == total), total, rhs


def validate_against_message_spec(spec: Dict[str, Any], payload: Dict[str, Any]) -> List[str]:
    """Validate payload against message specification."""
    errors: List[str] = []
    req = [str(x) for x in spec.get("required", [])]
    if req:
        miss = _present(payload, req)
        if miss:
            errors.append(f"Missing required: {','.join(miss)}")
    
    # very small subset of constraints used in our JSON
    for c in spec.get("constraints", []) or []:
        if "must_have" in c:
           miss = _present(payload, c["must_have"])
           if miss: errors.append(f"Missing required: {','.join(miss)}")
        if "must_have_one_of" in c:
           ok = any(payload.get(str(t)) is not None for t in c["must_have_one_of"])
           if not ok: errors.append(f"One of required: {','.join(map(str,c['must_have_one_of']))}")
        if "equation" in c:
           ok, s, r = _equation_ok(payload, c["equation"]["lhs"], c["equation"]["equals"])
           if not ok: errors.append(f"Equation failed: {' '.join(map(str,c['equation']['lhs']))} = {c['equation']['equals']} ({s} != {r})")
        
        # if/then cases (equals / in → present/must_have/must_have_one_of)
        def _cond_ok(cond: Dict[str, Any]) -> bool:
            if "equals" in cond:
                tag, val = next(iter(cond["equals"].items()))
                return str(payload.get(str(tag))) == str(val)
            if "in" in cond:
                tag, arr = next(iter(cond["in"].items()))
                return str(payload.get(str(tag))) in [str(x) for x in arr]
            return False
        
        def _apply_then(th: Dict[str, Any]):
            if "present" in th:
                miss = _present(payload, th["present"])
                if miss: errors.append(f"Missing required: {','.join(miss)}")
            if "must_have" in th:
                miss = _present(payload, th["must_have"])
                if miss: errors.append(f"Missing required: {','.join(miss)}")
            if "must_have_one_of" in th:
                ok = any(payload.get(str(t)) is not None for t in th["must_have_one_of"])
                if not ok: errors.append(f"One of required: {','.join(map(str, th['must_have_one_of']))}")
            if "in" in th:
                tag, arr = next(iter(th["in"].items()))
                if str(payload.get(str(tag))) not in [str(x) for x in arr]:
                    errors.append(f"Invalid value for {tag}. Expected one of {','.join(map(str, arr))}")
        
        if "if" in c and _cond_ok(c["if"]):
            _apply_then(c.get("then", {}))
        if "if_any_of" in c and c.get("then"):
            if any(_cond_ok(cond) for cond in c["if_any_of"]):
                _apply_then(c["then"])
        if "cases" in c:
            for k in c["cases"]:
                if _cond_ok(k.get("if", {})):
                    _apply_then(k.get("then", {}))
    
    return errors


def validate_against_rules(rules: Optional[Dict[str, Any]], msg_type: str, payload: Dict[str, Any]) -> List[str]:
    """Validate payload against cross-field rules."""
    if not rules: return []
    errors: List[str] = []
    for r in rules.get("rules", []):
        if r.get("applies_to") and msg_type not in r["applies_to"]:
            continue
        logic = r.get("logic", {})
        # reuse the same tiny evaluator by wrapping as a "constraint"
        errs = validate_against_message_spec({"constraints": [logic], "required": []}, payload)
        if errs:
            errors.append(r.get("error_on_fail") or "; ".join(errs))
    return errors


def validate_fix(msg_type: str, payload: Dict[str, Any],
                 original: Dict[str, Any] = None, known_live_orders: set = None) -> Dict[str, Any]:
    """Validate FIX message payload against specifications and rules."""
    registry = SpecsRegistry()
    spec = registry.get_message_spec(msg_type)
    if not spec:
        return {"ok": False, "errors": [f"Unknown MsgType {msg_type}"]}

    errors = []
    errors += validate_against_message_spec(spec, payload)
    errors += validate_against_rules(registry.specs.get("rules"), msg_type, payload)

    # Optional: F must reference a known live order
    if msg_type == "F" and known_live_orders is not None:
        oid = str(payload.get("41", ""))
        if not oid or oid not in known_live_orders:
            errors.append("OrigClOrdID(41) does not reference a known live order.")

    # Optional: G immutables & 'must change something' if original provided
    if msg_type == "G" and original:
        immut = ["55", "48", "22", "54"]
        for t in immut:
            if t in payload and str(payload.get(t)) != str(original.get(t)):
                errors.append(f"Immutable field changed: {t}")

        changed_fields = ["44", "38", "99", "59", "432", "126", "40"]
        changed = any(str(payload.get(t)) != str(original.get(t)) for t in changed_fields if t in payload or t in original)
        if not changed:
            errors.append("Replace must change at least one of: 44,38,99,59,432,126,40.")

    return {"ok": not errors, "errors": errors}


def _pad3(n: int) -> str:
    """Pad number to 3 digits for checksum."""
    s = str(n % 256)
    return ("00"+s)[-3:]


def _checksum(s: str) -> str:
    """Compute FIX checksum."""
    return _pad3(sum(ord(ch) for ch in s) % 256)


def build_fix(msg_type: str, payload: Dict[str, Any], begin_string: str = "FIX.4.4") -> Dict[str, Any]:
    """
    Build FIX message with proper BodyLength and CheckSum.
    
    Tag 35 (MsgType) de-duplication rule:
    - Drop incoming 8, 9, 10 tags from payload
    - If client supplies 35, keep it (but validate it matches inferred msg_type)
    - If no 35 in payload, inject the inferred msg_type
    - Ensure exactly one 35 appears in final message
    """
    # Filter out reserved tags and prepare payload
    filtered_payload = {k: v for k, v in payload.items() if k not in ["8", "9", "10"]}
    
    # Handle MsgType (35) - client can supply it or we infer it
    client_msg_type = filtered_payload.get("35")
    if client_msg_type and str(client_msg_type) != str(msg_type):
        raise ValueError(f"MsgType (35) mismatch between input '{client_msg_type}' and inferred template '{msg_type}'")
    
    # Ensure we have exactly one 35
    if "35" not in filtered_payload:
        filtered_payload["35"] = msg_type
    
    # Build header and body
    header = [f"8={begin_string}"]
    # Remove 35 from body_pairs since we'll add it separately
    body_pairs = [f"{k}={v}" for k, v in filtered_payload.items() if k != "35"]
    body_str = SOH.join(body_pairs)
    
    # BodyLength counts from after 9=..SOH to before 10=
    after8 = SOH.join([f"35={filtered_payload['35']}", body_str]) + SOH
    body_len = len(after8)
    full_no10 = SOH.join([f"8={begin_string}", f"9={body_len}", f"35={filtered_payload['35']}", body_str]) + SOH
    csum = _checksum(full_no10)
    full = full_no10 + f"10={csum}" + SOH
    pretty = normalize_delims(full, to_soh=False)
    return {"raw": full, "pretty": pretty}


def explain_exec_report(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Explain execution report using order state knowledge."""
    registry = SpecsRegistry()
    os_doc = registry.specs.get("order_state") or {"states": []}
    exec_type = str(payload.get("150", ""))
    ord_status = str(payload.get("39", ""))
    row = next((s for s in os_doc["states"] if s.get("execType")==exec_type and s.get("ordStatus")==ord_status), None)
    order_qty = float(payload.get("38", "nan"))
    cum_qty = float(payload.get("14", "nan"))
    leaves = payload.get("151")
    leaves_calc = None
    if not (order_qty != order_qty) and not (cum_qty != cum_qty):  # NaN check
        leaves_calc = max(0.0, order_qty - cum_qty)
    if leaves is None and leaves_calc is not None:
        leaves = leaves_calc
    checks = []
    if leaves is not None and not (order_qty != order_qty) and not (cum_qty != cum_qty):
        if abs((cum_qty + float(leaves)) - order_qty) > 1e-9:
            checks.append(f"WARNING: 14 + 151 != 38 ({cum_qty} + {leaves} vs {order_qty})")
    return {
        "summary": row["explain"] if row else "Execution Report.",
        "execType": exec_type, "ordStatus": ord_status,
        "leavesQty": leaves, "checks": checks
    }


def lookup_tag(tag_or_name: str) -> Any:
    """Look up field definition by tag or name."""
    registry = SpecsRegistry()
    return registry.lookup_tag(tag_or_name)
