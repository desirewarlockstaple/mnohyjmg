from fastapi.testclient import TestClient

from pulsegrid_api.main import app

client = TestClient(app)


def test_root() -> None:
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["service"] == "pulsegrid-api"


def test_healthz() -> None:
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"ok": True}


def test_corridors() -> None:
    r = client.get("/v1/corridors")
    assert r.status_code == 200
    corridors = r.json()
    assert len(corridors) == 3
    ids = {c["id"] for c in corridors}
    assert ids == {"hcmc-inner-ring", "hanoi-rr3", "hanoi-haiphong-cT04"}
    for c in corridors:
        assert c["length_km"] > 0
        assert c["segments"] > 0


def test_segments_unknown_corridor() -> None:
    r = client.get("/v1/corridors/nope/segments")
    assert r.status_code == 404


def test_segments_state() -> None:
    r = client.get("/v1/corridors/hcmc-inner-ring/segments")
    assert r.status_code == 200
    segs = r.json()
    assert len(segs) > 10
    for s in segs:
        assert 0.0 <= s["congestion"] <= 1.0
        assert s["speed_kmh"] > 0
        assert s["free_flow_kmh"] >= s["speed_kmh"]
        assert s["vetc_sensors"] >= 1


def test_eta_valid() -> None:
    r = client.get("/v1/eta", params={"origin": "106.70,10.77", "destination": "106.76,10.81", "mode": "car"})
    assert r.status_code == 200
    eta = r.json()
    assert eta["distance_km"] > 0
    assert eta["eta_minutes"] > 0
    assert eta["conformal_low_minutes"] < eta["eta_minutes"] < eta["conformal_high_minutes"]
    assert 0 < eta["mape_expected"] < 20
    assert 0 < eta["confidence"] < 1
    assert eta["baseline_google_minutes"] > eta["eta_minutes"]


def test_eta_motorcycle_faster_or_equal() -> None:
    p = {"origin": "106.70,10.77", "destination": "106.76,10.81"}
    car = client.get("/v1/eta", params={**p, "mode": "car"}).json()
    moto = client.get("/v1/eta", params={**p, "mode": "motorcycle"}).json()
    assert moto["eta_minutes"] <= car["eta_minutes"] + 0.01


def test_eta_bad_input() -> None:
    r = client.get("/v1/eta", params={"origin": "garbage", "destination": "1,2"})
    assert r.status_code == 400


def test_incidents_all_and_filtered() -> None:
    r = client.get("/v1/incidents")
    assert r.status_code == 200
    all_inc = r.json()
    r2 = client.get("/v1/incidents", params={"corridor_id": "hcmc-inner-ring"})
    filt = r2.json()
    assert all(i["corridor_id"] == "hcmc-inner-ring" for i in filt)
    assert len(filt) <= len(all_inc)


def test_forecast() -> None:
    r = client.get("/v1/forecast", params={"corridor_id": "hanoi-rr3", "horizon_minutes": 90})
    assert r.status_code == 200
    fc = r.json()
    assert fc["horizon_minutes"] == 90
    assert len(fc["points"]) > 0
    for p in fc["points"]:
        assert 0.0 <= p["congestion"] <= 1.0


def test_stats() -> None:
    r = client.get("/v1/stats")
    assert r.status_code == 200
    s = r.json()
    assert s["active_segments"] > 0
    assert s["median_eta_mape"] < s["baseline_eta_mape"]
