import queue
import pytest
from unittest.mock import patch, MagicMock


def _make_transcriber():
    """Return a ClaudeTranscriber with no API key (enough to test queue logic)."""
    # WhisperModel is imported lazily inside _get_whisper(); patch at the source module.
    with patch("faster_whisper.WhisperModel", MagicMock()):
        from services.claude_transcriber import ClaudeTranscriber
        t = ClaudeTranscriber(api_key="dummy")
        t.is_running = False
        return t


def test_audio_queue_exists():
    t = _make_transcriber()
    assert hasattr(t, "audio_queue")
    assert isinstance(t.audio_queue, queue.Queue)


def test_bytes_queued_starts_at_zero():
    t = _make_transcriber()
    assert t.bytes_queued == 0


def test_stream_audio_pushes_to_both_queues(tmp_path):
    """Simulate one PCM push and verify both queues receive it."""
    t = _make_transcriber()
    t.is_running = True

    fake_pcm = b"\x00\x01" * 480  # 480 samples of silence

    # Directly populate both queues as stream_audio would
    t.chunk_queue.put(fake_pcm)
    t.audio_queue.put(fake_pcm)
    t.bytes_queued += len(fake_pcm)

    assert not t.chunk_queue.empty()
    assert not t.audio_queue.empty()
    assert t.bytes_queued == len(fake_pcm)
    assert t.chunk_queue.get() == fake_pcm
    assert t.audio_queue.get() == fake_pcm
