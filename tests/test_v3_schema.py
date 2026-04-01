"""Schema validation tests for v3 demo profiles.

Loads the demo profiles from the JSON fixture and validates every profile
matches the v3 TrustProfile schema: 6 dimensions with grade/confidence/
reasoning/key_signals, plus overall with trust_tier/trust_score/summary/
top_signals.
"""

import json
import pathlib
import pytest


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DIMENSIONS = ["code", "onchain", "social", "governance", "defi", "identity"]
VALID_GRADES = {"A", "B", "C", "D", "F", "N/A"}
VALID_CONFIDENCES = {"high", "medium", "low", "none"}
VALID_TIERS = {"TRUSTED", "MODERATE", "LOW", "UNKNOWN"}
DIMENSION_FIELDS = {"grade", "confidence", "reasoning", "key_signals"}
OVERALL_FIELDS = {"trust_tier", "trust_score", "summary", "top_signals"}

FIXTURES_DIR = pathlib.Path(__file__).resolve().parent / "fixtures"


# ---------------------------------------------------------------------------
# Fixture
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def demo_profiles():
    """Load all 6 demo profiles from the JSON fixture."""
    path = FIXTURES_DIR / "demo_profiles.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


@pytest.fixture(scope="module")
def profile_names():
    return ["vbuterin", "gakonst", "ridwannurudeen", "torvalds", "haydenzadams", "samczsun"]


# ===========================================================================
# Profile existence
# ===========================================================================

class TestProfileExistence:
    """Verify all 6 expected profiles are present."""

    def test_has_six_profiles(self, demo_profiles):
        assert len(demo_profiles) == 6

    @pytest.mark.parametrize("name", [
        "vbuterin", "gakonst", "ridwannurudeen", "torvalds", "haydenzadams", "samczsun",
    ])
    def test_profile_exists(self, demo_profiles, name):
        assert name in demo_profiles, f"Missing profile: {name}"


# ===========================================================================
# Dimension field validation
# ===========================================================================

class TestDimensionFields:
    """Each profile must have all 6 dimensions, each with the correct fields."""

    @pytest.mark.parametrize("name", [
        "vbuterin", "gakonst", "ridwannurudeen", "torvalds", "haydenzadams", "samczsun",
    ])
    def test_has_all_six_dimensions(self, demo_profiles, name):
        profile = demo_profiles[name]
        for dim in DIMENSIONS:
            assert dim in profile, f"Profile '{name}' missing dimension '{dim}'"

    @pytest.mark.parametrize("name", [
        "vbuterin", "gakonst", "ridwannurudeen", "torvalds", "haydenzadams", "samczsun",
    ])
    def test_dimension_has_required_fields(self, demo_profiles, name):
        profile = demo_profiles[name]
        for dim in DIMENSIONS:
            dim_data = profile[dim]
            for field in DIMENSION_FIELDS:
                assert field in dim_data, (
                    f"Profile '{name}', dimension '{dim}' missing field '{field}'"
                )

    @pytest.mark.parametrize("name", [
        "vbuterin", "gakonst", "ridwannurudeen", "torvalds", "haydenzadams", "samczsun",
    ])
    def test_key_signals_is_list(self, demo_profiles, name):
        profile = demo_profiles[name]
        for dim in DIMENSIONS:
            signals = profile[dim]["key_signals"]
            assert isinstance(signals, list), (
                f"Profile '{name}', dimension '{dim}': key_signals is not a list"
            )

    @pytest.mark.parametrize("name", [
        "vbuterin", "gakonst", "ridwannurudeen", "torvalds", "haydenzadams", "samczsun",
    ])
    def test_key_signals_are_strings(self, demo_profiles, name):
        profile = demo_profiles[name]
        for dim in DIMENSIONS:
            for sig in profile[dim]["key_signals"]:
                assert isinstance(sig, str), (
                    f"Profile '{name}', dimension '{dim}': key_signal '{sig}' is not a string"
                )

    @pytest.mark.parametrize("name", [
        "vbuterin", "gakonst", "ridwannurudeen", "torvalds", "haydenzadams", "samczsun",
    ])
    def test_reasoning_is_string(self, demo_profiles, name):
        profile = demo_profiles[name]
        for dim in DIMENSIONS:
            assert isinstance(profile[dim]["reasoning"], str), (
                f"Profile '{name}', dimension '{dim}': reasoning is not a string"
            )


