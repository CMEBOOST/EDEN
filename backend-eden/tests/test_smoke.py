def test_root_ok(client):
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_docs_served(client):
    assert client.get("/docs").status_code == 200


def test_openapi_has_paths(client):
    body = client.get("/openapi.json").json()
    assert "/auth/login" in body["paths"]
    assert "/contracts/" in body["paths"]
