from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
import cv2
import os

app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────
# LOAD LANDMARK MODEL
# ─────────────────────────────────────

print("Loading landmark model...")
model = tf.keras.models.load_model("landmark_model.h5", compile=False)
print("Model loaded!")

# Class names — same order as your training
classes = [
    "Computer_Science_Block",
    "Convocation_Centre",
    "Electrical_Science_Block",
    "Main_Gate",
    "Mechanical_Science_Block"
]

# Display names shown in the app UI
building_map = {
    "Computer_Science_Block":   "Computer Science Block",
    "Convocation_Centre":       "Convocation Centre",
    "Electrical_Science_Block": "Electrical Science Block",
    "Main_Gate":                "Main Gate",
    "Mechanical_Science_Block": "Mechanical Science Block"
}

# ─────────────────────────────────────
# ROUTES
# ─────────────────────────────────────

@app.route("/")
def home():
    return jsonify({
        "status":  "Crescent AI Landmark Server running",
        "college": "B.S. Abdur Rahman Crescent Institute of Science & Technology",
        "model":   "Landmark CNN",
        "classes": list(building_map.values())
    })

@app.route("/ping")
def ping():
    # UptimeRobot hits this every 5 min to keep Replit awake
    return jsonify({ "ping": "pong" })

@app.route("/predict", methods=["POST"])
def predict():

    # Check image was sent
    if "image" not in request.files:
        return jsonify({ "error": "No image uploaded" }), 400

    file = request.files["image"]

    # Decode image
    img = cv2.imdecode(
        np.frombuffer(file.read(), np.uint8),
        cv2.IMREAD_COLOR
    )

    if img is None:
        return jsonify({ "error": "Invalid image — could not decode" }), 400

    # Preprocess — same as training
    img = cv2.resize(img, (224, 224))
    img = img / 255.0
    img = np.expand_dims(img, axis=0)

    # Predict
    prediction      = model.predict(img)
    confidence      = float(np.max(prediction)) * 100
    predicted_index = int(np.argmax(prediction))
    predicted_class = classes[predicted_index]
    building_name   = building_map.get(predicted_class, predicted_class)

    print(f"Predicted: {building_name} ({confidence:.1f}%)")

    return jsonify({
        "building":   building_name,
        "confidence": round(confidence, 2)
    })

# ─────────────────────────────────────
# START SERVER
# ─────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))  # Replit uses 8080
    app.run(host="0.0.0.0", port=port, debug=False)