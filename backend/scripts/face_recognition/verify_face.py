import argparse
import cv2
import face_recognition
import pickle
import json

parser = argparse.ArgumentParser()
parser.add_argument('--model', type=str, required=True)
parser.add_argument('--image', type=str, required=True)
args = parser.parse_args()

# Naloži LBPH‐model (ali pa “face_encodings” shranjen v pickle‐ju)
with open(args.model, 'rb') as f:
    known_encoding = pickle.load(f)

# Preberi prejeto sliko
image = cv2.imread(args.image)
rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

# Poišči obrazne lokacije in enkodiraj
face_locations = face_recognition.face_locations(rgb_image)
face_encodings = face_recognition.face_encodings(rgb_image, face_locations)

match_found = False
for face_encoding in face_encodings:
    match = face_recognition.compare_faces([known_encoding], face_encoding)[0]
    if match:
        match_found = True
        break

# Izhod kot JSON
print(json.dumps({ "match": match_found }))
