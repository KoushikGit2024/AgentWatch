"""Configuration management for AgentWatch."""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List
import os


class Settings(BaseSettings):
    """Application settings with environment override support."""

    # Server Binding
    host: str = Field(default="127.0.0.1", alias="HOST")
    port: int = Field(default=8000, alias="PORT")
    environment: str = Field(default="development", alias="ENVIRONMENT")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    # Application Security
    app_password: str = Field(default="antigravity", alias="APP_PASSWORD")
    jwt_secret: str = Field(default="AgentWatch_v2_default_secret_key", alias="JWT_SECRET")
    auth_disabled: bool = Field(default=False, alias="AUTH_DISABLED")
    allowed_origins: str = Field(default="*", alias="ALLOWED_ORIGINS")
    allowed_hosts: str = Field(default="localhost,127.0.0.1,testserver,testclient,*.ts.net", alias="ALLOWED_HOSTS")

    # MongoDB Local Persistence
    mongodb_uri: str = Field(default="mongodb://127.0.0.1:27017/", alias="MONGODB_URI")
    mongodb_database: str = Field(default="AgentWatch_v2", alias="MONGODB_DATABASE")
    mongodb_connect_timeout_ms: int = Field(default=3000, alias="MONGODB_CONNECT_TIMEOUT_MS")
    mongodb_server_selection_timeout_ms: int = Field(
        default=3000, alias="MONGODB_SERVER_SELECTION_TIMEOUT_MS"
    )

    # Antigravity CDP & Integration
    cdp_ports: str = Field(default="9000,9001,9002,9003", alias="CDP_PORTS")
    cdp_discovery_interval_sec: int = Field(default=3, alias="CDP_DISCOVERY_INTERVAL_SEC")
    antigravity_integration_mode: str = Field(
        default="environment_and_cdp", alias="ANTIGRAVITY_INTEGRATION_MODE"
    )

    # Tailscale Integration
    tailscale_serve_enabled: bool = Field(default=True, alias="TAILSCALE_SERVE_ENABLED")
    tailscale_local_port: int = Field(default=8000, alias="TAILSCALE_LOCAL_PORT")

    # Uploads & File Limits (Generous default: 50MB for large documents, images, text dumps)
    max_upload_size_bytes: int = Field(default=50 * 1024 * 1024, alias="MAX_UPLOAD_SIZE_BYTES")

    # Feature Flags & System Mutation Controls
    enable_terminal_mutation: bool = Field(default=True, alias="ENABLE_TERMINAL_MUTATION")
    enable_file_mutation: bool = Field(default=True, alias="ENABLE_FILE_MUTATION")
    enable_process_termination: bool = Field(default=True, alias="ENABLE_PROCESS_TERMINATION")

    @property
    def parsed_cdp_ports(self) -> List[int]:
        """Return list of integer ports to scan for Antigravity CDP."""
        try:
            return [int(p.strip()) for p in self.cdp_ports.split(",") if p.strip()]
        except ValueError:
            return [9000, 9001, 9002, 9003]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
