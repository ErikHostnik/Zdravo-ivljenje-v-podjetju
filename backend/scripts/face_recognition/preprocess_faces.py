import cv2 as cv
import numpy as np
import os

# Mape z vhodnimi in izhodnimi slikami
input_folder = r'data'  # Vhodna mapa s slikami obraza (z uporabniki)
output_folder = r'data_preprocessed'  # Izhodna mapa za predelane slike
os.makedirs(output_folder, exist_ok=True)

def preprocess_image(image):
    # 1. Odstranitev šuma
    denoised = cv.GaussianBlur(image, (5, 5), 0)

    # 2. Pretvorba v YCrCb barvni prostor
    ycrcb = cv.cvtColor(denoised, cv.COLOR_BGR2YCrCb)

    # 3. Linearizacija sivin (samo Y kanal - svetlost)
    y_channel = ycrcb[:, :, 0]
    y_normalized = cv.normalize(y_channel, None, 0, 255, cv.NORM_MINMAX)

    return y_normalized

# Procesiraj vse uporabniške mape
for user_folder in os.listdir(input_folder):
    user_path = os.path.join(input_folder, user_folder)
    if not os.path.isdir(user_path):
        continue  # Preskoči, če ni mapa

    # Ustvari uporabniško mapo v output_folder
    user_output_path = os.path.join(output_folder, user_folder)
    os.makedirs(user_output_path, exist_ok=True)

    # Procesiraj slike znotraj uporabniške mape
    for file in os.listdir(user_path):
        if file.lower().endswith(('.jpg', '.jpeg', '.png')):
            input_path = os.path.join(user_path, file)
            image = cv.imread(input_path)

            if image is None:
                print(f"Napaka pri branju slike: {file}")
                continue

            processed = preprocess_image(image)

            # Shrani predelano sliko
            filename = os.path.splitext(file)[0]
            save_path = os.path.join(user_output_path, f"{filename}_preprocessed.png")
            cv.imwrite(save_path, processed)
            print(f"Shranjena predelana slika: {save_path}")

print("✅ Vse slike so bile uspešno predelane.")
