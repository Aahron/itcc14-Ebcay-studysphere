from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

import os

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///studysphere.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

# db models
class Subject(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    teacher = db.Column(db.String(100), nullable=False)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "teacher": self.teacher}

class Announcement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey("subject.id"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    date_posted = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "subject_id": self.subject_id,
            "title": self.title,
            "content": self.content,
            "date_posted": self.date_posted.isoformat()
        }


class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    announcement_id = db.Column(db.Integer, db.ForeignKey("announcement.id"), nullable=False)
    user = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)
    date_posted = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "announcement_id": self.announcement_id,
            "user": self.user,
            "content": self.content,
            "date_posted": self.date_posted.isoformat()
        }

class Material(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey("subject.id"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(200))
    file_url = db.Column(db.String(500))
    date_uploaded = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "subject_id": self.subject_id,
            "title": self.title,
            "description": self.description,
            "file_url": self.file_url,
            "date_uploaded": self.date_uploaded.isoformat()
        }


class Assignment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey("subject.id"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    instructions = db.Column(db.Text)
    due_date = db.Column(db.String(20), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "subject_id": self.subject_id,
            "title": self.title,
            "instructions": self.instructions,
            "due_date": self.due_date
        }

class Reminder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey("subject.id"), nullable=False)
    message = db.Column(db.String(200), nullable=False)
    remind_at = db.Column(db.String(50), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "subject_id": self.subject_id,
            "message": self.message,
            "remind_at": self.remind_at
        }

# create db code 
with app.app_context():
    if not os.path.exists("studysphere.db"):
        db.create_all()
        print("Database created.")

# Frontend template routes
@app.route("/")
def dashboard():
    return render_template("dashboard.html")

@app.route("/subjects")
def subjects():
    return render_template("subjects.html")

@app.route("/announcements")
def announcements():
    return render_template("announcements.html")

@app.route("/materials")
def materials():
    return render_template("materials.html")

@app.route("/assignments")
def assignments():
    return render_template("assignments.html")

@app.route("/reminders")
def reminders():
    return render_template("reminders.html")

## Subject endpoints here
@app.get("/subject")
def get_subjects():
    subjects = Subject.query.all()
    return jsonify([s.to_dict() for s in subjects])

# havent figured out how it still accepts null values on html js script...
@app.post("/subject")
def create_subject():
    data = request.json
    name = data.get("name", "").strip()
    teacher = data.get("teacher", "").strip()
    if not name or not teacher:
        return jsonify({"error": "Both 'name' and 'teacher' are required and cannot be empty"}), 400
    subject = Subject(name=name, teacher=teacher)
    db.session.add(subject)
    db.session.commit()
    return jsonify(subject.to_dict()), 201

@app.get("/subject/<int:id>")
def get_subject(id):
    subject = Subject.query.get(id)
    if not subject:
        return {"error": "Subject not found"}, 404
    return subject.to_dict()

@app.put("/subject/<int:id>")
def update_subject(id):
    subject = Subject.query.get(id)
    if not subject:
        return {"error": "Subject not found"}, 404

    data = request.json
    subject.name = data["name"]
    subject.teacher = data["teacher"]
    db.session.commit()

    return subject.to_dict()

@app.delete("/subject/<int:id>")
def delete_subject(id):
    subject = Subject.query.get(id)
    if not subject:
        return {"error": "Not found"}, 404

    db.session.delete(subject)
    db.session.commit()
    return "", 204

# announcement endpoints here
@app.get("/announcement")
def get_all_announcements():
    announcements = Announcement.query.order_by(Announcement.date_posted.desc()).all()
    return jsonify([a.to_dict() for a in announcements])

@app.get("/subject/<int:id>/announcement")
def get_announcements_for_subject(id):
    announcements = Announcement.query.filter_by(subject_id=id).all()
    return jsonify([a.to_dict() for a in announcements])

@app.post("/subject/<int:id>/announcement")
def create_announcement(id):
    data = request.json
    announcement = Announcement(
        subject_id=id,
        title=data["title"],
        content=data["content"]
    )
    db.session.add(announcement)
    db.session.commit()
    return jsonify(announcement.to_dict()), 201

@app.get("/announcement/<int:id>")
def get_announcement(id):
    announcement = Announcement.query.get(id)
    if not announcement:
        return {"error": "Not found"}, 404
    return announcement.to_dict()

@app.put("/announcement/<int:id>")
def update_announcement(id):
    announcement = Announcement.query.get(id)
    if not announcement:
        return {"error": "Not found"}, 404

    data = request.json
    announcement.title = data["title"]
    announcement.content = data["content"]
    db.session.commit()

    return announcement.to_dict()

