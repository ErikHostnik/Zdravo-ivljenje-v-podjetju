import cv2 as cv
import numpy as np
import os

# Mape z vhodnimi in izhodnimi slikami
input_folder = r'data'  # Vhodna mapa s slikami obraza
output_folder = r'data_preprocessed'  # Izhodna mapa za predelane slike
os.makedirs(output_folder, exist_ok=True)

def preprocess_image(image):
    """
    Izvede 3-stopenjsko predobdelavo slike:
    1. Odstranitev šuma (Gaussian blur)
    2. Pretvorba v YCrCb barvni prostor
    3. Linearizacija sivin (normalizacija Y-kanala)
    """
    # 1. Odstranitev šuma
    denoised = cv.GaussianBlur(image, (5, 5), 0)

    # 2. Pretvorba v YCrCb barvni prostor
    ycrcb = cv.cvtColor(denoised, cv.COLOR_BGR2YCrCb)

    # 3. Linearizacija sivin (samo Y kanal - svetlost)
    y_channel = ycrcb[:, :, 0]
    y_normalized = cv.normalize(y_channel, None, 0, 255, cv.NORM_MINMAX)

    return y_normalized  # vrne grayscale sliko (ena komponenta)

# Procesiranje vseh slik v mapi
for file in os.listdir(input_folder):
    if file.lower().endswith(('.jpg', '.jpeg', '.png')):
        path = os.path.join(input_folder, file)
        image = cv.imread(path)

        if image is None:
            print(f"Napaka pri branju slike: {file}")
            continue

        processed = preprocess_image(image)

        # Shranimo predelano sliko (kot grayscale .png)
        save_path = os.path.join(output_folder, os.path.splitext(file)[0] + "_preprocessed.png")
        cv.imwrite(save_path, processed)
        print(f"Shranjena predelana slika: {save_path}")

print("✅ Vse slike so bile uspešno predelane.")
