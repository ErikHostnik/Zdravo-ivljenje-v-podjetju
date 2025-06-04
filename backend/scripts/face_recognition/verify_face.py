import argparse
import cv2
import os
import json
import numpy as np

# Argumenti ukazne vrstice
parser = argparse.ArgumentParser(description='Preveri ujemanje obraza z učnim modelom')
parser.add_argument('--model', type=str, required=True, help='Pot do LBPH modela (.yml)')
parser.add_argument('--image', type=str, required=True, help='Pot do testne slike')
args = parser.parse_args()

# Preverimo, če datoteke obstajajo
if not os.path.exists(args.model):
    print(json.dumps({"error": "Model ne obstaja"}))
    exit(1)

if not os.path.exists(args.image):
    print(json.dumps({"error": "Slika ne obstaja"}))
    exit(1)

try:
    # Naložimo Haar cascade za detekcijo obrazov
    cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    if not os.path.exists(cascade_path):
        print(json.dumps({"error": "Manjka Haar cascade datoteka"}))
        exit(1)
    face_cascade = cv2.CascadeClassifier(cascade_path)

    # Naložimo in pripravimo sliko
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

    # Predvidevamo, da uporabimo prvi zaznani obraz
    x, y, w, h = faces[0]
    face_roi = gray[y:y+h, x:x+w]
    face_resized = cv2.resize(face_roi, (100, 100))

    # Naložimo model
    model = cv2.face.LBPHFaceRecognizer_create()
    model.read(args.model)

    # Napoved
    label, confidence = model.predict(face_resized)

    # Meja zaupanja (manj pomeni boljše ujemanje)
    threshold = 85  # Prilagodi po potrebi
    match = confidence <= threshold

    # Rezultat v JSON obliki
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