# ===========================================================================
# Grade validation
# ===========================================================================

class TestGradeValidation:
    """Every dimension grade must be one of: A, B, C, D, F, N/A."""

    @pytest.mark.parametrize("name", [
        "vbuterin", "gakonst", "ridwannurudeen", "torvalds", "haydenzadams", "samczsun",
    ])
    def test_grades_are_valid(self, demo_profiles, name):
        profile = demo_profiles[name]
        for dim in DIMENSIONS:
            grade = profile[dim]["grade"]
            assert grade in VALID_GRADES, (
                f"Profile '{name}', dimension '{dim}': invalid grade '{grade}'"
            )


# ===========================================================================
# Confidence validation
# ===========================================================================

class TestConfidenceValidation:
    """Every dimension confidence must be one of: high, medium, low, none."""

    @pytest.mark.parametrize("name", [
        "vbuterin", "gakonst", "ridwannurudeen", "torvalds", "haydenzadams", "samczsun",
    ])
    def test_confidences_are_valid(self, demo_profiles, name):
        profile = demo_profiles[name]
        for dim in DIMENSIONS:
            conf = profile[dim]["confidence"]
            assert conf in VALID_CONFIDENCES, (
                f"Profile '{name}', dimension '{dim}': invalid confidence '{conf}'"
            )


# ===========================================================================
# Overall field validation
# ===========================================================================

class TestOverallFields:
    """Each profile must have 'overall' with the correct sub-fields."""

    @pytest.mark.parametrize("name", [
        "vbuterin", "gakonst", "ridwannurudeen", "torvalds", "haydenzadams", "samczsun",
    ])
    def test_has_overall(self, demo_profiles, name):
        assert "overall" in demo_profiles[name], f"Profile '{name}' missing 'overall'"

    @pytest.mark.parametrize("name", [
        "vbuterin", "gakonst", "ridwannurudeen", "torvalds", "haydenzadams", "samczsun",
    ])
    def test_overall_has_required_fields(self, demo_profiles, name):
        overall = demo_profiles[name]["overall"]
        for field in OVERALL_FIELDS:
            assert field in overall, (
                f"Profile '{name}', overall missing field '{field}'"
            )


# ===========================================================================
# Trust tier validation
# ===========================================================================

class TestTrustTier:
    """trust_tier must be one of: TRUSTED, MODERATE, LOW, UNKNOWN."""

    @pytest.mark.parametrize("name", [
        "vbuterin", "gakonst", "ridwannurudeen", "torvalds", "haydenzadams", "samczsun",
    ])
    def test_trust_tier_is_valid(self, demo_profiles, name):
        tier = demo_profiles[name]["overall"]["trust_tier"]
        assert tier in VALID_TIERS, (
            f"Profile '{name}': invalid trust_tier '{tier}'"
        )


# ===========================================================================
# Trust score validation
# ===========================================================================

class TestTrustScore:
    """trust_score must be an integer in [0, 100]."""

    @pytest.mark.parametrize("name", [
        "vbuterin", "gakonst", "ridwannurudeen", "torvalds", "haydenzadams", "samczsun",
    ])
    def test_trust_score_is_int(self, demo_profiles, name):
        score = demo_profiles[name]["overall"]["trust_score"]
        assert isinstance(score, int), (
            f"Profile '{name}': trust_score is {type(score).__name__}, expected int"
        )

    @pytest.mark.parametrize("name", [
        "vbuterin", "gakonst", "ridwannurudeen", "torvalds", "haydenzadams", "samczsun",
    ])
    def test_trust_score_in_range(self, demo_profiles, name):
        score = demo_profiles[name]["overall"]["trust_score"]
        assert 0 <= score <= 100, (
            f"Profile '{name}': trust_score {score} outside [0, 100]"
        )


