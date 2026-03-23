"""Unit tests for input validation helpers.
Run with: pytest tests/test_validators.py -v
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'contracts'))
from vouch_helpers import sanitize_handle, validate_address


class TestSanitizeHandle:
    def test_valid_lowercase(self):
        assert sanitize_handle("torvalds") == "torvalds"

    def test_valid_with_hyphens(self):
        assert sanitize_handle("my-user") == "my-user"

    def test_strips_whitespace(self):
        assert sanitize_handle("  torvalds  ") == "torvalds"

    def test_lowercases(self):
        assert sanitize_handle("Torvalds") == "torvalds"

    def test_single_char(self):
        assert sanitize_handle("a") == "a"

    def test_rejects_empty(self):
        with pytest.raises(Exception, match="Invalid handle"):
            sanitize_handle("")

    def test_rejects_special_chars(self):
        with pytest.raises(Exception, match="Invalid handle"):
            sanitize_handle("user@name")

    def test_rejects_spaces_in_middle(self):
        with pytest.raises(Exception, match="Invalid handle"):
            sanitize_handle("user name")

    def test_rejects_too_long(self):
        with pytest.raises(Exception, match="Handle too long"):
            sanitize_handle("a" * 40)

    def test_max_length_ok(self):
        assert sanitize_handle("a" * 39) == "a" * 39

    def test_rejects_leading_hyphen(self):
        with pytest.raises(Exception, match="Invalid handle"):
            sanitize_handle("-user")

    def test_rejects_trailing_hyphen(self):
        with pytest.raises(Exception, match="Invalid handle"):
            sanitize_handle("user-")


class TestValidateAddress:
    def test_valid_address(self):
        addr = "0x" + "a" * 40
        assert validate_address(addr) == addr

    def test_strips_and_lowercases(self):
        addr = "0x" + "A" * 40
        assert validate_address(addr) == "0x" + "a" * 40

    def test_rejects_short(self):
        with pytest.raises(Exception, match="Invalid Ethereum address"):
            validate_address("0x1234")

    def test_rejects_no_prefix(self):
        with pytest.raises(Exception, match="Invalid Ethereum address"):
            validate_address("a" * 40)

    def test_rejects_non_hex(self):
        with pytest.raises(Exception, match="Invalid Ethereum address"):
            validate_address("0x" + "g" * 40)

    def test_rejects_empty(self):
        with pytest.raises(Exception, match="Invalid Ethereum address"):
            validate_address("")
