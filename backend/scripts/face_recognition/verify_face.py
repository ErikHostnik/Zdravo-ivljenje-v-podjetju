import argparse
import cv2
import os
import json
import numpy as np

parser = argparse.ArgumentParser(description='Preveri ujemanje obraza z učnim modelom')
parser.add_argument('--model', type=str, required=True, help='Pot do LBPH modela (.yml)')
parser.add_argument('--image', type=str, required=True, help='Pot do testne slike')
args = parser.parse_args()

if not os.path.exists(args.model):
    print(json.dumps({"error": "Model ne obstaja"}))
    exit(1)

if not os.path.exists(args.image):
    print(json.dumps({"error": "Slika ne obstaja"}))
    exit(1)

try:
    cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    if not os.path.exists(cascade_path):
        print(json.dumps({"error": "Manjka Haar cascade datoteka"}))
        exit(1)
    face_cascade = cv2.CascadeClassifier(cascade_path)

    image = cv2.imread(args.image)
    if image is None:
        print(json.dumps({"error": "Napaka pri branju slike"}))
        exit(1)

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Detekcija obrazov
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(100, 100))
    if len(faces) == 0:
        print(json.dumps({"error": "Obraz ni bil zaznan"}))
        exit(1)

    x, y, w, h = faces[0]
    face_roi = gray[y:y+h, x:x+w]
    face_resized = cv2.resize(face_roi, (100, 100))

    model = cv2.face.LBPHFaceRecognizer_create()
    model.read(args.model)

    label, confidence = model.predict(face_resized)

    threshold = 90 
    match = confidence <= threshold

    result_json = json.dumps({
    "match": match,
    "confidence": float(confidence),
    "label": int(label)
    })
    print(result_json)
    with open("debug_output.json", "w") as f:
        f.write(result_json)

    print(json.dumps({
        "match": match,
        "confidence": float(confidence),
        "label": int(label)
    }))

except Exception as e:
    print(json.dumps({
        "error": "Napaka pri obdelavi",
        "details": str(e)
    }))
