import sys
import json
import base64
from io import BytesIO
from PIL import Image
import numpy as np
from skimage.filters import laplace
from skimage.restoration import estimate_sigma

def main():
    try:
        # Read the entire stdin
        input_data = sys.stdin.read().strip()
        if not input_data:
            print(json.dumps({"error": "No input received via stdin"}))
            return

        # Strip data URL prefix if present (e.g. "data:image/jpeg;base64,")
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

        # 4. Sharpness using Laplacian variance via skimage.filters.laplace
        gray_normalized = gray_arr.astype(float) / 255.0
        lap_img = laplace(gray_normalized)
        lap_var = float(np.var(lap_img))
        
        # Mapping lap_var smoothly to 0-100 scale using np.sqrt(lap_var) * 800
        sharpness_val = min(100, int(round(np.sqrt(lap_var) * 800)))
        if sharpness_val > 60:
            sharpness_status = "Sharp"
        elif sharpness_val < 20:
            sharpness_status = "Soft Focus"
        else:
            sharpness_status = "Normal"

        # 5. Noise estimation using skimage.restoration.estimate_sigma
        sigma = estimate_sigma(gray_arr, channel_axis=None)
        if sigma is None:
            sigma = 0.5
        else:
            sigma = float(sigma)
            
        noise_val = min(100, int(round((sigma / 20.0) * 100)))
        if noise_val > 40:
            noise_status = "High Noise"
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
            "sharpness": { "value": sharpness_val, "status": sharpness_status },
            "noise": { "value": noise_val, "status": noise_status },
            "file_validation": "Valid (Passed In-Memory Science Check)",
            "file_size_kb": file_size_kb
        }

        print(json.dumps(report))

    except Exception as e:
        print(json.dumps({"error": f"Python image analysis failed: {str(e)}"}))

if __name__ == '__main__':
    main()
