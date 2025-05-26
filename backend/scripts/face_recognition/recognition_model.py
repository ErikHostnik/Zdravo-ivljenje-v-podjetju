import cv2
import os
import numpy as np
from sklearn.model_selection import train_test_split

# Nastavitve
DATA_DIRS = ["data_preprocessed", "data_augmented"]
TEST_SIZE = 0.2  # 20% za testiranje
IMAGE_SIZE = (100, 100)  # vse slike resize-amo na isto velikost

# Priprava podatkov
faces, labels = [], []

for data_dir in DATA_DIRS:
    if not os.path.exists(data_dir):
        raise RuntimeError(f"Mapa ne obstaja: {data_dir}")

    for img_name in os.listdir(data_dir):
        if not img_name.lower().endswith(('.png', '.jpg', '.jpeg')):
            continue

        img_path = os.path.join(data_dir, img_name)
        img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)

        if img is None:
            print(f"Napaka pri nalaganju: {img_path}")
            continue

        # Resize, če slike niso enake velikosti
        img = cv2.resize(img, IMAGE_SIZE)

        faces.append(img)
        labels.append(0)  # ena oseba → en label

# Preveri, da smo naložili slike
if len(faces) == 0:
    raise RuntimeError("Ni bilo najdenih slik v DATA_DIRS!")

print(f"Skupno naloženih slik: {len(faces)}")

# Pretvori v numpy array
faces = np.array(faces)
labels = np.array(labels)

# Razdeli podatke na učne in testne
X_train, X_test, y_train, y_test = train_test_split(
    faces, labels, test_size=TEST_SIZE, random_state=42
)

# Ustvari in treniraj LBPH model
model = cv2.face.LBPHFaceRecognizer_create()
model.train(X_train, y_train)

# Shrani model
model.write("lbph_model.yml")
print("Model shranjen kot lbph_model.yml")

# Testiraj model na testnem setu
correct = 0
for i, test_img in enumerate(X_test):
    predicted_label, confidence = model.predict(test_img)
    if predicted_label == y_test[i]:
        correct += 1

accuracy = (correct / len(X_test)) * 100
print(f"Natančnost na testnem setu: {accuracy:.2f}%")
