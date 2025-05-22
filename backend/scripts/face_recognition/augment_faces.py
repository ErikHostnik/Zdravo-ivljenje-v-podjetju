import cv2 as cv
import numpy as np
import os
import random

input_folder = r'data_preprocessed'  # Izhod iz prejšnje skripte
output_folder = r'data_augmented'
os.makedirs(output_folder, exist_ok=True)

def rotate_image(image, angle):
    """Zasuk slike za dani kot."""
    (h, w) = image.shape[:2]
    center = (w // 2, h // 2)
    matrix = cv.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv.warpAffine(image, matrix, (w, h), borderMode=cv.BORDER_REFLECT)
    return rotated

def flip_horizontal(image):
    """Ogledalo (horizontal flip)."""
    return cv.flip(image, 1)


def change_contrast(image, factor):
    """Spreminjanje kontrasta slike (množenje sivin z faktorjem)."""
    contrasted = np.clip(image.astype(np.float32) * factor, 0, 255)
    return contrasted.astype(np.uint8)

def add_salt_pepper_noise(image, amount=0.01):
    """Dodajanje naključnega šuma """
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
    """Shrani 4 augmentirane različice slike."""
    a1 = rotate_image(image, angle=15)
    a2 = flip_horizontal(image)
    a3 = change_contrast(image, factor=1.5)
    a4 = add_salt_pepper_noise(image, amount=0.02)

    cv.imwrite(os.path.join(output_folder, f'{filename_base}_aug_rot_{counter}.png'), a1)
    cv.imwrite(os.path.join(output_folder, f'{filename_base}_aug_flip_{counter}.png'), a2)
    cv.imwrite(os.path.join(output_folder, f'{filename_base}_aug_contrast_{counter}.png'), a3)
    cv.imwrite(os.path.join(output_folder, f'{filename_base}_aug_noise_{counter}.png'), a4)

# Glavna zanka
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
        print(f"Augmentirane slike za: {file}")

print("Augmentacija uspesna.")