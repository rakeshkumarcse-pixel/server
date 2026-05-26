"""Backend tests for JavaHost platform - auth, projects, deployments, env, domains"""
import os
import requests
import pytest
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://java-spring-deploy.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@javahost.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_session(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["email"] == ADMIN_EMAIL
    return session


# Auth tests
class TestAuth:
    def test_login_invalid(self, session):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrongpass"})
        assert r.status_code == 401

    def test_login_success_sets_cookie(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        assert "access_token" in s.cookies
        body = r.json()
        assert body["email"] == ADMIN_EMAIL
        assert "id" in body

    def test_register_and_me(self):
        s = requests.Session()
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "pass1234", "name": "Test User"})
        assert r.status_code == 200, r.text
        assert r.json()["email"] == email
        r2 = s.get(f"{API}/auth/me")
        assert r2.status_code == 200
        assert r2.json()["email"] == email

    def test_register_duplicate(self, auth_session):
        r = auth_session.post(f"{API}/auth/register",
                              json={"email": ADMIN_EMAIL, "password": "x", "name": "x"})
        assert r.status_code == 400

    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_logout(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200


# Project CRUD tests
class TestProjects:
    project_id = None

    def test_create_project(self, auth_session):
        payload = {
            "name": f"TEST_proj_{uuid.uuid4().hex[:6]}",
            "github_url": "https://github.com/example/repo",
            "branch": "main",
            "build_tool": "maven",
            "java_version": "17",
            "auto_deploy": True,
        }
        r = auth_session.post(f"{API}/projects", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == payload["name"]
        assert data["status"] == "idle"
        assert data["build_tool"] == "maven"
        TestProjects.project_id = data["id"]

    def test_list_projects(self, auth_session):
        r = auth_session.get(f"{API}/projects")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        ids = [p["id"] for p in r.json()]
        assert TestProjects.project_id in ids

    def test_get_project(self, auth_session):
        r = auth_session.get(f"{API}/projects/{TestProjects.project_id}")
        assert r.status_code == 200
        assert r.json()["id"] == TestProjects.project_id

    def test_get_project_not_found(self, auth_session):
        r = auth_session.get(f"{API}/projects/000000000000000000000000")
        assert r.status_code == 404

    def test_create_deployment(self, auth_session):
        r = auth_session.post(f"{API}/deployments", json={"project_id": TestProjects.project_id})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "building"
        assert len(d["logs"]) > 0
        TestProjects.deployment_id = d["id"]

    def test_complete_deployment(self, auth_session):
        r = auth_session.post(f"{API}/deployments/{TestProjects.deployment_id}/complete")
        assert r.status_code == 200
        r2 = auth_session.get(f"{API}/deployments/{TestProjects.deployment_id}")
        assert r2.json()["status"] == "success"

    def test_list_project_deployments(self, auth_session):
        r = auth_session.get(f"{API}/projects/{TestProjects.project_id}/deployments")
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_env_var_crud(self, auth_session):
        r = auth_session.post(f"{API}/projects/{TestProjects.project_id}/env",
                              json={"key": "DB_URL", "value": "jdbc://test"})
        assert r.status_code == 200
        env_id = r.json()["id"]
        r2 = auth_session.get(f"{API}/projects/{TestProjects.project_id}/env")
        assert any(e["key"] == "DB_URL" for e in r2.json())
        r3 = auth_session.delete(f"{API}/projects/{TestProjects.project_id}/env/{env_id}")
        assert r3.status_code == 200
        r4 = auth_session.get(f"{API}/projects/{TestProjects.project_id}/env")
        assert not any(e["id"] == env_id for e in r4.json())

    def test_domain_crud(self, auth_session):
        r = auth_session.post(f"{API}/projects/{TestProjects.project_id}/domains",
                              json={"domain": "test.example.com"})
        assert r.status_code == 200
        did = r.json()["id"]
        r2 = auth_session.get(f"{API}/projects/{TestProjects.project_id}/domains")
        assert any(d["domain"] == "test.example.com" for d in r2.json())
        r3 = auth_session.delete(f"{API}/projects/{TestProjects.project_id}/domains/{did}")
        assert r3.status_code == 200

    def test_delete_project(self, auth_session):
        r = auth_session.delete(f"{API}/projects/{TestProjects.project_id}")
        assert r.status_code == 200
        r2 = auth_session.get(f"{API}/projects/{TestProjects.project_id}")
        assert r2.status_code == 404

    def test_unauth_project_access(self):
        r = requests.get(f"{API}/projects")
        assert r.status_code == 401
