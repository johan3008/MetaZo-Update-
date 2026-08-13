import sys
import json
import base64
from io import BytesIO
from PIL import Image
import numpy as np
import cv2

def estimate_noise_cv2(image_array):
    # Standard fast noise estimation using convolution
    H, W = image_array.shape
    M = [[1, -2, 1],
         [-2, 4, -2],
         [1, -2, 1]]
    sigma = np.sum(np.abs(cv2.filter2D(image_array, cv2.CV_64F, np.array(M))))
    # Check to avoid division by zero
    if W <= 2 or H <= 2: return 0.5
    sigma = sigma * np.sqrt(0.5 * np.pi) / (6 * (W - 2) * (H - 2))
    return sigma

def main():
    try:
        import os
        img = None
        file_size_kb = 0

        # Check if a file path is passed as an argument
        if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
            file_path = sys.argv[1]
            file_size_kb = int(os.path.getsize(file_path) / 1024)
            img = Image.open(file_path)
        else:
            # Read the entire stdin
            input_data = sys.stdin.read().strip()
            if not input_data:
                print(json.dumps({"error": "No input received via stdin or arguments"}))
                return

            # Strip data URL prefix if present
            if ',' in input_data:
                input_data = input_data.split(',', 1)[1]

            image_bytes = base64.b64decode(input_data)
            file_size_kb = int(len(image_bytes) / 1024)

            # Load image in memory using PIL
            img = Image.open(BytesIO(image_bytes))

        width, height = img.size
        mp = (width * height) / 1000000.0
        resolution = f"{width} x {height} ({mp:.2f} MP)"
        color_space = f"{img.mode} (Pillow decoded)"

        # Convert to grayscale array for analysis
        gray_img = img.convert('L')
        gray_arr = np.array(gray_img)

        # 1. Brightness
        avg_brightness = float(np.mean(gray_arr))
        brightness_val = int(round((avg_brightness / 255.0) * 100))
        if brightness_val > 85:
            brightness_status = "Very Bright (Potential Overexposure)"
        elif brightness_val < 20:
            brightness_status = "Very Dark (Potential Underexposure)"
        else:
            brightness_status = "Optimal"

        # 2. Contrast
        std_dev = float(np.std(gray_arr))
        contrast_val = min(100, int(round((std_dev / 64.0) * 100)))
        if contrast_val > 80:
            contrast_status = "High Contrast"
        elif contrast_val < 25:
            contrast_status = "Low Contrast"
        else:
            contrast_status = "Normal"

        # 3. Histogram (32 bins)
        hist, bin_edges = np.histogram(gray_arr, bins=32, range=(0, 256))
        max_bin = float(np.max(hist)) if np.max(hist) > 0 else 1.0
        histogram = [int(round((val / max_bin) * 100)) for val in hist]

        # 4. Sharpness using Laplacian variance via cv2
        lap_var = cv2.Laplacian(gray_arr, cv2.CV_64F).var()
        
        # Mapping lap_var smoothly to 0-100 scale using np.sqrt(lap_var)
        # We need it to be strict for Adobe Stock AI generated images
        sharpness_score = np.sqrt(lap_var)
        # Typical values: very blurry < 10, sharp > 30-50
        
        sharpness_val = min(100, int(round(sharpness_score * 2.5)))
        
        # Stricter thresholds for sharpness
        if sharpness_val > 65:
            sharpness_status = "Sharp"
        elif sharpness_val < 45:
            sharpness_status = "Soft Focus / Blurry"
        else:
            sharpness_status = "Normal"

        # 5. Noise estimation
        sigma = estimate_noise_cv2(gray_arr)
        if sigma is None:
            sigma = 0.5
        else:
            sigma = float(sigma)
            
        noise_val = min(100, int(round((sigma / 5.0) * 100)))
        
        # Stricter thresholds for noise
        if noise_val > 35:
            noise_status = "High Noise / Artifacts"
        elif noise_val > 15:
            noise_status = "Medium Noise"
        else:
            noise_status = "Low Noise / Clean"

        report = {
            "resolution": resolution,
            "color_space": color_space,
            "histogram": histogram,
            "brightness": { "value": brightness_val, "status": brightness_status },
            "contrast": { "value": contrast_val, "status": contrast_status },
            "sharpness": { "value": sharpness_val, "status": sharpness_status, "raw_score": sharpness_score },
            "noise": { "value": noise_val, "status": noise_status, "raw_sigma": sigma },
            "file_validation": "Valid (Passed In-Memory Science Check)",
            "file_size_kb": file_size_kb
        }

        print(json.dumps(report))

    except Exception as e:
        print(json.dumps({"error": f"Python image analysis failed: {str(e)}"}))

if __name__ == '__main__':
    main()
