import os
import sys

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["API_KEYS"] = ""
os.environ["ANTHROPIC_API_KEY"] = ""
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.database.session import Base, engine, init_db
from app.main import app
from app.services.ai_service import set_llm_client
from tests.fake_llm import FakeLLM

REQ = {
    "source_type": "User Story", "requirement_id": "US-101", "title": "Edit delivery date",
    "description": "As an Admin, I want to modify the delivery completion date so records stay accurate.",
    "acceptance_criteria": "Date persists after save", "parent": "Delivery",
}


@pytest.fixture(autouse=True)
def _db():
    Base.metadata.drop_all(bind=engine)
    init_db()
    get_settings.cache_clear()
    yield
    set_llm_client(None)


@pytest.fixture
def llm():
    f = FakeLLM()
    set_llm_client(f)
    return f


@pytest.fixture
def client():
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def project(client):
    r = client.post("/api/projects", json={"name": "iGreen", "code": "IG"})
    assert r.status_code == 201, r.text
    return r.json()


@pytest.fixture
def pack(client, llm, project):
    r = client.post("/api/test-pack/generate", json={"requirement": REQ, "project_id": project["id"]})
    assert r.status_code == 201, r.text
    return r.json()
