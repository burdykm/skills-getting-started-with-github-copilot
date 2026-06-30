import copy
import uuid

import pytest
from fastapi.testclient import TestClient

from src import app as app_module


client = TestClient(app_module.app)
ORIGINAL_ACTIVITIES = copy.deepcopy(app_module.activities)


@pytest.fixture(autouse=True)
def reset_activities():
    # Arrange
    app_module.activities.clear()
    app_module.activities.update(copy.deepcopy(ORIGINAL_ACTIVITIES))


def test_get_activities_returns_available_activities():
    # Arrange
    expected_activity = "Chess Club"

    # Act
    response = client.get("/activities")

    # Assert
    assert response.status_code == 200
    payload = response.json()
    assert expected_activity in payload
    assert payload[expected_activity]["max_participants"] == 12
    assert len(payload[expected_activity]["participants"]) == 2


def test_signup_for_activity_adds_participant():
    # Arrange
    activity_name = "Chess Club"
    email = f"copilot-test-{uuid.uuid4().hex[:8]}@mergington.edu"

    # Act
    response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 200
    assert response.json()["message"] == f"Signed up {email} for {activity_name}"

    activities = client.get("/activities").json()
    assert email in activities[activity_name]["participants"]


def test_unregister_participant_removes_them_from_activity():
    # Arrange
    activity_name = "Chess Club"
    email = f"copilot-test-{uuid.uuid4().hex[:8]}@mergington.edu"
    signup_response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )

    # Act
    unregister_response = client.delete(
        f"/activities/{activity_name}/unregister",
        params={"email": email},
    )

    # Assert
    assert signup_response.status_code == 200
    assert unregister_response.status_code == 200
    assert unregister_response.json()["message"] == f"Unregistered {email} from {activity_name}"

    activities = client.get("/activities").json()
    assert email not in activities[activity_name]["participants"]
