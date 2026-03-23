"""Unit tests for prompt builder functions."""
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'contracts'))
from vouch_helpers import (
    build_github_prompt,
    build_etherscan_prompt,
    build_synthesis_prompt,
    parse_profile_json,
)


class TestBuildGithubPrompt:
    def test_returns_string(self):
        result = build_github_prompt("some html content")
        assert isinstance(result, str)

    def test_contains_json_keys(self):
        result = build_github_prompt("html")
        assert '"repos"' in result
        assert '"commits_last_year"' in result
        assert '"profile_found"' in result

    def test_truncates_long_html(self):
        long_html = "x" * 20000
        result = build_github_prompt(long_html)
        assert long_html not in result
        assert "x" * 8000 in result

    def test_includes_page_content(self):
        result = build_github_prompt("unique_test_content_xyz")
        assert "unique_test_content_xyz" in result


class TestBuildEtherscanPrompt:
    def test_returns_string(self):
        result = build_etherscan_prompt("some html")
        assert isinstance(result, str)

    def test_contains_json_keys(self):
        result = build_etherscan_prompt("html")
        assert '"tx_count"' in result
        assert '"suspicious_patterns"' in result
        assert '"address_found"' in result

    def test_truncates_long_html(self):
        long_html = "y" * 20000
        result = build_etherscan_prompt(long_html)
        assert long_html not in result
        assert "y" * 8000 in result


class TestBuildSynthesisPrompt:
    def test_returns_string(self):
        result = build_synthesis_prompt({"repos": 10}, {"tx_count": 5})
        assert isinstance(result, str)

    def test_includes_data(self):
        result = build_synthesis_prompt({"repos": 42}, {"tx_count": 100})
        assert "42" in result
        assert "100" in result

    def test_includes_grading_criteria(self):
        result = build_synthesis_prompt({}, {})
        assert "TRUSTED" in result
        assert "MODERATE" in result
        assert "LOW" in result
        assert "UNKNOWN" in result


class TestParseProfileJson:
    def test_valid_json(self):
        raw = '{"overall": {"trust_tier": "TRUSTED", "summary": "good"}}'
        result = parse_profile_json(raw)
        assert result["overall"]["trust_tier"] == "TRUSTED"

    def test_invalid_json_returns_fallback(self):
        result = parse_profile_json("not json at all")
        assert result["overall"]["trust_tier"] == "UNKNOWN"

    def test_empty_string_returns_fallback(self):
        result = parse_profile_json("")
        assert result["overall"]["trust_tier"] == "UNKNOWN"

    def test_none_returns_fallback(self):
        result = parse_profile_json(None)
        assert result["overall"]["trust_tier"] == "UNKNOWN"
