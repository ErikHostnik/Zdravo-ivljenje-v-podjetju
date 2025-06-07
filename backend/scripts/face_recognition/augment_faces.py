import cv2 as cv
import numpy as np
import os
import random
import sys

input_folder = sys.argv[1]
os.makedirs(input_folder, exist_ok=True)

def change_contrast(image, factor):
    contrasted = np.clip(image.astype(np.float32) * factor, 0, 255)
    return contrasted.astype(np.uint8)

def change_brightness(image, value):
    brightened = cv.add(image, value)
    return np.clip(brightened, 0, 255).astype(np.uint8)

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

def rotate_image(image, angle_range=(-15, 15)):
    angle = random.uniform(angle_range[0], angle_range[1]) 
    (h, w) = image.shape[:2]
    center = (w // 2, h // 2)
    M = cv.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv.warpAffine(image, M, (w, h), borderMode=cv.BORDER_REPLICATE)
    return rotated

def color_jitter_grayscale(image):
    contrast_factor = random.uniform(0.7, 1.3)
    img_contrast = change_contrast(image, contrast_factor)
    brightness_val = random.randint(-20, 20)
    img_jitter = change_brightness(img_contrast, brightness_val)
    return img_jitter



def augment_image(image, filename_base, counter):
    bright = change_brightness(image, 30)
    cv.imwrite(os.path.join(input_folder, f'{filename_base}_aug_bright_{counter}.png'), bright)

    dark = change_brightness(image, -30)
    cv.imwrite(os.path.join(input_folder, f'{filename_base}_aug_dark_{counter}.png'), dark)

    contrast_factor = random.uniform(0.8, 1.5)
    c = change_contrast(image, contrast_factor)
    cv.imwrite(os.path.join(input_folder, f'{filename_base}_aug_contrast_{counter}.png'), c)

    n = add_salt_pepper_noise(image, amount=0.02)
    cv.imwrite(os.path.join(input_folder, f'{filename_base}_aug_noise_{counter}.png'), n)

    jitter = color_jitter_grayscale(image)
    cv.imwrite(os.path.join(input_folder, f'{filename_base}_aug_jitter_{counter}.png'), jitter)

    rotated = rotate_image(image)
    cv.imwrite(os.path.join(input_folder, f'{filename_base}_aug_rotated_{counter}.png'), rotated)


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
