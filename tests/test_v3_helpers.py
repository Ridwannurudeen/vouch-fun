"""Unit tests for vouch_protocol.py v3 helper functions.

Tests _dt, _san, _pa, _dim, and grade-value mapping WITHOUT GenLayer runtime.
The helpers are extracted and tested in isolation by importing the module after
stubbing out the GenLayer import.
"""

import sys
import types
import json
import pytest


# ---------------------------------------------------------------------------
# Stub out the GenLayer runtime so we can import the contract module
# ---------------------------------------------------------------------------

def _setup_genlayer_stub():
    """Create a fake 'genlayer' module that satisfies `from genlayer import *`."""
    mod = types.ModuleType("genlayer")

    # gl namespace used in the contract
    gl_mod = types.ModuleType("genlayer.gl")

    class _FakeContract:
        pass

    gl_mod.Contract = _FakeContract

    class _FakePublic:
        @staticmethod
        def write(fn):
            return fn
        @staticmethod
        def view(fn):
            return fn

    gl_mod.public = _FakePublic()

    # nondet / eq_principle stubs (not exercised in helper tests)
    class _FakeNondet:
        @staticmethod
        def exec_prompt(p):
            return ""

    class _FakeEq:
        @staticmethod
        def prompt_non_comparative(fn, task="", criteria=""):
            return fn()

    gl_mod.nondet = _FakeNondet()
    gl_mod.eq_principle = _FakeEq()
    gl_mod.message = types.SimpleNamespace(sender_account="0x" + "0" * 40)

    # u32 type alias
    mod.u32 = int
    mod.gl = gl_mod

    # Make `from genlayer import *` export gl and u32
    mod.__all__ = ["gl", "u32"]
    mod.__dict__["gl"] = gl_mod
    mod.__dict__["u32"] = int

    sys.modules["genlayer"] = mod
    sys.modules["genlayer.gl"] = gl_mod


_setup_genlayer_stub()

# Now safe to import the contract helpers
sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent / "contracts"))
from vouch_protocol import _dt, _san, _pa, _dim, _DM


# ===== Grade value mapping (equivalent to _grade_val) =====

GRADE_VALUES = {"A": 5, "B": 4, "C": 3, "D": 2, "F": 1, "N/A": 0}

DIMENSIONS = _DM.split(",")
VALID_GRADES = {"A", "B", "C", "D", "F", "N/A"}
VALID_CONFIDENCES = {"high", "medium", "low", "none"}
VALID_TIERS = {"TRUSTED", "MODERATE", "LOW", "UNKNOWN"}


# ===========================================================================
# _dt  --  type detection
# ===========================================================================

class TestDt:
    """_dt(s) detects identifier type from string format."""

    def test_wallet_lowercase(self):
        addr = "0x" + "a" * 40
        assert _dt(addr) == "wallet"

    def test_wallet_uppercase(self):
        addr = "0x" + "A" * 40
        assert _dt(addr) == "wallet"

    def test_wallet_mixed_case(self):
        addr = "0xABCDEF1234567890abcdef1234567890ABCDEF12"
        assert _dt(addr) == "wallet"

    def test_wallet_with_whitespace(self):
        addr = "  0x" + "0" * 40 + "  "
        assert _dt(addr) == "wallet"

    def test_ens_simple(self):
        assert _dt("vitalik.eth") == "ens"

    def test_ens_subdomain(self):
        assert _dt("sub.vitalik.eth") == "ens"

    def test_ens_with_whitespace(self):
        assert _dt("  vitalik.eth  ") == "ens"

    def test_twitter_handle(self):
        assert _dt("@vitalik") == "twitter"

    def test_twitter_handle_with_whitespace(self):
        assert _dt("  @vitalik  ") == "twitter"

    def test_github_plain_username(self):
        assert _dt("vbuterin") == "github"

    def test_github_with_hyphens(self):
        assert _dt("some-user-name") == "github"

    def test_short_hex_not_wallet(self):
        """0x prefix but not 40 hex chars -> treated as github."""
        assert _dt("0xABC") == "github"

    def test_too_long_hex_not_wallet(self):
        addr = "0x" + "a" * 41
        assert _dt(addr) == "github"

    def test_0x_prefix_with_non_hex_chars(self):
        """Contains non-hex chars -> not wallet."""
        addr = "0x" + "g" * 40
        assert _dt(addr) == "github"


# ===========================================================================
# _san  --  sanitization
# ===========================================================================