# ===========================================================================
# Overall summary and top_signals
# ===========================================================================

class TestOverallContent:
    """Validate summary is a string and top_signals is a list of strings."""

    @pytest.mark.parametrize("name", [
        "vbuterin", "gakonst", "ridwannurudeen", "torvalds", "haydenzadams", "samczsun",
    ])
    def test_summary_is_string(self, demo_profiles, name):
        summary = demo_profiles[name]["overall"]["summary"]
        assert isinstance(summary, str), (
            f"Profile '{name}': summary is not a string"
        )

    @pytest.mark.parametrize("name", [
        "vbuterin", "gakonst", "ridwannurudeen", "torvalds", "haydenzadams", "samczsun",
    ])
    def test_summary_is_nonempty(self, demo_profiles, name):
        summary = demo_profiles[name]["overall"]["summary"]
        assert len(summary) > 0, f"Profile '{name}': summary is empty"

    @pytest.mark.parametrize("name", [
        "vbuterin", "gakonst", "ridwannurudeen", "torvalds", "haydenzadams", "samczsun",
    ])
    def test_top_signals_is_list(self, demo_profiles, name):
        signals = demo_profiles[name]["overall"]["top_signals"]
        assert isinstance(signals, list), (
            f"Profile '{name}': top_signals is not a list"
        )

    @pytest.mark.parametrize("name", [
        "vbuterin", "gakonst", "ridwannurudeen", "torvalds", "haydenzadams", "samczsun",
    ])
    def test_top_signals_are_strings(self, demo_profiles, name):
        for sig in demo_profiles[name]["overall"]["top_signals"]:
            assert isinstance(sig, str), (
                f"Profile '{name}': top_signal '{sig}' is not a string"
            )

    @pytest.mark.parametrize("name", [
        "vbuterin", "gakonst", "ridwannurudeen", "torvalds", "haydenzadams", "samczsun",
    ])
    def test_top_signals_nonempty(self, demo_profiles, name):
        signals = demo_profiles[name]["overall"]["top_signals"]
        assert len(signals) > 0, f"Profile '{name}': top_signals is empty"


# ===========================================================================
# Meta fields (identifier, identifier_type, vouched_by, sources)
# ===========================================================================

class TestMetaFields:
    """Validate profile metadata fields."""

    @pytest.mark.parametrize("name", [
        "vbuterin", "gakonst", "ridwannurudeen", "torvalds", "haydenzadams", "samczsun",
    ])
    def test_has_identifier(self, demo_profiles, name):
        assert demo_profiles[name]["identifier"] == name

    @pytest.mark.parametrize("name", [
        "vbuterin", "gakonst", "ridwannurudeen", "torvalds", "haydenzadams", "samczsun",
    ])
    def test_identifier_type_is_valid(self, demo_profiles, name):
        idt = demo_profiles[name]["identifier_type"]
        assert idt in {"github", "ens", "wallet", "twitter"}, (
            f"Profile '{name}': invalid identifier_type '{idt}'"
        )

    @pytest.mark.parametrize("name", [
        "vbuterin", "gakonst", "ridwannurudeen", "torvalds", "haydenzadams", "samczsun",
    ])
    def test_vouched_by_is_address(self, demo_profiles, name):
        addr = demo_profiles[name]["vouched_by"]
        assert addr.startswith("0x"), f"Profile '{name}': vouched_by does not start with 0x"
        assert len(addr) == 42, f"Profile '{name}': vouched_by wrong length"

    @pytest.mark.parametrize("name", [
        "vbuterin", "gakonst", "ridwannurudeen", "torvalds", "haydenzadams", "samczsun",
    ])
    def test_sources_is_list(self, demo_profiles, name):
        sources = demo_profiles[name]["sources"]
        assert isinstance(sources, list), f"Profile '{name}': sources is not a list"
        assert len(sources) > 0, f"Profile '{name}': sources is empty"
