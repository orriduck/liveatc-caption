import json
import os
from pathlib import Path

_CONFIG_DIR = Path.home() / ".liveatc-caption"
_CONFIG_FILE = _CONFIG_DIR / "config.json"


def _read() -> dict:
    try:
        return json.loads(_CONFIG_FILE.read_text())
    except Exception:
        return {}


def _write(data: dict) -> None:
    _CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    _CONFIG_FILE.write_text(json.dumps(data, indent=2))


def get_api_key() -> str | None:
    return _read().get("anthropic_api_key") or None


def set_api_key(key: str) -> None:
    data = _read()
    data["anthropic_api_key"] = key
    _write(data)


def load_into_env() -> None:
    """Called at startup — injects persisted key if not already in environment."""
    if not os.environ.get("ANTHROPIC_API_KEY"):
        key = get_api_key()
        if key:
            os.environ["ANTHROPIC_API_KEY"] = key
