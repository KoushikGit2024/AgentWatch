"""Tests for secret and sensitive data redaction."""

from security.redaction import redact_secrets, REDACTED_SUBSTITUTE


def test_redact_sensitive_keys():
    payload = {
        "user": "developer",
        "password": "supersecretpassword123",
        "api_key": "dummy_test_api_key_value_99999",
        "nested": {"token": "dummy_personal_access_token_abcdef", "normal_field": "visible_value"},
    }
    sanitized = redact_secrets(payload)
    assert sanitized["user"] == "developer"
    assert sanitized["password"] == REDACTED_SUBSTITUTE
    assert sanitized["api_key"] == REDACTED_SUBSTITUTE
    assert sanitized["nested"]["token"] == REDACTED_SUBSTITUTE
    assert sanitized["nested"]["normal_field"] == "visible_value"


def test_redact_sensitive_values_in_lists():
    items = [
        "regular text",
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz",
        {"auth": "secret_token_value"},
    ]
    sanitized = redact_secrets(items)
    assert sanitized[0] == "regular text"
    assert sanitized[1] == REDACTED_SUBSTITUTE
    assert sanitized[2]["auth"] == REDACTED_SUBSTITUTE