class TestSan:
    """_san(s) sanitizes identifiers: strip, lower, remove leading @."""

    def test_basic_lowercase(self):
        assert _san("VButerin") == "vbuterin"

    def test_strip_whitespace(self):
        assert _san("  vbuterin  ") == "vbuterin"

    def test_remove_at_prefix(self):
        assert _san("@vitalik") == "vitalik"

    def test_combined_strip_lower_at(self):
        assert _san("  @VitaLIK  ") == "vitalik"

    def test_multiple_at_signs(self):
        """lstrip('@') removes ALL leading @ chars."""
        assert _san("@@user") == "user"

    def test_empty_string_raises(self):
        with pytest.raises(Exception, match="Invalid"):
            _san("")

    def test_whitespace_only_raises(self):
        with pytest.raises(Exception, match="Invalid"):
            _san("   ")

    def test_at_only_raises(self):
        """After stripping @ and whitespace, nothing left."""
        with pytest.raises(Exception, match="Invalid"):
            _san("@")

    def test_over_64_chars_raises(self):
        with pytest.raises(Exception, match="Invalid"):
            _san("a" * 65)

    def test_exactly_64_chars_ok(self):
        result = _san("a" * 64)
        assert result == "a" * 64
        assert len(result) == 64

    def test_preserves_hyphens_and_underscores(self):
        assert _san("some-user_name") == "some-user_name"

    def test_preserves_dots(self):
        assert _san("vitalik.eth") == "vitalik.eth"


# ===========================================================================
# _pa  --  response parsing
# ===========================================================================

class TestPa:
    """_pa(raw) parses LLM JSON responses with fallback."""

    def _valid_profile(self):
        """Build a minimal valid profile with all required keys."""
        dim = {"grade": "B", "confidence": "medium", "reasoning": "test", "key_signals": ["sig"]}
        profile = {}
        for d in DIMENSIONS:
            profile[d] = dict(dim)
        profile["overall"] = {
            "trust_tier": "MODERATE",
            "trust_score": 50,
            "summary": "test",
            "top_signals": ["sig1"],
        }
        return profile

    def test_valid_json_parses(self):
        profile = self._valid_profile()
        raw = json.dumps(profile)
        result = _pa(raw)
        assert result["overall"]["trust_tier"] == "MODERATE"
        assert result["code"]["grade"] == "B"

    def test_valid_json_with_whitespace(self):
        profile = self._valid_profile()
        raw = "  \n" + json.dumps(profile) + "\n  "
        result = _pa(raw)
        assert "overall" in result
        assert "code" in result

    def test_json_in_code_fences(self):
        profile = self._valid_profile()
        raw = "```json\n" + json.dumps(profile) + "\n```"
        result = _pa(raw)
        assert result["overall"]["trust_score"] == 50
        assert result["code"]["grade"] == "B"

    def test_json_in_plain_code_fences(self):
        profile = self._valid_profile()
        raw = "```\n" + json.dumps(profile) + "\n```"
        result = _pa(raw)
        assert "overall" in result

    def test_invalid_json_returns_fallback(self):
        result = _pa("this is not json at all")
        self._assert_fallback(result)

    def test_empty_string_returns_fallback(self):
        result = _pa("")
        self._assert_fallback(result)

    def test_json_missing_overall_returns_fallback(self):
        """Valid JSON but missing 'overall' key -> fallback."""
        data = {"code": {"grade": "A"}}
        result = _pa(json.dumps(data))
        self._assert_fallback(result)

    def test_json_missing_code_returns_fallback(self):
        """Valid JSON but missing 'code' key -> fallback."""
        data = {"overall": {"trust_tier": "TRUSTED", "trust_score": 90}}
        result = _pa(json.dumps(data))
        self._assert_fallback(result)

    def test_partial_json_returns_fallback(self):
        result = _pa('{"code": {"grade": "A"}')
        self._assert_fallback(result)

    def test_fallback_has_all_six_dimensions(self):
        result = _pa("garbage")
        for dim in DIMENSIONS:
            assert dim in result, f"Fallback missing dimension: {dim}"

    def test_fallback_has_overall(self):
        result = _pa("garbage")
        assert "overall" in result

    def test_fallback_dimension_values(self):
        result = _pa("garbage")
        for dim in DIMENSIONS:
            assert result[dim]["grade"] == "N/A"
            assert result[dim]["confidence"] == "none"
            assert result[dim]["reasoning"] == "Parse failed"
            assert result[dim]["key_signals"] == []

    def test_fallback_overall_values(self):
        result = _pa("garbage")
        overall = result["overall"]
        assert overall["trust_tier"] == "UNKNOWN"
        assert overall["trust_score"] == 0
        assert overall["summary"] == "Failed"
        assert overall["top_signals"] == []

    def test_code_fence_with_trailing_text(self):
        """Code fence followed by extra text -- still parses."""
        profile = self._valid_profile()
        raw = "```json\n" + json.dumps(profile) + "\n```\nSome extra explanation."
        result = _pa(raw)
        # The rsplit("```",1)[0] strips the last ``` and everything after it
        assert "overall" in result
        assert "code" in result

    def _assert_fallback(self, result):
        """Assert the result is a fallback profile."""
        for dim in DIMENSIONS:
            assert dim in result
            assert result[dim]["grade"] == "N/A"
            assert result[dim]["confidence"] == "none"
        assert result["overall"]["trust_tier"] == "UNKNOWN"
        assert result["overall"]["trust_score"] == 0


