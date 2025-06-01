import argparse
import cv2
import os
import json
import numpy as np

# Nastavimo argumente
parser = argparse.ArgumentParser(description='Preveri ujemanje obraza')
parser.add_argument('--model', type=str, required=True, help='Pot do modela (.yml)')
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
    # Naložimo LBPH model
    model = cv2.face.LBPHFaceRecognizer_create()
    model.read(args.model)
    
    # Naložimo in pripravimo sliko
    image = cv2.imread(args.image)
    if image is None:
        print(json.dumps({"error": "Napaka pri branju slike"}))
        exit(1)
        
    # Pretvori v sivo sliko
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    # Uporabi pravilno velikost (100x100)
    resized = cv2.resize(gray, (100, 100))
    
    # Napovedujemo
    label, confidence = model.predict(resized)
    
    # Če je zaupanje pod 50, se šteje za uspešno ujemanje
    result = confidence < 50
    
    # Vrnemo rezultat
    print(json.dumps({
        "match": bool(result),
        "confidence": float(confidence),
        "label": int(label)
    }))
    
except Exception as e:
    print(json.dumps({
        "error": "Napaka pri obdelavi",
        "details": str(e)
    }))