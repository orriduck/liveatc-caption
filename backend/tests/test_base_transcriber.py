import queue
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


def test_stream_audio_pushes_to_both_queues():
    """stream_audio() must push identical PCM bytes to both chunk_queue and audio_queue."""
    from unittest.mock import patch, MagicMock

    fake_pcm = b"\x00\x01" * 480

    # Mock frame returned by resampler.resample()
    mock_resampled_frame = MagicMock()
    mock_resampled_frame.to_ndarray.return_value.tobytes.return_value = fake_pcm

    # Mock resampler
    mock_resampler = MagicMock()
    mock_resampler.resample.return_value = [mock_resampled_frame]

    # Mock container with one decoded frame
    mock_container = MagicMock()
    mock_container.decode.return_value = [MagicMock()]

    t = _make_transcriber()
    t.is_running = True  # stream_audio() sets this False on completion

    with patch("av.open", return_value=mock_container), \
         patch("av.AudioResampler", return_value=mock_resampler):
        t.stream_audio("fake_url")

    assert t.chunk_queue.get() == fake_pcm
    assert t.audio_queue.get() == fake_pcm
    assert t.bytes_queued == len(fake_pcm)


def test_model_size_default():
    t = _make_transcriber()
    assert t._model_size == "tiny.en"


def test_model_size_override():
    with patch("faster_whisper.WhisperModel", MagicMock()):
        from services.claude_transcriber import ClaudeTranscriber
        t = ClaudeTranscriber(api_key="dummy", model_size="small.en")
        assert t._model_size == "small.en"
