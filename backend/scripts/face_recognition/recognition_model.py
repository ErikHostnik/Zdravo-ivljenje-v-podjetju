import cv2
import os
import sys
import numpy as np
from sklearn.model_selection import train_test_split
import requests

# -------------------------------------------------------------------
# Namesto trde konstante "data", zdaj BASE_DATA_DIR bere argument iz ukazne vrstice.
# Klic iz Node.js bo izgledal tako:
#   python recognition_model.py "<absolutna_pot_do_data/<userId>>"
# -------------------------------------------------------------------

MODEL_DIR = "models"
TEST_SIZE = 0.2
IMAGE_SIZE = (100, 100)
BACKEND_URL = "http://localhost:3001"
UPDATE_FACE_MODEL_ENDPOINT = "/api/users/update_model"

def train_and_save_model_for_user(user_id, image_paths):
    faces, labels = [], []

    for img_path in image_paths:
        img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            continue
        img_resized = cv2.resize(img, IMAGE_SIZE)
        faces.append(img_resized)
        labels.append(0)  # Trenutno uporabljamo eno oznako (0) za vse slike istega userja

    # Če imamo premalo slik, ne treniramo modela
    if len(faces) < 2:
        print(f"[{user_id}] Premalo slik ({len(faces)}). Model ne treniram.")
        return None

    faces = np.array(faces)
    labels = np.array(labels)

    X_train, X_test, y_train, y_test = train_test_split(
        faces, labels, test_size=TEST_SIZE, random_state=42
    )

    model = cv2.face.LBPHFaceRecognizer_create()
    model.train(X_train, y_train)

    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)
    model_path = os.path.join(MODEL_DIR, f"{user_id}.yml")
    model.write(model_path)

    # Izračun preizkusne natančnosti (opcijsko)
    correct = sum(1 for i, img in enumerate(X_test) if model.predict(img)[0] == y_test[i])
    accuracy = (correct / len(X_test)) * 100
    print(f"[{user_id}] Model shranjen: {model_path}, natančnost: {accuracy:.2f}%")

    return model_path

def update_model_path_in_backend(user_id, model_path):
    url = BACKEND_URL + UPDATE_FACE_MODEL_ENDPOINT
    payload = {
        "userId": user_id,
        "faceModelPath": model_path
    }

    try:
        resp = requests.post(url, json=payload)
        if resp.status_code == 200:
            print(f"[{user_id}] faceModel pot posodobljena v bazi.")
        else:
            print(f"[{user_id}] Napaka pri posodabljanju baze: {resp.status_code} → {resp.text}")
    except Exception as ex:
        print(f"[{user_id}] HTTP napaka: {ex}")

def main():
    # 1) Preverimo, da je podan argument (pot do mape s slikami za enega uporabnika)
    if len(sys.argv) < 2:
        raise RuntimeError("Pokliči: python recognition_model.py <pot_do_data_dir_for_single_user>")

    BASE_DATA_DIR = sys.argv[1]

    # 2) Preverimo, ali mapa obstaja
    if not os.path.exists(BASE_DATA_DIR):
        raise RuntimeError(f"Directory '{BASE_DATA_DIR}' ne obstaja.")

    # 3) Ime uporabnika dobimo iz imena zadnje komponente (folderja)
    user_id = os.path.basename(BASE_DATA_DIR.rstrip("/\\"))
    print(f"[recognition_model] Začenjam treniranje modela za user_id = '{user_id}' iz mape '{BASE_DATA_DIR}'.")

    # 4) Zberemo vse slikovne datoteke v tej mapi
    image_paths = [
        os.path.join(BASE_DATA_DIR, f)
        for f in os.listdir(BASE_DATA_DIR)
        if f.lower().endswith(('.png', '.jpg', '.jpeg'))
    ]

    if not image_paths:
        print(f"[{user_id}] Ni slik v '{BASE_DATA_DIR}'. Preskakujem.")
        return

    # 5) Treniramo in shranimo model
    model_path = train_and_save_model_for_user(user_id, image_paths)
    if model_path:
        update_model_path_in_backend(user_id, model_path)

    print("✅ Modelni proces dokončan.")

if __name__ == "__main__":
    main()
