"""Unit tests for handle index helpers.
Run with: pytest tests/test_handle_index.py -v
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'contracts'))
from vouch_helpers import get_handle_index, set_handle_index, resolve_handle


class TestGetHandleIndex:
    def test_valid_json(self):
        result = get_handle_index('{"vitalik": "0xabc"}')
        assert result == {"vitalik": "0xabc"}

    def test_empty_json(self):
        result = get_handle_index("{}")
        assert result == {}

    def test_invalid_json(self):
        result = get_handle_index("not json")
        assert result == {}

    def test_none(self):
        result = get_handle_index(None)
        assert result == {}

    def test_empty_string(self):
        result = get_handle_index("")
        assert result == {}


class TestSetHandleIndex:
    def test_empty_dict(self):
        result = set_handle_index({})
        assert result == "{}"

    def test_single_entry(self):
        result = set_handle_index({"torvalds": "0x123"})
        import json
        parsed = json.loads(result)
        assert parsed["torvalds"] == "0x123"

    def test_multiple_entries(self):
        index = {"a": "0x1", "b": "0x2", "c": "0x3"}
        result = set_handle_index(index)
        import json
        parsed = json.loads(result)
        assert len(parsed) == 3


class TestResolveHandle:
    def test_found(self):
        index_str = '{"vitalik": "0xabc", "torvalds": "0xdef"}'
        assert resolve_handle(index_str, "vitalik") == "0xabc"

    def test_not_found(self):
        index_str = '{"vitalik": "0xabc"}'
        assert resolve_handle(index_str, "nobody") == ""

    def test_case_insensitive(self):
        index_str = '{"vitalik": "0xabc"}'
        assert resolve_handle(index_str, "VITALIK") == "0xabc"

    def test_strips_whitespace(self):
        index_str = '{"vitalik": "0xabc"}'
        assert resolve_handle(index_str, "  vitalik  ") == "0xabc"

    def test_empty_index(self):
        assert resolve_handle("{}", "anyone") == ""

    def test_invalid_index(self):
        assert resolve_handle("broken", "anyone") == ""
