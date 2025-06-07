import cv2 as cv
import numpy as np
import os
import sys

input_folder = sys.argv[1]
os.makedirs(input_folder, exist_ok=True)

def preprocess_image(image):
    denoised = cv.GaussianBlur(image, (5, 5), 0)
    ycrcb = cv.cvtColor(denoised, cv.COLOR_BGR2YCrCb)
    y_channel = ycrcb[:, :, 0]
    y_normalized = cv.normalize(y_channel, None, 0, 255, cv.NORM_MINMAX)
    return y_normalized

for file in os.listdir(input_folder):
    if file.lower().endswith(('.jpg', '.jpeg', '.png')):
        input_path = os.path.join(input_folder, file)
        image = cv.imread(input_path)

        if image is None:
            print(f"Napaka pri branju slike: {file}")
            continue

        processed = preprocess_image(image)

        filename = os.path.splitext(file)[0]
        save_path = os.path.join(input_folder, f"{filename}_preprocessed.png")
        cv.imwrite(save_path, processed)

print("Vse slike so bile uspešno predelane.")
