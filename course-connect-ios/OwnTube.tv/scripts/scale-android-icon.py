#!/usr/bin/env python3
"""
Scale Android adaptive icon to fill more of the circular safe zone.
This fixes the "small square in circle" appearance on Android devices.
"""

from PIL import Image
import os
import sys

def scale_android_icon():
    # Paths
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    input_path = os.path.join(base_dir, "assets", "adaptive-icon-foreground.png")
    output_path = os.path.join(base_dir, "assets", "adaptive-icon-foreground-new.png")
    backup_path = os.path.join(base_dir, "assets", "adaptive-icon-foreground-old.png")

    print("Scaling Android adaptive icon...")
    print(f"   Input: {input_path}")

    # Check if file exists
    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        sys.exit(1)

    # Open image
    try:
        img = Image.open(input_path)
    except Exception as e:
        print(f"Error opening image: {e}")
        sys.exit(1)

    width, height = img.size
    print(f"   Original size: {width}x{height}px")

    # Calculate safe zone (circle with 66/108 = 61% radius of canvas)
    safe_zone_radius = int(width * 0.61)
    print(f"   Safe zone radius: {safe_zone_radius}px (61% of canvas)")

    # Scale factor: 1.3x makes the icon fill ~71% of safe zone diameter
    # This provides moderate padding around the icon
    scale_factor = 1.3
    new_size = int(width * scale_factor)

    print(f"   Scale factor: {scale_factor}x")
    print(f"   Intermediate size: {new_size}x{new_size}px")

    # Scale up using high-quality LANCZOS resampling
    print("   Scaling image...")
    scaled_img = img.resize((new_size, new_size), Image.Resampling.LANCZOS)

    # Calculate crop to get back to original size, centered
    left = (new_size - width) // 2
    top = (new_size - height) // 2
    right = left + width
    bottom = top + height

    print(f"   Cropping to center: ({left}, {top}, {right}, {bottom})")

    # Crop to original dimensions
    result = scaled_img.crop((left, top, right, bottom))

    # Save new icon
    print(f"   Saving scaled icon to: {output_path}")
    result.save(output_path, "PNG", optimize=True)

    # Create backup of original if it doesn't exist
    if not os.path.exists(backup_path):
        print(f"   Creating backup: {backup_path}")
        img.save(backup_path, "PNG")
    else:
        print(f"   Backup already exists: {backup_path}")

    print("\nSuccess!")
    print(f"   Scaled icon saved to: {output_path}")
    print(f"   Original backed up to: {backup_path}")
    print(f"\nNext steps:")
    print(f"   1. Review the new icon: {output_path}")
    print(f"   2. Replace the original:")
    print(f"      mv \"{output_path}\" \"{input_path}\"")
    print(f"   3. Regenerate Android resources:")
    print(f"      npx expo prebuild --platform android --clean")
    print(f"   4. Build and test:")
    print(f"      npm run android")

if __name__ == "__main__":
    try:
        scale_android_icon()
    except KeyboardInterrupt:
        print("\n\nCancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
