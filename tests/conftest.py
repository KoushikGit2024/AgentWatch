"""Pytest global configuration and environment isolation."""

import os
import pytest

# Ensure automated test suite isolates environment and does not dispatch into live IDE chat
os.environ["ENVIRONMENT"] = "testing"
