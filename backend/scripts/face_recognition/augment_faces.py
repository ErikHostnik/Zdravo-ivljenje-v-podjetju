import cv2 as cv
import numpy as np
import os
import random
import sys



input_folder = sys.argv[1]
os.makedirs(input_folder, exist_ok=True)

def rotate_image(image, angle):
    (h, w) = image.shape[:2]
    center = (w // 2, h // 2)
    matrix = cv.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv.warpAffine(image, matrix, (w, h), borderMode=cv.BORDER_REFLECT)
    return rotated

def flip_horizontal(image):
    return cv.flip(image, 1)

def change_contrast(image, factor):
    contrasted = np.clip(image.astype(np.float32) * factor, 0, 255)
    return contrasted.astype(np.uint8)

def add_salt_pepper_noise(image, amount=0.01):
    noisy = image.copy()
    total_pixels = image.shape[0] * image.shape[1]
    num_noisy = int(total_pixels * amount)

    for _ in range(num_noisy // 2):
        x = random.randint(0, image.shape[1] - 1)
        y = random.randint(0, image.shape[0] - 1)
        noisy[y, x] = 255

    for _ in range(num_noisy // 2):
        x = random.randint(0, image.shape[1] - 1)
        y = random.randint(0, image.shape[0] - 1)
        noisy[y, x] = 0

    return noisy

def augment_image(image, filename_base, counter):
    angles = [15, -15]
    for angle in angles:
        a = rotate_image(image, angle)
        cv.imwrite(os.path.join(input_folder, f'{filename_base}_aug_rot{angle}_{counter}.png'), a)

    f = flip_horizontal(image)
    cv.imwrite(os.path.join(input_folder, f'{filename_base}_aug_flip_{counter}.png'), f)

    contrast_factor = random.uniform(0.8, 1.5)
    c = change_contrast(image, contrast_factor)
    cv.imwrite(os.path.join(input_folder, f'{filename_base}_aug_contrast_{counter}.png'), c)

    n = add_salt_pepper_noise(image, amount=0.02)
    cv.imwrite(os.path.join(input_folder, f'{filename_base}_aug_noise_{counter}.png'), n)

counter = 0
for file in os.listdir(input_folder):
    if file.endswith('.png'):
        path = os.path.join(input_folder, file)
        image = cv.imread(path, cv.IMREAD_GRAYSCALE)

        if image is None:
            print(f"Napaka pri branju slike: {file}")
            continue

        filename_base = os.path.splitext(file)[0]
        augment_image(image, filename_base, counter)
        counter += 1

print("Vse slike uspešno augmentirane.")
