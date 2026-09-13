"""Opt-in assay with the actual full connectome (requires prepared data)."""
import os
import pytest
pytestmark = pytest.mark.skipif(os.environ.get('FLY_FULL_TEST')!='1',reason='Set FLY_FULL_TEST=1 after preparing data')

def test_actual_connectome_replay_and_input_sensitivity():
    from brain import Brain
    b=Brain()
    first=b.respond('tic-tac-toe','X........')
    changed=b.respond('tic-tac-toe','....X....')
    replay=b.respond('tic-tac-toe','X........')
    assert first['telemetry']['arrays_verified']
    assert first['telemetry']['output_spikes']>0
    import numpy as np
    bins=first['telemetry']['activity_bins']
    assert [entry['end_ms'] for entry in bins]==list(range(10,101,10))
    np.testing.assert_allclose(np.mean([entry['rates_hz'] for entry in bins],axis=0),first['telemetry']['output_rates_hz'])
    assert first['telemetry']['spike_sha256']==replay['telemetry']['spike_sha256']
    assert first['move']==replay['move']
    assert first['telemetry']['spike_sha256']!=changed['telemetry']['spike_sha256']
    assert first['telemetry']['output_rates_hz']!=changed['telemetry']['output_rates_hz']
    assert first['move']!=changed['move']


def test_spatial_stream_matches_actual_neuron_counts():
    from brain import Brain
    import numpy as np
    b=Brain()
    frames=[]
    streamed=b.respond('tic-tac-toe','X........',on_activity=frames.append)
    direct=b.respond('tic-tac-toe','X........')
    assert streamed['move']==direct['move']
    assert streamed['telemetry']['spike_sha256']==direct['telemetry']['spike_sha256']
    assert len(frames)==10
    assert sum(f['total_spikes'] for f in frames)==streamed['telemetry']['total_spikes']
    assert b.geometry['count']==139662
    assert len(b.geometry['positions'])==3*b.geometry['count']
    for f in frames:
        assert len(f['indices'])==len(f['counts'])
        assert sum(f['counts'])==f['mapped_spikes']
        assert all(0<=i<b.geometry['count'] for i in f['indices'])
        assert all(c>0 for c in f['counts'])
    # No synthetic geometry or spike events are added for unlocated cells.
    assert sum(f['mapped_spikes'] for f in frames)<=streamed['telemetry']['total_spikes']
    assert np.isfinite(np.array(b.geometry['positions'])).all()