# ===========================================================================
# _dim  --  dimension builder
# ===========================================================================

class TestDim:
    """_dim(g,c,r,k) builds a dimension score dict."""

    def test_basic_construction(self):
        result = _dim("A", "high", "Great code", ["sig1", "sig2"])
        assert result == {
            "grade": "A",
            "confidence": "high",
            "reasoning": "Great code",
            "key_signals": ["sig1", "sig2"],
        }

    def test_empty_signals(self):
        result = _dim("F", "none", "No data", [])
        assert result["key_signals"] == []
        assert result["grade"] == "F"

    def test_na_grade(self):
        result = _dim("N/A", "none", "Failed", [])
        assert result["grade"] == "N/A"
        assert result["confidence"] == "none"

    def test_all_fields_present(self):
        result = _dim("C", "low", "Some activity", ["one"])
        assert set(result.keys()) == {"grade", "confidence", "reasoning", "key_signals"}

    def test_values_are_not_mutated(self):
        signals = ["a", "b"]
        result = _dim("B", "medium", "test", signals)
        signals.append("c")
        # _dim stores the same list reference, so they share
        # This test documents the behavior (no defensive copy)
        assert result["key_signals"] is signals


# ===========================================================================
# Grade validation  --  equivalent to _grade_val
# ===========================================================================

class TestGradeValidation:
    """Validate grade-to-numeric mapping (A=5, B=4, C=3, D=2, F=1, N/A=0)."""

    @pytest.mark.parametrize("grade,value", [
        ("A", 5),
        ("B", 4),
        ("C", 3),
        ("D", 2),
        ("F", 1),
        ("N/A", 0),
    ])
    def test_grade_values(self, grade, value):
        assert GRADE_VALUES[grade] == value

    def test_all_valid_grades_covered(self):
        assert set(GRADE_VALUES.keys()) == VALID_GRADES

    def test_grade_ordering(self):
        """A > B > C > D > F > N/A in numeric value."""
        assert GRADE_VALUES["A"] > GRADE_VALUES["B"]
        assert GRADE_VALUES["B"] > GRADE_VALUES["C"]
        assert GRADE_VALUES["C"] > GRADE_VALUES["D"]
        assert GRADE_VALUES["D"] > GRADE_VALUES["F"]
        assert GRADE_VALUES["F"] > GRADE_VALUES["N/A"]

    def test_unknown_grade_not_in_map(self):
        assert "E" not in GRADE_VALUES
        assert "X" not in GRADE_VALUES

    def test_fallback_dimensions_use_na(self):
        """Fallback from _pa always uses N/A grade (value 0)."""
        result = _pa("invalid")
        for dim in DIMENSIONS:
            grade = result[dim]["grade"]
            assert grade == "N/A"
            assert GRADE_VALUES[grade] == 0


# ===========================================================================
# Integration-style: round-trip through helpers
# ===========================================================================

class TestHelperIntegration:
    """Verify helpers work together as they would in the contract flow."""

    def test_detect_then_sanitize_github(self):
        raw = "  VButerin  "
        idt = _dt(raw)
        clean = _san(raw)
        assert idt == "github"
        assert clean == "vbuterin"

    def test_detect_then_sanitize_twitter(self):
        raw = "  @Vitalik  "
        idt = _dt(raw)
        clean = _san(raw)
        assert idt == "twitter"
        assert clean == "vitalik"

    def test_detect_then_sanitize_ens(self):
        # _dt only checks .endswith(".eth") (case-sensitive after strip)
        raw = "  vitalik.eth  "
        idt = _dt(raw)
        clean = _san(raw)
        assert idt == "ens"
        assert clean == "vitalik.eth"

    def test_detect_ens_case_sensitive(self):
        """_dt does NOT lowercase before checking .eth — uppercase .ETH is 'github'."""
        raw = "  Vitalik.ETH  "
        idt = _dt(raw)
        # After strip: "Vitalik.ETH" does not endswith(".eth") -> falls to github
        assert idt == "github"

    def test_detect_then_sanitize_wallet(self):
        raw = "0xABCDEF1234567890abcdef1234567890ABCDEF12"
        idt = _dt(raw)
        clean = _san(raw)
        assert idt == "wallet"
        assert clean == "0xabcdef1234567890abcdef1234567890abcdef12"

    def test_parse_build_roundtrip(self):
        """Build a profile with _dim, serialize it, parse it back with _pa."""
        profile = {}
        for d in DIMENSIONS:
            profile[d] = _dim("B", "medium", f"Test {d}", [f"sig_{d}"])
        profile["overall"] = {
            "trust_tier": "MODERATE",
            "trust_score": 55,
            "summary": "Test summary",
            "top_signals": ["sig1"],
        }
        raw = json.dumps(profile)
        parsed = _pa(raw)
        assert parsed["overall"]["trust_score"] == 55
        for d in DIMENSIONS:
            assert parsed[d]["grade"] == "B"
            assert parsed[d]["key_signals"] == [f"sig_{d}"]
