"""Exercise catalog seeding and server-side eligibility tests."""

import os
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from flask import Flask
os.environ["DATABASE_URL"] = "sqlite://"

from backend.app import app  # noqa: E402
from backend.models import Achievement, Exercise, ExerciseSession, User, db  # noqa: E402
from backend.services.exercise_programs import (  # noqa: E402
    EXERCISE_LIBRARY,
    get_exercise_program,
    get_unambiguous_exercises_by_normalized_name,
    get_unlocked_levels,
    is_valid_patient_profile,
    is_exercise_eligible,
    normalize_exercise_name,
    seed_exercises,
)


class ExerciseEligibilityTests(unittest.TestCase):
    PASSWORD = "test-password"

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        app.config["TESTING"] = True
        with app.app_context():
            db.create_all()
            seed_exercises(db, Exercise)

    def setUp(self):
        with app.app_context():
            ExerciseSession.query.delete()
            Achievement.query.delete()
            User.query.filter(User.email.like("cp114b-%@example.test")).delete(
                synchronize_session=False
            )
            self.patient = self.create_user(
                "cp114b-patient@example.test",
                "patient",
                stroke_type="ischemic",
                severity_level=1,
            )
            self.other_patient = self.create_user(
                "cp114b-other@example.test",
                "patient",
                stroke_type="ischemic",
                severity_level=5,
            )
            self.therapist = self.create_user(
                "cp114b-therapist@example.test",
                "therapist",
            )
            db.session.commit()
            self.patient_id = self.patient.id
            self.patient_email = self.patient.email
            self.other_patient_id = self.other_patient.id
            self.therapist_id = self.therapist.id
            self.therapist_email = self.therapist.email

    def tearDown(self):
        with app.app_context():
            ExerciseSession.query.delete()
            Achievement.query.delete()
            for user_id in (
                self.patient_id,
                self.other_patient_id,
                self.therapist_id,
            ):
                user = db.session.get(User, user_id)
                if user is not None:
                    db.session.delete(user)
            db.session.commit()

    @classmethod
    def create_user(cls, email, role, stroke_type=None, severity_level=None):
        user = User(
            email=email,
            full_name=email.split("@")[0],
            role=role,
            stroke_type=stroke_type,
            severity_level=severity_level,
        )
        user.set_password(cls.PASSWORD)
        db.session.add(user)
        db.session.flush()
        return user

    def login(self, email):
        client = app.test_client()
        response = client.post(
            "/api/auth/login",
            json={"email": email, "password": self.PASSWORD},
        )
        self.assertEqual(response.status_code, 200, response.get_data(as_text=True))
        return client

    def session_payload(self, exercise):
        return {
            "exercise_id": exercise if isinstance(exercise, int) else exercise.id,
            "duration_seconds": 1,
            "avg_accuracy_score": 75.5,
            "targets_hit": 0,
            "total_targets": max(
                1,
                len(getattr(exercise, "target_positions", [])),
            ),
            "joint_angle_data": [],
            "idempotency_key": "d5c5f290-49ab-41b1-a1a1-01ba0ab2f300",
        }

    def test_incremental_seed_preserves_catalog_and_patient_session_data(self):
        seed_app = Flask("isolated-exercise-seed-test")
        seed_app.config.update(
            SQLALCHEMY_DATABASE_URI="sqlite://",
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )
        db.init_app(seed_app)

        try:
            with seed_app.app_context():
                db.create_all()
                self.assertEqual(seed_exercises(db, Exercise), len(EXERCISE_LIBRARY))

                expected_names = {definition["name"] for definition in EXERCISE_LIBRARY}
                seeded = Exercise.query.all()
                self.assertEqual(len(seeded), 18)
                self.assertEqual({exercise.name for exercise in seeded}, expected_names)
                original_ids = {exercise.name: exercise.id for exercise in seeded}
                definitions_by_name = {
                    definition["name"]: definition for definition in EXERCISE_LIBRARY
                }
                for exercise in seeded:
                    definition = definitions_by_name[exercise.name]
                    self.assertEqual(exercise.level, definition["level"])
                    self.assertEqual(exercise.description, definition["description"])
                    self.assertEqual(exercise.category, definition["category"])
                    self.assertEqual(exercise.target_positions, definition["target_positions"])
                    self.assertEqual(exercise.duration_seconds, definition["duration_seconds"])
                    self.assertEqual(exercise.instructions, definition["instructions"])
                    self.assertEqual(
                        exercise.suitable_stroke_types,
                        definition["suitable_stroke_types"],
                    )
                    self.assertEqual(exercise.min_severity, definition["min_severity"])
                    self.assertEqual(exercise.max_severity, definition["max_severity"])
                    self.assertEqual(exercise.level_name, definition["level_name"])
                    self.assertEqual(exercise.icon_name, definition["icon_name"])
                    self.assertEqual(exercise.target_radius, definition["target_radius"])
                    self.assertEqual(
                        exercise.speed_requirement,
                        definition["speed_requirement"],
                    )

                retained = Exercise.query.filter_by(name="Gentle Forward Reach").one()
                retained.description = "Existing catalog row must not be overwritten."
                patient = User(
                    email="seed-patient@example.test",
                    full_name="Seed Test Patient",
                    role="patient",
                    password_hash="unused",
                    points=37,
                    streak_count=4,
                )
                db.session.add(patient)
                db.session.flush()
                session = ExerciseSession(
                    patient_id=patient.id,
                    exercise_id=retained.id,
                    duration_seconds=1,
                    avg_accuracy_score=50,
                    joint_angle_data_json="[]",
                )
                db.session.add(session)
                db.session.commit()
                session_id = session.id

                missing_names = {"Overhead Reach", "Figure-8 Trace"}
                Exercise.query.filter(
                    Exercise.name.in_(missing_names)
                ).delete(synchronize_session=False)
                db.session.commit()
                surviving_rows = {
                    exercise.name: (exercise.id, exercise.to_dict())
                    for exercise in Exercise.query.all()
                }

                self.assertEqual(seed_exercises(db, Exercise), 2)
                self.assertGreaterEqual(
                    Exercise.query.count(),
                    18,
                    msg=(
                        "After re-seeding the two deleted exercise rows, the total "
                        "catalog should return to at least the full 18-exercise "
                        "library including the six CP11.7 additions."
                    ),
                )
                self.assertEqual(seed_exercises(db, Exercise), 0)
                self.assertGreaterEqual(
                    Exercise.query.count(),
                    18,
                    msg=(
                        "After a no-op re-seed, the catalog should remain at "
                        "at least the full 18-exercise library."
                    ),
                )

                restored_rows = {
                    exercise.name: (exercise.id, exercise.to_dict())
                    for exercise in Exercise.query.all()
                }
                for name, snapshot in surviving_rows.items():
                    self.assertEqual(restored_rows[name], snapshot)
                self.assertEqual(
                    restored_rows["Gentle Forward Reach"][0],
                    original_ids["Gentle Forward Reach"],
                )
                retained_after_seed = Exercise.query.filter_by(
                    name="Gentle Forward Reach"
                ).one()
                self.assertEqual(
                    retained_after_seed.description,
                    "Existing catalog row must not be overwritten.",
                )
                self.assertEqual(
                    ExerciseSession.query.filter_by(id=session_id).count(),
                    1,
                )
                patient_after_seed = db.session.get(User, patient.id)
                self.assertEqual(patient_after_seed.points, 37)
                self.assertEqual(patient_after_seed.streak_count, 4)
        finally:
            with seed_app.app_context():
                db.session.remove()
                db.drop_all()
                db.engine.dispose()

    def test_seed_lock_serializes_concurrent_sqlite_startup(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            database_path = Path(temp_dir) / "seed.sqlite"
            seed_app = Flask("concurrent-exercise-seed-test")
            seed_app.config.update(
                SQLALCHEMY_DATABASE_URI=f"sqlite:///{database_path.as_posix()}",
                SQLALCHEMY_TRACK_MODIFICATIONS=False,
            )
            db.init_app(seed_app)
            try:
                with seed_app.app_context():
                    db.create_all()

                def seed_in_app_context():
                    with seed_app.app_context():
                        return seed_exercises(db, Exercise)

                with ThreadPoolExecutor(max_workers=2) as executor:
                    results = list(executor.map(lambda _: seed_in_app_context(), range(2)))

                with seed_app.app_context():
                    self.assertEqual(sorted(results), [0, len(EXERCISE_LIBRARY)])
                    self.assertEqual(Exercise.query.count(), len(EXERCISE_LIBRARY))
            finally:
                with seed_app.app_context():
                    db.session.remove()
                    db.drop_all()
                    db.engine.dispose()

    def test_seed_preserves_variant_names_and_duplicate_rows(self):
        seed_app = Flask("variant-exercise-seed-test")
        seed_app.config.update(
            SQLALCHEMY_DATABASE_URI="sqlite://",
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )
        db.init_app(seed_app)
        try:
            with seed_app.app_context():
                db.create_all()
                template = EXERCISE_LIBRARY[0]
                variant = Exercise(
                    name="  GENTLE   FORWARD REACH ",
                    description="Existing variant row.",
                    category=template["category"],
                    level=template["level"],
                    level_name=template["level_name"],
                    target_positions_json="[]",
                    duration_seconds=template["duration_seconds"],
                    instructions=template["instructions"],
                    suitable_stroke_types_json='["ischemic"]',
                    min_severity=1,
                    max_severity=5,
                )
                duplicate = Exercise(
                    name="gentle forward reach",
                    description="Existing duplicate row.",
                    category=template["category"],
                    level=template["level"],
                    level_name=template["level_name"],
                    target_positions_json="[]",
                    duration_seconds=template["duration_seconds"],
                    instructions=template["instructions"],
                    suitable_stroke_types_json='["ischemic"]',
                    min_severity=1,
                    max_severity=5,
                )
                db.session.add_all([variant, duplicate])
                db.session.commit()
                original_ids = {variant.id, duplicate.id}

                self.assertEqual(
                    seed_exercises(db, Exercise),
                    len(EXERCISE_LIBRARY) - 1,
                )
                self.assertEqual(
                    {
                        row.id
                        for row in Exercise.query.all()
                        if normalize_exercise_name(row.name)
                        == normalize_exercise_name(template["name"])
                    },
                    original_ids,
                )
                self.assertEqual(
                    len(
                        get_unambiguous_exercises_by_normalized_name(
                            Exercise.query.all()
                        )
                    ),
                    len(EXERCISE_LIBRARY) - 1,
                )
                self.assertEqual(
                    seed_exercises(db, Exercise),
                    0,
                )
        finally:
            with seed_app.app_context():
                db.session.remove()
                db.drop_all()
                db.engine.dispose()

    def test_severity_bands_keep_the_existing_unlocked_levels(self):
        expected = {
            1: [1],
            2: [1, 2],
            3: [1, 2],
            4: [1, 2, 3],
            5: [1, 2, 3],
        }
        for severity, levels in expected.items():
            with self.subTest(severity=severity):
                self.assertEqual(get_unlocked_levels("ischemic", severity), levels)
                program = get_exercise_program("ischemic", severity)
                self.assertTrue(
                    {exercise["level"] for exercise in program["exercises"]}.issubset(
                        set(levels)
                    )
                )

    def test_hemorrhagic_and_brainstem_exceptions_are_preserved(self):
        self.assertEqual(get_unlocked_levels("hemorrhagic", 4), [1, 2])
        self.assertEqual(get_unlocked_levels("hemorrhagic", 5), [1, 2, 3])
        self.assertEqual(get_unlocked_levels("brainstem", 3), [1, 2])
        self.assertEqual(get_unlocked_levels("brainstem", 4), [1, 2, 3])

        hemorrhagic_five = get_exercise_program("hemorrhagic", 5)
        self.assertFalse(
            any(exercise["level"] == 3 for exercise in hemorrhagic_five["exercises"])
        )
        brainstem_four = get_exercise_program("brainstem", 4)
        self.assertIn(
            "Precision Touch",
            {exercise["name"] for exercise in brainstem_four["exercises"]},
        )

    def test_exercise_policy_applies_level_stroke_and_severity_constraints(self):
        exercise = next(
            definition for definition in EXERCISE_LIBRARY
            if definition["name"] == "Precision Touch"
        )
        self.assertFalse(is_exercise_eligible(exercise, "ischemic", 2))
        self.assertTrue(is_exercise_eligible(exercise, "ischemic", 4))
        self.assertFalse(is_exercise_eligible(exercise, "hemorrhagic", 5))
        self.assertTrue(is_exercise_eligible(exercise, "brainstem", 4))

    def test_incomplete_and_unsupported_profiles_fail_closed(self):
        exercise = EXERCISE_LIBRARY[0]
        invalid_profiles = (
            (None, 1),
            ("unsupported", 1),
            ("ischemic", None),
            ("ischemic", 0),
            ("ischemic", 6),
            ("ischemic", "3"),
            ("ischemic", 3.5),
        )
        for stroke_type, severity in invalid_profiles:
            with self.subTest(stroke_type=stroke_type, severity=severity):
                self.assertFalse(is_valid_patient_profile(stroke_type, severity))
                self.assertEqual(get_unlocked_levels(stroke_type, severity), [])
                self.assertFalse(
                    is_exercise_eligible(exercise, stroke_type, severity)
                )
                self.assertEqual(
                    get_exercise_program(stroke_type, severity)["exercises"],
                    [],
                )

    def test_exhaustive_eligibility_matrix_for_all_severities_and_stroke_types(self):
        # Independently verified expected eligible exercise counts.
        # Counts derived from EXERCISE_LIBRARY + get_unlocked_levels() +
        # is_exercise_eligible() — not from a summary table.
        expected_counts = {
            # severity: {stroke_type: expected_count}
            1: {"ischemic": 6, "hemorrhagic": 6, "brainstem": 6, "tia": 6},
            2: {"ischemic": 11, "hemorrhagic": 10, "brainstem": 11, "tia": 11},
            3: {"ischemic": 13, "hemorrhagic": 10, "brainstem": 11, "tia": 13},
            4: {"ischemic": 14, "hemorrhagic": 6, "brainstem": 9, "tia": 14},
            5: {"ischemic": 11, "hemorrhagic": 3, "brainstem": 6, "tia": 11},
        }

        for severity in (1, 2, 3, 4, 5):
            for stroke_type in ("ischemic", "hemorrhagic", "brainstem", "tia"):
                with self.subTest(severity=severity, stroke_type=stroke_type):
                    eligible = [
                        ex
                        for ex in EXERCISE_LIBRARY
                        if is_exercise_eligible(ex, stroke_type, severity)
                    ]
                    self.assertEqual(
                        len(eligible),
                        expected_counts[severity][stroke_type],
                        msg=(
                            f"{stroke_type} severity {severity}: expected "
                            f"{expected_counts[severity][stroke_type]} eligible, "
                            f"got {len(eligible)}"
                        ),
                    )
                    # Confirm eligibility implies level is unlocked and constraints pass.
                    unlocked = set(get_unlocked_levels(stroke_type, severity))
                    for ex in eligible:
                        self.assertIn(
                            ex["level"],
                            unlocked,
                            msg=(f"{ex['name']} level {ex['level']} not in "
                                 f"unlocked {unlocked} for "
                                 f"{stroke_type} sev {severity}"),
                        )

    def test_patient_catalog_listing_is_filtered_by_server_profile(self):
        response = self.login(self.patient_email).get("/api/exercises")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json())
        self.assertEqual({exercise["level"] for exercise in response.get_json()}, {1})

    def test_patient_cannot_change_eligibility_fields_in_profile_update(self):
        client = self.login(self.patient_email)
        for update in (
            {"severity_level": 5},
            {"stroke_type": "tia"},
        ):
            with self.subTest(update=update):
                response = client.put("/api/auth/profile", json=update)
                self.assertEqual(response.status_code, 403)

        with app.app_context():
            patient = db.session.get(User, self.patient_id)
            self.assertEqual(patient.stroke_type, "ischemic")
            self.assertEqual(patient.severity_level, 1)

        unrelated_update = client.put(
            "/api/auth/profile",
            json={"full_name": "Updated Patient Name"},
        )
        self.assertEqual(unrelated_update.status_code, 200)
        self.assertEqual(
            unrelated_update.get_json()["user"]["full_name"],
            "Updated Patient Name",
        )

    def test_assigned_therapist_can_still_update_patient_severity(self):
        with app.app_context():
            patient = db.session.get(User, self.patient_id)
            patient.assigned_therapist_id = self.therapist_id
            db.session.commit()

        response = self.login(self.therapist_email).put(
            f"/api/patients/{self.patient_id}/severity",
            json={"severity_level": 3},
        )
        self.assertEqual(response.status_code, 200, response.get_data(as_text=True))
        with app.app_context():
            patient = db.session.get(User, self.patient_id)
            self.assertEqual(patient.severity_level, 3)

    def test_invalid_stored_profiles_are_denied_by_catalog_detail_and_save(self):
        with app.app_context():
            exercise_id = Exercise.query.filter_by(level=1).first().id

        client = self.login(self.patient_email)
        invalid_profiles = (
            (None, 1),
            ("unsupported", 1),
            ("ischemic", None),
            ("ischemic", 0),
            ("ischemic", 6),
            ("ischemic", "malformed"),
        )
        for stroke_type, severity in invalid_profiles:
            with self.subTest(stroke_type=stroke_type, severity=severity):
                with app.app_context():
                    patient = db.session.get(User, self.patient_id)
                    patient.stroke_type = stroke_type
                    patient.severity_level = severity
                    db.session.commit()

                self.assertEqual(client.get("/api/exercises").get_json(), [])
                self.assertEqual(client.get(f"/api/exercises/{exercise_id}").status_code, 404)
                self.assertEqual(client.get("/api/exercises/program").status_code, 409)
                self.assertEqual(client.get("/api/exercises/daily-plan").status_code, 409)
                payload = self.session_payload(exercise_id)
                payload["idempotency_key"] = str(uuid4())
                response = client.post("/api/sessions", json=payload)
                self.assertEqual(response.status_code, 404)

        with app.app_context():
            self.assertEqual(
                ExerciseSession.query.filter_by(patient_id=self.patient_id).count(),
                0,
            )

    def test_ineligible_detail_is_indistinguishable_from_missing_exercise(self):
        with app.app_context():
            ineligible = Exercise.query.filter_by(level=2).first()
            self.assertIsNotNone(ineligible)
            exercise_id = ineligible.id

        client = self.login(self.patient_email)
        denied = client.get(f"/api/exercises/{exercise_id}")
        missing = client.get("/api/exercises/2147483000")
        malformed = client.get("/api/exercises/not-an-id")

        self.assertEqual(denied.status_code, 404)
        self.assertEqual(denied.status_code, missing.status_code)
        self.assertEqual(denied.get_data(), missing.get_data())
        self.assertEqual(malformed.status_code, 404)

    def test_session_save_rejects_an_ineligible_exercise_without_writing(self):
        with app.app_context():
            ineligible = Exercise.query.filter_by(level=3).first()
            payload = self.session_payload(ineligible)
            missing_payload = {
                **payload,
                "exercise_id": 2147483000,
                "idempotency_key": "146beaa8-b077-4b15-9d3b-01cdb3d60564",
            }

        client = self.login(self.patient_email)
        response = client.post("/api/sessions", json=payload)
        missing = client.post("/api/sessions", json=missing_payload)
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.get_data(), missing.get_data())
        with app.app_context():
            self.assertEqual(
                ExerciseSession.query.filter_by(patient_id=self.patient_id).count(),
                0,
            )

    def test_ambiguous_name_variants_are_not_resolved_for_patients(self):
        with app.app_context():
            original = Exercise.query.filter_by(name="Gentle Forward Reach").one()
            original_id = original.id
            duplicate = Exercise(
                name="  GENTLE   FORWARD REACH ",
                description="Existing duplicate must remain untouched.",
                category=original.category,
                level=original.level,
                level_name=original.level_name,
                target_positions_json=original.target_positions_json,
                duration_seconds=original.duration_seconds,
                instructions=original.instructions,
                suitable_stroke_types_json=original.suitable_stroke_types_json,
                min_severity=original.min_severity,
                max_severity=original.max_severity,
            )
            db.session.add(duplicate)
            db.session.commit()
            duplicate_id = duplicate.id
            patient = db.session.get(User, self.patient_id)
            patient.severity_level = 5
            db.session.commit()

        client = self.login(self.patient_email)
        with patch(
            "backend.services.daily_plan._utc_today",
            return_value=date(2026, 1, 1),
        ):
            program = client.get("/api/exercises/program").get_json()
            daily_plan = client.get("/api/exercises/daily-plan").get_json()

        self.assertNotIn(
            original_id,
            {exercise["id"] for exercise in program["exercises"]},
        )
        self.assertNotIn(
            "Gentle Forward Reach",
            {exercise["name"] for exercise in daily_plan["exercises"]},
        )
        for exercise_id in (original_id, duplicate_id):
            self.assertEqual(
                client.get(f"/api/exercises/{exercise_id}").status_code,
                404,
            )
            payload = {
                **self.session_payload(exercise_id),
                "idempotency_key": str(uuid4()),
            }
            self.assertEqual(
                client.post("/api/sessions", json=payload).status_code,
                404,
            )

        with app.app_context():
            db.session.delete(db.session.get(Exercise, duplicate_id))
            db.session.commit()

    def test_eligible_session_save_and_idempotent_retry_remain_valid(self):
        with app.app_context():
            patient = db.session.get(User, self.patient_id)
            patient.severity_level = 5
            exercise = Exercise.query.filter_by(level=3).first()
            payload = self.session_payload(exercise)
            db.session.commit()

        client = self.login(self.patient_email)
        first = client.post("/api/sessions", json=payload)
        self.assertEqual(first.status_code, 201, first.get_data(as_text=True))

        with app.app_context():
            patient = db.session.get(User, self.patient_id)
            patient.severity_level = 1
            db.session.commit()

        retry = client.post("/api/sessions", json=payload)
        self.assertEqual(retry.status_code, 201, retry.get_data(as_text=True))
        self.assertEqual(retry.get_json(), first.get_json())
        with app.app_context():
            self.assertEqual(
                ExerciseSession.query.filter_by(patient_id=self.patient_id).count(),
                1,
            )

    def test_malformed_and_missing_exercise_ids_fail_without_saving(self):
        client = self.login(self.patient_email)
        with app.app_context():
            base = self.session_payload(Exercise.query.filter_by(level=1).first())
        for exercise_id, expected_status in (
            (True, 400),
            ("not-an-id", 400),
            (2147483000, 404),
        ):
            with self.subTest(exercise_id=exercise_id):
                response = client.post(
                    "/api/sessions",
                    json={**base, "exercise_id": exercise_id},
                )
                self.assertEqual(response.status_code, expected_status)
        with app.app_context():
            self.assertEqual(
                ExerciseSession.query.filter_by(patient_id=self.patient_id).count(),
                0,
            )

    def test_non_patient_cannot_save_patient_sessions(self):
        response = self.login(self.therapist_email).post(
            "/api/sessions",
            json={"malformed": "payload"},
        )
        self.assertEqual(response.status_code, 403)
        with app.app_context():
            self.assertEqual(ExerciseSession.query.count(), 0)

    def test_client_cannot_submit_another_patient_identity(self):
        with app.app_context():
            exercise = Exercise.query.filter_by(level=1).first()
            other_patient_id = self.other_patient_id
        payload = {
            **self.session_payload(exercise),
            "patient_id": other_patient_id,
        }
        response = self.login(self.patient_email).post("/api/sessions", json=payload)
        self.assertEqual(response.status_code, 400)
        with app.app_context():
            self.assertEqual(ExerciseSession.query.count(), 0)

    def test_exercise_name_normalization_variants_and_missing_values(self):
        # Case differences
        self.assertEqual(normalize_exercise_name("GENTLE FORWARD REACH"), "gentle forward reach")
        self.assertEqual(normalize_exercise_name("Gentle Forward Reach"), "gentle forward reach")
        self.assertEqual(normalize_exercise_name("gentle forward reach"), "gentle forward reach")

        # Leading, trailing, and repeated whitespace
        self.assertEqual(normalize_exercise_name("   Gentle   Forward    Reach   "), "gentle forward reach")
        self.assertEqual(normalize_exercise_name("\tGentle\n Forward \r\nReach "), "gentle forward reach")

        # Missing mappings / non-string inputs
        self.assertEqual(normalize_exercise_name(None), "")
        self.assertEqual(normalize_exercise_name(123), "")
        self.assertEqual(normalize_exercise_name(""), "")
        self.assertEqual(normalize_exercise_name("   "), "")


if __name__ == "__main__":
    unittest.main()
