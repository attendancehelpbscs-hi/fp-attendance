# Save as: server-py/check_fingerprint_quality.py
# Run with: python check_fingerprint_quality.py

import cv2
import numpy as np
import os

def check_fingerprint_quality(image_path):
    """Check the quality of a fingerprint image"""
    if not os.path.exists(image_path):
        print(f"❌ File not found: {image_path}")
        return None
    
    img = cv2.imread(image_path)
    if img is None:
        print(f"❌ Failed to load image: {image_path}")
        return None
    
    print(f"\n📋 Analyzing: {image_path}")
    print(f"   Resolution: {img.shape[1]}x{img.shape[0]}")
    print(f"   Channels: {img.shape[2] if len(img.shape) > 2 else 1}")
    
    # Check if image is too dark or too bright
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) > 2 else img
    mean_brightness = np.mean(gray)
    print(f"   Brightness: {mean_brightness:.1f}/255 ", end="")
    
    if mean_brightness < 50:
        print("⚠️  Too dark!")
    elif mean_brightness > 200:
        print("⚠️  Too bright!")
    else:
        print("✅ Good")
    
    # Check contrast
    contrast = np.std(gray)
    print(f"   Contrast: {contrast:.1f} ", end="")
    
    if contrast < 30:
        print("⚠️  Too low!")
    else:
        print("✅ Good")
    
    # Detect features
    sift = cv2.SIFT_create()
    keypoints, descriptors = sift.detectAndCompute(gray, None)
    
    print(f"   Keypoints detected: {len(keypoints)} ", end="")
    
    if len(keypoints) < 50:
        print("⚠️  Too few features!")
    elif len(keypoints) < 100:
        print("⚠️  Low features")
    else:
        print("✅ Good")
    
    if descriptors is not None:
        print(f"   Descriptors: {len(descriptors)} ✅")
    else:
        print(f"   Descriptors: None ❌")
    
    # Overall quality assessment
    print(f"\n   Overall Quality: ", end="")
    if len(keypoints) < 50 or contrast < 30:
        print("❌ POOR - Re-enrollment recommended")
    elif len(keypoints) < 100 or contrast < 50:
        print("⚠️  FAIR - May have recognition issues")
    else:
        print("✅ GOOD - Should work well")

# Check enrolled fingerprints
print("=" * 60)
print("FINGERPRINT QUALITY CHECK")
print("=" * 60)

fingerprints_dir = "fingerprints"

# Check if there are any temporary files left
temp_files = [f for f in os.listdir(fingerprints_dir) if f.startswith('temp_')]
if temp_files:
    print(f"\n🔍 Found {len(temp_files)} enrolled fingerprint(s):")
    for temp_file in temp_files[:5]:  # Check first 5
        check_fingerprint_quality(os.path.join(fingerprints_dir, temp_file))

# Check scanned fingerprint if it exists
scanned_path = os.path.join(fingerprints_dir, "scanned_fingerprint.png")
if os.path.exists(scanned_path):
    print(f"\n🔍 Checking scanned fingerprint:")
    check_fingerprint_quality(scanned_path)
else:
    print(f"\n⚠️  No scanned fingerprint found at: {scanned_path}")
    print("   Scan a fingerprint first, then run this script again.")

print("\n" + "=" * 60)
print("RECOMMENDATIONS:")
print("=" * 60)
print("• Keypoints < 100: Re-enroll with cleaner, drier fingers")
print("• Low contrast: Ensure good lighting during enrollment")
print("• Too dark/bright: Adjust sensor settings or lighting")
print("• Use the SAME finger for enrollment and scanning")
print("=" * 60)