@app.delete("/announcement/<int:id>")
def delete_announcement(id):
    announcement = Announcement.query.get(id)
    if not announcement:
        return {"error": "Not found"}, 404

    db.session.delete(announcement)
    db.session.commit()
    return "", 204

@app.delete("/material/<int:id>")
def delete_material(id):
    material = Material.query.get(id)
    if not material:
        return {"error": "Not found"}, 404
    
    db.session.delete(material)
    db.session.commit()
    return "", 204

@app.delete("/assignment/<int:id>")
def delete_assignment(id):
    assignment = Assignment.query.get(id)
    if not assignment:
        return {"error": "Not found"}, 404
    
    db.session.delete(assignment)
    db.session.commit()
    return "", 204

@app.delete("/reminder/<int:id>")
def delete_reminder(id):
    reminder = Reminder.query.get(id)
    if not reminder:
        return {"error": "Not found"}, 404
    
    db.session.delete(reminder)
    db.session.commit()
    return "", 204

# comments endpoints
@app.get("/announcement/<int:id>/comments")
def get_comments(id):
    comments = Comment.query.filter_by(announcement_id=id).all()
    return jsonify([c.to_dict() for c in comments])

@app.post("/announcement/<int:id>/comments")
def add_comment(id):
    data = request.json
    comment = Comment(
        announcement_id=id,
        user=data["user"],
        content=data["content"],
    )
    db.session.add(comment)
    db.session.commit()
    return jsonify(comment.to_dict()), 201

# materials endpoints
@app.get("/material")
def get_all_materials():
    materials = Material.query.order_by(Material.date_uploaded.desc()).all()
    return jsonify([m.to_dict() for m in materials])

@app.get("/subject/<int:id>/materials")
def get_materials(id):
    materials = Material.query.filter_by(subject_id=id).all()
    return jsonify([m.to_dict() for m in materials])

@app.post("/subject/<int:id>/materials")
def create_material(id):
    data = request.json
    material = Material(
        subject_id=id,
        title=data["title"],
        description=data.get("description"),
        file_url=data.get("file_url")
    )
    db.session.add(material)
    db.session.commit()
    return jsonify(material.to_dict()), 201

# assignments endpoints
@app.get("/assignment")
def get_all_assignments():
    assignments = Assignment.query.all()
    return jsonify([a.to_dict() for a in assignments])

@app.get("/subject/<int:id>/assignments")
def get_assignments(id):
    assignments = Assignment.query.filter_by(subject_id=id).all()
    return jsonify([a.to_dict() for a in assignments])

@app.post("/subject/<int:id>/assignments")
def create_assignment(id):
    data = request.json
    assignment = Assignment(
        subject_id=id,
        title=data["title"],
        instructions=data.get("instructions"),
        due_date=data["due_date"]
    )
    db.session.add(assignment)
    db.session.commit()
    return jsonify(assignment.to_dict()), 201

# reminders endpoints
@app.get("/reminder")
def get_all_reminders():
    reminders = Reminder.query.all()
    return jsonify([r.to_dict() for r in reminders])

@app.get("/subject/<int:id>/reminders")
def get_reminders(id):
    reminders = Reminder.query.filter_by(subject_id=id).all()
    return jsonify([r.to_dict() for r in reminders])

@app.post("/subject/<int:id>/reminders")
def create_reminder(id):
    data = request.json
    reminder = Reminder(
        subject_id=id,
        message=data["message"],
        remind_at=data["remind_at"]
    )
    db.session.add(reminder)
    db.session.commit()
    return jsonify(reminder.to_dict()), 201

# feed endpoints
@app.get("/feed/latest")
def feed_latest():
    announcements = Announcement.query.all()
    materials = Material.query.all()

    feed = []

    for a in announcements:
        feed.append({
            "type": "announcement",
            "title": a.title,
            "preview": a.content[:80],
            "subject": a.subject_id,
            "date_posted": a.date_posted.isoformat()
        })

    for m in materials:
        feed.append({
            "type": "material",
            "title": m.title,
            "preview": m.description[:80] if m.description else "",
            "subject": m.subject_id,
            "date_posted": m.date_uploaded.isoformat()
        })

    return jsonify(feed)

@app.get("/feed/upcoming-deadlines")
def feed_deadlines():
    assignments = Assignment.query.all()
    reminders = Reminder.query.all()

    deadlines = []

    for a in assignments:
        deadlines.append({
            "type": "assignment",
            "title": a.title,
            "due_date": a.due_date,
            "subject": a.subject_id
        })

    for r in reminders:
        deadlines.append({
            "type": "reminder",
            "title": r.message,
            "due_date": r.remind_at,
            "subject": r.subject_id
        })

    return jsonify(deadlines)

if __name__ == "__main__":
    app.run(debug=True)