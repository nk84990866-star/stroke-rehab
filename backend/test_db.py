import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + "/../")

from backend.app import create_app
from backend.models import db, User

app = create_app()
with app.app_context():
    # Attempt to insert a test user
    try:
        test_user = User.query.filter_by(email="test@example.com").first()
        if test_user:
            db.session.delete(test_user)
            db.session.commit()
            print("Deleted old test user.")
        
        user = User(
            email="test@example.com",
            full_name="Test User",
            role="patient",
            stroke_type="ischemic",
            affected_side="left",
            severity_level=3
        )
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()
        print("Success! Created test user in database.")
    except Exception as e:
        print("Database insertion error:", e)
