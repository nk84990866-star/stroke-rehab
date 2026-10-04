"""Focused backend security and session-integrity tests."""

import os
import unittest

# backend.app creates an application during import. Force its database URL to
# an isolated in-memory SQLite database before importing it.
os.environ["DATABASE_URL"] = "sqlite://"

from backend.app import app  # noqa: E402
from backend.models import Achievement, Exercise, ExerciseSession, User, db  # noqa: E402
from backend.routes.sessions import (  # noqa: E402
    MAX_JOINT_ANGLE_SAMPLES,
    SESSION_PAYLOAD_MAX_BYTES,
)


class BackendSecurityTests(unittest.TestCase):
    PASSWORD = "test-password"

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        if app.config["SQLALCHEMY_DATABASE_URI"] != "sqlite://":
            raise AssertionError("Tests must use isolated in-memory SQLite")

        app.config["TESTING"] = True
        cls.app = app
        with cls.app.app_context():
            db.session.configure(expire_on_commit=False)
            db.create_all()
            cls.patient = cls._create_user(
                "patient-one@example.test", "Patient One", "patient"
            )
            cls.other_patient = cls._create_user(
                "patient-two@example.test", "Patient Two", "patient"
            )
            cls.therapist = cls._create_user(
                "therapist-one@example.test", "Therapist One", "therapist"
            )
            cls.other_therapist = cls._create_user(
                "therapist-two@example.test", "Therapist Two", "therapist"
            )
            cls.exercise = Exercise.query.order_by(Exercise.id).first()
            if cls.exercise is None:
                raise AssertionError("Application exercise seeding did not run")
            db.session.commit()

    @classmethod
    def tearDownClass(cls):
        with cls.app.app_context():
            db.session.remove()
            db.drop_all()
        super().tearDownClass()

    @classmethod
    def _create_user(cls, email, full_name, role):
        user = User(email=email, full_name=full_name, role=role)
        user.set_password(cls.PASSWORD)
        db.session.add(user)
        db.session.flush()
        return user

    def setUp(self):
        with self.app.app_context():
            db.session.remove()
            ExerciseSession.query.delete()
            Achievement.query.delete()
            for user_id in (
                self.patient.id,
                self.other_patient.id,
                self.therapist.id,
                self.other_therapist.id,
            ):
                user = db.session.get(User, user_id)
                user.assigned_therapist_id = None
                user.points = 0
                user.streak_count = 0
                user.last_session_date = None
            db.session.commit()

    def login(self, user):
        client = self.app.test_client()
        response = client.post(
            "/api/auth/login",
            json={"email": user.email, "password": self.PASSWORD},
        )
        self.assertEqual(response.status_code, 200)
        return client

    def create_session(self, patient, exercise=None):
        session = ExerciseSession(
            patient_id=patient.id,
            exercise_id=(exercise or self.exercise).id,
            duration_seconds=1,
            avg_accuracy_score=50,
            targets_hit=0,
            total_targets=len((exercise or self.exercise).target_positions),
            joint_angle_data_json="[[10, 20]]",
        )
        with self.app.app_context():
            db.session.add(session)
            db.session.commit()
        return session

    def valid_session_payload(self):
        target_count = len(self.exercise.target_positions)
        return {
            "exercise_id": self.exercise.id,
            "duration_seconds": 1,
            "avg_accuracy_score": 75.5,
            "targets_hit": 1,
            "total_targets": target_count,
            "joint_angle_data": [[10, 20]],
        }

    def session_count(self):
        with self.app.app_context():
            return ExerciseSession.query.count()

    def assert_rejected_without_session(self, client, payload, expected_status=400):
        before_count = self.session_count()
        response = client.post("/api/sessions", json=payload)
        self.assertEqual(response.status_code, expected_status, response.get_data(as_text=True))
        self.assertEqual(self.session_count(), before_count)
        return response

    def test_patient_can_access_own_sessions(self):
        self.create_session(self.patient)
        response = self.login(self.patient).get("/api/sessions")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.get_json()), 1)
        self.assertEqual(response.get_json()[0]["patient_id"], self.patient.id)

    def test_patient_cannot_access_another_patients_sessions(self):
        self.create_session(self.other_patient)
        response = self.login(self.patient).get(
            f"/api/sessions?patient_id={self.other_patient.id}"
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.get_json(), {"error": "Not found"})

    def test_assigned_therapist_can_access_patient_sessions_and_report(self):
        with self.app.app_context():
            patient = db.session.get(User, self.patient.id)
            patient.assigned_therapist_id = self.therapist.id
            db.session.commit()
        session = self.create_session(self.patient)
        client = self.login(self.therapist)

        sessions_response = client.get(
            f"/api/sessions?patient_id={self.patient.id}"
        )
        report_response = client.get(f"/api/sessions/{session.id}/report")
        self.assertEqual(sessions_response.status_code, 200)
        self.assertEqual(len(sessions_response.get_json()), 1)
        self.assertEqual(report_response.status_code, 200)

    def test_unassigned_therapist_cannot_access_patient_sessions(self):
        self.create_session(self.patient)
        response = self.login(self.therapist).get(
            f"/api/sessions?patient_id={self.patient.id}"
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.get_json(), {"error": "Not found"})

    def test_different_therapist_cannot_access_assigned_patients_sessions(self):
        with self.app.app_context():
            patient = db.session.get(User, self.patient.id)
            patient.assigned_therapist_id = self.other_therapist.id
            db.session.commit()
        self.create_session(self.patient)
        response = self.login(self.therapist).get(
            f"/api/sessions?patient_id={self.patient.id}"
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.get_json(), {"error": "Not found"})

    def test_unauthenticated_protected_request_returns_existing_401(self):
        response = self.app.test_client().get("/api/sessions")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.get_json(),
            {"error": "Unauthorized session, login required"},
        )

    def test_unauthorized_and_nonexistent_patient_or_report_targets_are_indistinguishable(self):
        session = self.create_session(self.other_patient)
        client = self.login(self.patient)
        real_patient = client.get(
            f"/api/sessions?patient_id={self.other_patient.id}"
        )
        missing_patient = client.get("/api/sessions?patient_id=2147483000")
        real_report = client.get(f"/api/sessions/{session.id}/report")
        missing_report = client.get("/api/sessions/2147483000/report")

        self.assertEqual(real_patient.status_code, 404)
        self.assertEqual(real_patient.get_json(), missing_patient.get_json())
        self.assertEqual(real_report.status_code, 404)
        self.assertEqual(real_report.get_json(), missing_report.get_json())

    def test_valid_session_is_saved_for_authenticated_patient(self):
        client = self.login(self.patient)
        response = client.post("/api/sessions", json=self.valid_session_payload())
        self.assertEqual(response.status_code, 201, response.get_data(as_text=True))
        self.assertEqual(response.get_json()["session"]["patient_id"], self.patient.id)

        with self.app.app_context():
            saved = ExerciseSession.query.one()
            self.assertEqual(saved.patient_id, self.patient.id)

    def test_missing_unexpected_non_object_and_wrong_type_payloads_are_rejected(self):
        client = self.login(self.patient)
        valid = self.valid_session_payload()
        cases = [
            ("missing field", {key: value for key, value in valid.items() if key != "duration_seconds"}),
            ("unexpected field", {**valid, "unexpected": True}),
            ("wrong exercise type", {**valid, "exercise_id": True}),
            ("wrong duration type", {**valid, "duration_seconds": 1.0}),
            ("wrong accuracy type", {**valid, "avg_accuracy_score": "75"}),
            ("wrong target type", {**valid, "targets_hit": False}),
            ("wrong angles type", {**valid, "joint_angle_data": "[]"}),
        ]
        for name, payload in cases:
            with self.subTest(name=name):
                self.assert_rejected_without_session(client, payload)

        before_count = self.session_count()
        response = client.post("/api/sessions", json=["not", "an", "object"])
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.session_count(), before_count)

    def test_malformed_session_json_is_rejected_without_saving(self):
        client = self.login(self.patient)
        before_count = self.session_count()
        response = client.post(
            "/api/sessions",
            data="{",
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.session_count(), before_count)

    def test_invalid_duration_accuracy_target_counts_and_exercise_ids_are_rejected(self):
        client = self.login(self.patient)
        valid = self.valid_session_payload()
        cases = [
            ("zero duration", {**valid, "duration_seconds": 0}),
            ("duration beyond exercise", {**valid, "duration_seconds": self.exercise.duration_seconds + 1}),
            ("negative accuracy", {**valid, "avg_accuracy_score": -0.1}),
            ("accuracy over range", {**valid, "avg_accuracy_score": 100.1}),
            ("non-finite accuracy", {**valid, "avg_accuracy_score": float("nan")}),
            ("negative targets hit", {**valid, "targets_hit": -1}),
            ("zero total targets", {**valid, "total_targets": 0}),
            ("hits exceed samples", {**valid, "targets_hit": 2}),
            ("incorrect target total", {**valid, "total_targets": len(self.exercise.target_positions) + 1}),
            ("zero exercise id", {**valid, "exercise_id": 0}),
        ]
        for name, payload in cases:
            with self.subTest(name=name):
                self.assert_rejected_without_session(client, payload)

    def test_invalid_joint_angle_samples_are_rejected(self):
        client = self.login(self.patient)
        valid = self.valid_session_payload()
        cases = [
            ("wrong sample shape", {**valid, "joint_angle_data": [[10]]}),
            ("non-list sample", {**valid, "joint_angle_data": [10, 20]}),
            ("non-finite angle", {**valid, "joint_angle_data": [[float("inf"), 20]]}),
            ("negative angle", {**valid, "joint_angle_data": [[-1, 20]]}),
            ("angle over range", {**valid, "joint_angle_data": [[10, 181]]}),
        ]
        for name, payload in cases:
            with self.subTest(name=name):
                self.assert_rejected_without_session(client, payload)

    def test_excessive_joint_angle_sample_count_is_rejected(self):
        client = self.login(self.patient)
        payload = self.valid_session_payload()
        payload["joint_angle_data"] = [[10, 20]] * (MAX_JOINT_ANGLE_SAMPLES + 1)
        self.assert_rejected_without_session(client, payload)

    def test_oversized_session_request_is_rejected(self):
        client = self.login(self.patient)
        before_count = self.session_count()
        body = b'{"padding":"' + (b"x" * SESSION_PAYLOAD_MAX_BYTES) + b'"}'
        response = client.post(
            "/api/sessions",
            data=body,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 413)
        self.assertEqual(self.session_count(), before_count)

    def test_session_identity_fields_from_client_are_rejected(self):
        client = self.login(self.patient)
        for field, value in (
            ("patient_id", self.other_patient.id),
            ("session_id", 123456),
        ):
            with self.subTest(field=field):
                self.assert_rejected_without_session(
                    client, {**self.valid_session_payload(), field: value}
                )

    def test_therapist_assigns_exact_email_and_uses_authenticated_identity(self):
        response = self.login(self.therapist).post(
            "/api/patients/assign",
            json={"email": self.patient.email},
        )
        self.assertEqual(response.status_code, 201, response.get_data(as_text=True))
        self.assertEqual(response.get_json(), {"assigned": True, "already_assigned": False})

        with self.app.app_context():
            assigned = db.session.get(User, self.patient.id)
            self.assertEqual(assigned.assigned_therapist_id, self.therapist.id)

        list_response = self.login(self.therapist).get("/api/patients")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(
            [patient["id"] for patient in list_response.get_json()],
            [self.patient.id],
        )
        sessions_response = self.login(self.therapist).get(
            f"/api/sessions?patient_id={self.patient.id}"
        )
        self.assertEqual(sessions_response.status_code, 200)

    def test_repeating_assignment_is_idempotent(self):
        client = self.login(self.therapist)
        first = client.post("/api/patients/assign", json={"email": self.patient.email})
        second = client.post("/api/patients/assign", json={"email": self.patient.email})
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.get_json(), {"assigned": True, "already_assigned": True})

    def test_assignment_rejection_is_nondisclosing_for_unknown_nonpatient_and_taken_email(self):
        with self.app.app_context():
            patient = db.session.get(User, self.other_patient.id)
            patient.assigned_therapist_id = self.other_therapist.id
            db.session.commit()

        client = self.login(self.therapist)
        responses = [
            client.post("/api/patients/assign", json={"email": "unknown@example.test"}),
            client.post("/api/patients/assign", json={"email": self.other_therapist.email}),
            client.post("/api/patients/assign", json={"email": self.other_patient.email}),
        ]
        self.assertTrue(all(response.status_code == 404 for response in responses))
        self.assertEqual(responses[0].get_json(), responses[1].get_json())
        self.assertEqual(responses[0].get_json(), responses[2].get_json())

    def test_patient_and_unauthenticated_user_cannot_assign(self):
        patient_response = self.login(self.patient).post(
            "/api/patients/assign",
            json={"email": self.other_patient.email},
        )
        unauthenticated_response = self.app.test_client().post(
            "/api/patients/assign",
            json={"email": self.other_patient.email},
        )
        self.assertEqual(patient_response.status_code, 403)
        self.assertEqual(unauthenticated_response.status_code, 401)
        with self.app.app_context():
            self.assertIsNone(db.session.get(User, self.other_patient.id).assigned_therapist_id)

    def test_assignment_rejects_missing_invalid_and_malformed_email_requests(self):
        client = self.login(self.therapist)
        cases = [
            ("missing email", {}, 400),
            ("invalid email", {"email": "not-an-email"}, 400),
        ]
        for name, payload, status in cases:
            with self.subTest(name=name):
                response = client.post("/api/patients/assign", json=payload)
                self.assertEqual(response.status_code, status)

        malformed = client.post(
            "/api/patients/assign",
            data="{",
            content_type="application/json",
        )
        self.assertEqual(malformed.status_code, 400)

    def test_assignment_rejects_unexpected_and_client_supplied_therapist_fields(self):
        client = self.login(self.therapist)
        for extra_field, value in (
            ("unexpected", True),
            ("therapist_id", self.other_therapist.id),
            ("assigned_therapist_id", self.other_therapist.id),
        ):
            with self.subTest(field=extra_field):
                response = client.post(
                    "/api/patients/assign",
                    json={"email": self.patient.email, extra_field: value},
                )
                self.assertEqual(response.status_code, 400)
                with self.app.app_context():
                    self.assertIsNone(
                        db.session.get(User, self.patient.id).assigned_therapist_id
                    )
