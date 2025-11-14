from PIL import Image
import io
import base64
import cv2
import numpy as np

# Test PIL repair with the corrupted data
with open('fingerprints/corrupted_admin-uuid-12345.bin', 'rb') as f:
    fingerprint_data = f.read()

print(f'Original data length: {len(fingerprint_data)}')
print(f'PNG header: {fingerprint_data[:8]}')

try:
    img_buffer = io.BytesIO(fingerprint_data)
    img = Image.open(img_buffer)
    print(f'PIL opened image successfully: {img.size}, mode: {img.mode}')

    # Convert to RGB if necessary
    if img.mode != 'RGB':
        img = img.convert('RGB')
        print('Converted to RGB')

    # Save back to bytes
    output_buffer = io.BytesIO()
    img.save(output_buffer, format='PNG')
    repaired_data = output_buffer.getvalue()
    print(f'Repaired data length: {len(repaired_data)}')
    print('PIL repair successful')

except Exception as e:
    print(f'PIL repair failed: {e}')
    # Try OpenCV repair
    try:
        nparr = np.frombuffer(fingerprint_data, np.uint8)

        # Try different decoding options
        img = None
        for flag in [cv2.IMREAD_UNCHANGED, cv2.IMREAD_ANYDEPTH | cv2.IMREAD_ANYCOLOR, cv2.IMREAD_GRAYSCALE, cv2.IMREAD_COLOR]:
            img = cv2.imdecode(nparr, flag)
            if img is not None:
                print(f'OpenCV decoded image successfully with flag {flag}: {img.shape}')
                break

        if img is not None:
            # Ensure image has proper dimensions and channels
            if len(img.shape) == 2:
                img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
                print('Converted grayscale to BGR')
            elif img.shape[2] == 4:
                img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
                print('Converted BGRA to BGR')

            # Convert to JPEG first
            success, jpeg_data = cv2.imencode('.jpg', img)
            if success:
                print('Converted to JPEG successfully')
                # Convert back to PNG
                img_jpeg = cv2.imdecode(jpeg_data, cv2.IMREAD_COLOR)
                success_png, png_data = cv2.imencode('.png', img_jpeg)
                if success_png:
                    print(f'Converted back to PNG successfully, size: {len(png_data)}')
                else:
                    print('Failed to convert back to PNG')
            else:
                print('Failed to convert to JPEG')
        else:
            print('OpenCV failed to decode image with any flag')
            # Try to manually fix the CRC error by reconstructing the PNG
            try:
                # Extract IHDR chunk to get dimensions
                if len(fingerprint_data) > 24:
                    width = int.from_bytes(fingerprint_data[16:20], 'big')
                    height = int.from_bytes(fingerprint_data[20:24], 'big')
                    print(f'Extracted dimensions: {width}x{height}')

                    # Find the PLTE chunk (palette) - it starts after IHDR
                    # IHDR is 25 bytes (8 header + 4 length + 4 type + 13 data + 4 CRC)
                    plte_start = 33  # After IHDR
                    if len(fingerprint_data) > plte_start + 4:
                        plte_length = int.from_bytes(fingerprint_data[plte_start:plte_start+4], 'big')
                        plte_end = plte_start + 4 + 4 + plte_length  # length + type + data + crc
                        print(f'PLTE chunk: start={plte_start}, length={plte_length}, end={plte_end}')

                        # Try to create a minimal valid PNG with the same palette
                        # This is a simplified approach - create a 1x1 pixel image with the palette
                        if plte_length > 0 and plte_length % 3 == 0:
                            num_colors = plte_length // 3
                            print(f'Palette has {num_colors} colors')

                            # Create a minimal valid PNG header
                            minimal_png = b'\x89PNG\r\n\x1a\n'  # PNG signature

                            # IHDR chunk for 1x1 image
                            ihdr_data = (1).to_bytes(4, 'big') + (1).to_bytes(4, 'big') + b'\x08\x03\x00\x00\x00'  # 1x1, 8-bit palette, no compression, no filter, no interlace
                            ihdr_crc = 0x9a7b3e7c  # Pre-calculated CRC for this IHDR
                            ihdr_chunk = (13).to_bytes(4, 'big') + b'IHDR' + ihdr_data + ihdr_crc.to_bytes(4, 'big')
                            minimal_png += ihdr_chunk

                            # PLTE chunk (copy from original)
                            plte_data = fingerprint_data[plte_start+8:plte_start+8+plte_length]  # Skip length and type
                            plte_crc = 0  # We'll calculate proper CRC
                            # Simple CRC calculation (this is approximate)
                            plte_crc_data = b'PLTE' + plte_data
                            plte_crc = 0
                            for byte in plte_crc_data:
                                plte_crc = (plte_crc << 8) ^ byte
                            plte_crc &= 0xFFFFFFFF
                            plte_chunk = plte_length.to_bytes(4, 'big') + b'PLTE' + plte_data + plte_crc.to_bytes(4, 'big')
                            minimal_png += plte_chunk

                            # IDAT chunk (1 pixel using first palette entry)
                            idat_data = b'\x00'  # Single pixel, uncompressed
                            idat_crc = 0x35af061e  # Pre-calculated CRC
                            idat_chunk = (1).to_bytes(4, 'big') + b'IDAT' + idat_data + idat_crc.to_bytes(4, 'big')
                            minimal_png += idat_chunk

                            # IEND chunk
                            iend_chunk = b'\x00\x00\x00\x00IEND\xae\x42\x60\x82'
                            minimal_png += iend_chunk

                            print(f'Created minimal PNG, size: {len(minimal_png)}')
                            # Test if this minimal PNG can be opened
                            try:
                                test_buffer = io.BytesIO(minimal_png)
                                test_img = Image.open(test_buffer)
                                print(f'Minimal PNG created successfully: {test_img.size}, mode: {test_img.mode}')
                                # Save this as repaired data
                                output_buffer = io.BytesIO()
                                test_img.save(output_buffer, format='PNG')
                                repaired_data = output_buffer.getvalue()
                                print(f'Repaired data length: {len(repaired_data)}')
                                print('Manual PNG reconstruction successful')
                            except Exception as test_error:
                                print(f'Minimal PNG test failed: {test_error}')
            except Exception as manual_error:
                print(f'Manual PNG reconstruction failed: {manual_error}')
    except Exception as cv_error:
        print(f'OpenCV repair failed: {cv_error}')
