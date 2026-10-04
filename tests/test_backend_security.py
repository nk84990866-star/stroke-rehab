"""Focused backend security and session-integrity tests."""

import os
import json
import unittest
from unittest.mock import patch

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.exc import SQLAlchemyError

# backend.app creates an application during import. Force its database URL to
# an isolated in-memory SQLite database before importing it.
os.environ["DATABASE_URL"] = "sqlite://"

from backend.app import (  # noqa: E402
    PROJECTED_ELBOW_ANGLE_COLUMN,
    _RequiredSchemaMigrationError,
    _ensure_projected_elbow_angle_column,
    _ensure_projected_elbow_angle_column_or_defer,
    app,
    create_app,
)
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

    def valid_projected_elbow_angle_data(self):
        return {
            "version": 1,
            "coordinate_system": "mediapipe_normalized_image_xy",
            "samples": [
                {"angle_deg": 92.4, "elapsed_ms": 1234.5, "side": "left"},
                {"angle_deg": 91, "elapsed_ms": 1260, "side": "right"},
            ],
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

    def test_existing_database_column_migration_is_additive_and_idempotent(self):
        engine = create_engine("sqlite://")
        try:
            with engine.begin() as connection:
                connection.execute(text(
                    "CREATE TABLE exercise_sessions "
                    "(id INTEGER PRIMARY KEY, joint_angle_data_json TEXT)"
                ))
                connection.execute(text(
                    "INSERT INTO exercise_sessions (id, joint_angle_data_json) "
                    "VALUES (1, '[[10, 20]]')"
                ))

            self.assertTrue(_ensure_projected_elbow_angle_column(engine))
            self.assertFalse(_ensure_projected_elbow_angle_column(engine))
            columns = {
                column["name"]: column
                for column in inspect(engine).get_columns("exercise_sessions")
            }
            self.assertIn(PROJECTED_ELBOW_ANGLE_COLUMN, columns)
            self.assertTrue(columns[PROJECTED_ELBOW_ANGLE_COLUMN]["nullable"])
            with engine.connect() as connection:
                row = connection.execute(text(
                    "SELECT id, joint_angle_data_json, projected_elbow_angle_data_json "
                    "FROM exercise_sessions WHERE id = 1"
                )).one()
            self.assertEqual(row.joint_angle_data_json, "[[10, 20]]")
            self.assertIsNone(row.projected_elbow_angle_data_json)
        finally:
            engine.dispose()

    def test_reachable_database_migration_failure_fails_startup(self):
        migration_error = SQLAlchemyError("DDL permission denied")
        with (
            patch("backend.app.db.create_all"),
            patch("backend.app._ensure_projected_elbow_angle_column", side_effect=migration_error),
            patch("backend.app._database_is_available", return_value=True),
            patch("backend.app.seed_exercises"),
        ):
            with self.assertRaises(_RequiredSchemaMigrationError):
                create_app()

    def test_reachable_ddl_failure_is_not_treated_as_database_outage(self):
        engine = create_engine("sqlite://")

        def reject_migration_ddl(connection, cursor, statement, parameters, context, executemany):
            if statement.startswith("ALTER TABLE exercise_sessions"):
                raise SQLAlchemyError("DDL permission denied")

        try:
            with engine.begin() as connection:
                connection.execute(text(
                    "CREATE TABLE exercise_sessions "
                    "(id INTEGER PRIMARY KEY, joint_angle_data_json TEXT)"
                ))
            event.listen(engine, "before_cursor_execute", reject_migration_ddl)

            with self.assertRaises(_RequiredSchemaMigrationError):
                _ensure_projected_elbow_angle_column_or_defer(engine)

            columns = {column["name"] for column in inspect(engine).get_columns("exercise_sessions")}
            self.assertNotIn(PROJECTED_ELBOW_ANGLE_COLUMN, columns)
        finally:
            event.remove(engine, "before_cursor_execute", reject_migration_ddl)
            engine.dispose()

    def test_unavailable_database_keeps_degraded_startup_behavior(self):
        with (
            patch("backend.app.db.create_all"),
            patch(
                "backend.app._ensure_projected_elbow_angle_column",
                side_effect=SQLAlchemyError("database unavailable"),
            ),
            patch("backend.app._database_is_available", return_value=False),
            patch("backend.app.seed_exercises"),
        ):
            degraded_app = create_app()

        self.assertIsNotNone(degraded_app)

    def test_legacy_session_payload_and_metrics_are_unchanged_with_projected_data(self):
        client = self.login(self.patient)
        legacy_payload = self.valid_session_payload()
        legacy_response = client.post("/api/sessions", json=legacy_payload)
        self.assertEqual(legacy_response.status_code, 201)
        legacy_session = legacy_response.get_json()["session"]
        self.assertEqual(legacy_session["joint_angle_data"], legacy_payload["joint_angle_data"])
        self.assertIsNone(legacy_session["projected_elbow_angle_data"])

        payload_with_projected = {
            **legacy_payload,
            "projected_elbow_angle_data": self.valid_projected_elbow_angle_data(),
        }
        projected_response = client.post("/api/sessions", json=payload_with_projected)
        self.assertEqual(projected_response.status_code, 201)
        projected_session = projected_response.get_json()["session"]
        self.assertEqual(projected_session["joint_angle_data"], legacy_payload["joint_angle_data"])
        self.assertEqual(
            projected_session["projected_elbow_angle_data"],
            payload_with_projected["projected_elbow_angle_data"],
        )
        for field in (
            "avg_accuracy_score",
            "max_rom_achieved",
            "avg_joint_velocity",
            "movement_smoothness_score",
            "overall_score",
            "targets_hit",
            "total_targets",
        ):
            self.assertEqual(projected_session[field], legacy_session[field], field)

        with self.app.app_context():
            saved = ExerciseSession.query.order_by(ExerciseSession.id.desc()).first()
            self.assertEqual(
                json.loads(saved.projected_elbow_angle_data_json),
                payload_with_projected["projected_elbow_angle_data"],
            )

    def test_empty_projected_sample_list_is_persisted(self):
        projected_data = {
            "version": 1,
            "coordinate_system": "mediapipe_normalized_image_xy",
            "samples": [],
        }
        response = self.login(self.patient).post(
            "/api/sessions",
            json={
                **self.valid_session_payload(),
                "projected_elbow_angle_data": projected_data,
            },
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            response.get_json()["session"]["projected_elbow_angle_data"],
            projected_data,
        )

    def test_omitted_and_explicit_null_projected_data_store_null(self):
        client = self.login(self.patient)
        omitted = client.post("/api/sessions", json=self.valid_session_payload())
        explicit_null = client.post(
            "/api/sessions",
            json={
                **self.valid_session_payload(),
                "projected_elbow_angle_data": None,
            },
        )
        self.assertEqual(omitted.status_code, 201)
        self.assertEqual(explicit_null.status_code, 201)
        self.assertIsNone(omitted.get_json()["session"]["projected_elbow_angle_data"])
        self.assertIsNone(explicit_null.get_json()["session"]["projected_elbow_angle_data"])
        with self.app.app_context():
            sessions = ExerciseSession.query.order_by(ExerciseSession.id).all()
            self.assertIsNone(sessions[-2].projected_elbow_angle_data_json)
            self.assertIsNone(sessions[-1].projected_elbow_angle_data_json)

    def test_invalid_projected_elbow_data_is_rejected_without_creating_session(self):
        valid = self.valid_projected_elbow_angle_data()
        cases = [
            ("wrong version", {**valid, "version": 2}),
            ("boolean version", {**valid, "version": True}),
            ("wrong coordinate system", {**valid, "coordinate_system": "world"}),
            ("wrong samples type", {**valid, "samples": {}}),
            ("missing top-level field", {key: value for key, value in valid.items() if key != "samples"}),
            ("extra top-level field", {**valid, "patient_id": self.other_patient.id}),
            ("invalid side", {**valid, "samples": [{**valid["samples"][0], "side": "both"}]}),
            ("non-finite angle", {**valid, "samples": [{**valid["samples"][0], "angle_deg": float("nan")}]}),
            ("infinite angle", {**valid, "samples": [{**valid["samples"][0], "angle_deg": float("inf")}]}),
            ("angle below range", {**valid, "samples": [{**valid["samples"][0], "angle_deg": -0.1}]}),
            ("angle above range", {**valid, "samples": [{**valid["samples"][0], "angle_deg": 180.1}]}),
            ("non-finite timestamp", {**valid, "samples": [{**valid["samples"][0], "elapsed_ms": float("nan")}]}),
            ("infinite timestamp", {**valid, "samples": [{**valid["samples"][0], "elapsed_ms": float("inf")}]}),
            ("negative timestamp", {**valid, "samples": [{**valid["samples"][0], "elapsed_ms": -0.1}]}),
            (
                "decreasing timestamps",
                {**valid, "samples": [
                    {"angle_deg": 90, "elapsed_ms": 5, "side": "left"},
                    {"angle_deg": 90, "elapsed_ms": 4, "side": "left"},
                ]},
            ),
            (
                "missing sample field",
                {**valid, "samples": [{key: value for key, value in valid["samples"][0].items() if key != "side"}]},
            ),
            (
                "extra sample field",
                {**valid, "samples": [{**valid["samples"][0], "session_id": 1}]},
            ),
            (
                "identity fields in request",
                {**valid, "patient_id": self.other_patient.id, "session_id": 9876},
            ),
        ]
        client = self.login(self.patient)
        for name, projected_data in cases:
            with self.subTest(name=name):
                self.assert_rejected_without_session(
                    client,
                    {
                        **self.valid_session_payload(),
                        "projected_elbow_angle_data": projected_data,
                    },
                )

        excessive = {
            **valid,
            "samples": [
                {"angle_deg": 90, "elapsed_ms": index, "side": "left"}
                for index in range(MAX_JOINT_ANGLE_SAMPLES + 1)
            ],
        }
        with self.subTest(name="excessive samples"):
            self.assert_rejected_without_session(
                client,
                {
                    **self.valid_session_payload(),
                    "projected_elbow_angle_data": excessive,
                },
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
