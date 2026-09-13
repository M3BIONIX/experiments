"""Production-origin requests must reach the API instead of localhost-only rejection."""
from fastapi.testclient import TestClient
import server

def test_production_origin_reaches_neural_service(monkeypatch):
    monkeypatch.setitem(server.state, 'status', 'unavailable')
    client = TestClient(server.app)
    response = client.post('/api/brain/play', headers={'Origin':'https://experiments.m3bionix.com'}, json={'game':'tic-tac-toe','position':'X........'})
    assert response.status_code == 503  # Availability, not an origin rejection.

def test_unapproved_origin_rejected():
    response = TestClient(server.app).post('/api/brain/play', headers={'Origin':'https://unrelated.example'}, json={'game':'tic-tac-toe','position':'X........'})
    assert response.status_code == 403

def test_explicit_preview_origin(monkeypatch):
    monkeypatch.setenv('ALLOWED_ORIGINS', 'https://preview.example')
    response = TestClient(server.app).get('/api/brain/status', headers={'Origin':'https://preview.example'})
    assert response.status_code == 200
