import os
import base64
import json
import re
import time
import threading
from flask import (
    Flask,
    jsonify,
    flash,
    request,
    redirect,
    abort
)
from werkzeug.utils import secure_filename
import cv2
import numpy as np
from flask_cors import CORS
import requests
import logging

# Global cache for SIFT features
FEATURE_CACHE = {}
CACHE_TIMESTAMP = time.time()
CACHE_TTL = 3600  # 1 hour cache TTL
CACHE_LOCK = threading.Lock()

# Try to import PIL for image processing
try:
    from PIL import Image
    import io
    PIL_AVAILABLE = True
    logging.info("PIL/Pillow available for image processing")
except ImportError as e:
    PIL_AVAILABLE = False
    logging.warning(f"PIL not available - install with: pip install Pillow. Error: {str(e)}")

UPLOAD_FOLDER = 'fingerprints'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'BMP', 'bmp'}

def clean_base64(base64_string):
    """Clean and fix base64 string for proper decoding - consistent with client-side cleaning"""
    if not base64_string:
        return base64_string

    # Remove data URL prefix if present
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]

    # Remove whitespace, newlines, and other non-base64 characters
    base64_string = re.sub(r'[^A-Za-z0-9+/=]', '', base64_string)

    # Fix padding - base64 strings must be divisible by 4
    missing_padding = len(base64_string) % 4
    if missing_padding:
        base64_string += '=' * (4 - missing_padding)

    # Validate base64 string
    try:
        base64.b64decode(base64_string)
        logging.debug("Base64 string is valid after cleaning")
    except Exception as e:
        logging.warning(f"Base64 string is invalid after cleaning: {str(e)}")
        # Try to fix common issues
        # Remove extra padding
        base64_string = base64_string.rstrip('=')
        # Re-add correct padding
        missing_padding = len(base64_string) % 4
        if missing_padding:
            base64_string += '=' * (4 - missing_padding)

    return base64_string

def compute_sift_features(image):
    """Compute SIFT features for an image and return keypoints and descriptors"""
    try:
        sift = cv2.SIFT_create()
        keypoints, descriptors = sift.detectAndCompute(image, None)
        return keypoints, descriptors
    except Exception as e:
        logging.error(f"Error computing SIFT features: {str(e)}")
        return None, None

def get_cached_features(student_id, image_data):
    """Get cached SIFT features for a student, computing if not cached"""
    global FEATURE_CACHE, CACHE_TIMESTAMP

    current_time = time.time()
    if current_time - CACHE_TIMESTAMP > CACHE_TTL:
        # Cache expired, clear it
        with CACHE_LOCK:
            FEATURE_CACHE.clear()
            CACHE_TIMESTAMP = current_time
            logging.info("Feature cache cleared due to TTL expiration")

    cache_key = f"student_{student_id}"

    with CACHE_LOCK:
        if cache_key in FEATURE_CACHE:
            logging.debug(f"Using cached features for student {student_id}")
            return FEATURE_CACHE[cache_key]

    # Compute features if not cached
    try:
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            logging.error(f"Failed to decode image for student {student_id}")
            return None, None

        keypoints, descriptors = compute_sift_features(img)

        if descriptors is not None and len(descriptors) > 0:
            with CACHE_LOCK:
                FEATURE_CACHE[cache_key] = (keypoints, descriptors)
                logging.debug(f"Cached features for student {student_id}: {len(descriptors)} descriptors")
            return keypoints, descriptors
        else:
            logging.warning(f"No descriptors found for student {student_id}")
            return None, None

    except Exception as e:
        logging.error(f"Error computing features for student {student_id}: {str(e)}")
        return None, None

def get_fingerprint_match_score_optimized(des1, des2, keypoints1_count, keypoints2_count):
    """Optimized fingerprint matching using pre-computed descriptors"""
    try:
        if des1 is None or des2 is None or len(des1) == 0 or len(des2) == 0:
            return 0.0

        # Use FLANN-based matcher for faster matching (more lenient)
        FLANN_INDEX_KDTREE = 1
        index_params = dict(algorithm=FLANN_INDEX_KDTREE, trees=5)
        search_params = dict(checks=100)  # Increased checks for better matching
        flann = cv2.FlannBasedMatcher(index_params, search_params)

        matches = flann.knnMatch(des1, des2, k=2)

        # Apply ratio test (Lowe's ratio test) - made more lenient for fingerprint matching
        good_matches = []
        for match in matches:
            if len(match) == 2:
                m, n = match
                if m.distance < 0.9 * n.distance:  # More lenient ratio for fingerprint matching
                    good_matches.append(m)

        # Calculate score based on good matches and average keypoints
        if keypoints1_count == 0 or keypoints2_count == 0:
            return 0.0

        avg_keypoints = (keypoints1_count + keypoints2_count) / 2.0
        match_score = (len(good_matches) / avg_keypoints) * 100

        # Add bonus for high number of good matches (more aggressive)
        if len(good_matches) > 4:
            match_score *= 1.8  # 80% bonus for strong matches
        elif len(good_matches) > 3:
            match_score *= 1.6  # 60% bonus for decent matches
        elif len(good_matches) > 2:
            match_score *= 1.4  # 40% bonus for weak matches
        elif len(good_matches) > 1:
            match_score *= 1.2  # 20% bonus for very weak matches

        return min(match_score, 100.0)  # Cap at 100%

    except Exception as e:
        logging.error(f"Error in optimized match score calculation: {str(e)}")
        return 0.0

def get_fingerprint_match_score(fingerprint1_path, fingerprint2_path):
    """Legacy function for backward compatibility"""
    try:
        fingerprint1 = cv2.imread(fingerprint1_path)
        fingerprint2 = cv2.imread(fingerprint2_path)

        if fingerprint1 is None or fingerprint2 is None:
            logging.error(f"Failed to load images: {fingerprint1_path} or {fingerprint2_path}")
            return 0.0

        keypoints_1, des1 = compute_sift_features(fingerprint1)
        keypoints_2, des2 = compute_sift_features(fingerprint2)

        if des1 is None or des2 is None or len(des1) == 0 or len(des2) == 0:
            logging.warning(f"Insufficient descriptors for matching: {fingerprint1_path} vs {fingerprint2_path}")
            return 0.0

        return get_fingerprint_match_score_optimized(des1, des2, len(keypoints_1), len(keypoints_2))

    except Exception as e:
        logging.error(f"Error in get_fingerprint_match_score: {str(e)}")
        return 0.0

def validate_fingerprint_data(fingerprint_data):
    """Validate fingerprint data and attempt repair if corrupted - now more robust"""
    try:
        # Check if it's a valid PNG by examining the header
        if len(fingerprint_data) < 8 or fingerprint_data[:8] != b'\x89PNG\r\n\x1a\n':
            logging.warning("Invalid PNG header")
            return None

        # First, try direct OpenCV decode (fastest if it works)
        try:
            nparr = np.frombuffer(fingerprint_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is not None:
                logging.info("Direct OpenCV decode successful")
                return fingerprint_data
        except Exception as e:
            logging.debug(f"Direct decode failed: {e}")

        # Try PIL/Pillow for PNG repair (best for CRC errors)
        if PIL_AVAILABLE:
            try:
                # PIL is more forgiving with CRC errors
                img_buffer = io.BytesIO(fingerprint_data)
                img = Image.open(img_buffer)

                # Convert to RGB if necessary
                if img.mode != 'RGB':
                    img = img.convert('RGB')

                # Save back to bytes with maximum quality
                output_buffer = io.BytesIO()
                img.save(output_buffer, format='PNG', optimize=False)
                repaired_data = output_buffer.getvalue()

                logging.info("Successfully repaired PNG using PIL")
                return repaired_data

            except Exception as pil_error:
                logging.warning(f"PIL repair failed: {str(pil_error)}")
        else:
            logging.warning("PIL not available - install with: pip install Pillow")

        # Last resort: Try to decode ignoring errors and re-encode
        try:
            # Save to temporary file and let OpenCV handle it
            import tempfile
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp_file:
                tmp_file.write(fingerprint_data)
                tmp_path = tmp_file.name
            
            # Try to read the file (OpenCV might be more forgiving with files)
            img = cv2.imread(tmp_path, cv2.IMREAD_COLOR)
            
            # Clean up temp file
            try:
                os.remove(tmp_path)
            except:
                pass
            
            if img is not None:
                # Re-encode as PNG
                success, png_data = cv2.imencode('.png', img)
                if success:
                    logging.info("Successfully repaired PNG using OpenCV file I/O")
                    return png_data.tobytes()
        
        except Exception as file_error:
            logging.warning(f"File-based repair failed: {str(file_error)}")

        # If everything fails, try to decode anyway and ignore errors
        try:
            nparr = np.frombuffer(fingerprint_data, np.uint8)
            
            # Try all available decode flags
            for flag in [cv2.IMREAD_UNCHANGED, cv2.IMREAD_ANYDEPTH | cv2.IMREAD_ANYCOLOR, 
                        cv2.IMREAD_GRAYSCALE, cv2.IMREAD_COLOR, cv2.IMREAD_IGNORE_ORIENTATION]:
                try:
                    img = cv2.imdecode(nparr, flag)
                    if img is not None:
                        # Convert to BGR if needed
                        if len(img.shape) == 2:
                            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
                        elif img.shape[2] == 4:
                            img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
                        
                        # Re-encode as clean PNG
                        success, png_data = cv2.imencode('.png', img)
                        if success:
                            logging.info(f"Successfully decoded and repaired with flag: {flag}")
                            return png_data.tobytes()
                except Exception as flag_error:
                    continue
        
        except Exception as decode_error:
            logging.error(f"All decode attempts failed: {str(decode_error)}")

        # If we got here, we couldn't repair it
        logging.error("Could not repair fingerprint data")
        return None

    except Exception as e:
        logging.error(f"PNG validation/repair failed: {str(e)}")
        return None

def identify_fingerprint_optimized(scanned_fingerprint_path, students_fingerprints):
    """
    Optimized fingerprint identification using cached SIFT features
    Returns the best matching student ID and confidence score
    """
    best_match = {
        'student_id': None,
        'confidence': 0.0
    }

    logging.info(f"Starting optimized identification for {len(students_fingerprints)} students")

    start_time = time.time()
    corrupted_count = 0
    processed_count = 0

    # First, compute features for the scanned fingerprint
    try:
        logging.info(f"Loading scanned fingerprint from: {scanned_fingerprint_path}")
        scanned_img = cv2.imread(scanned_fingerprint_path)
        if scanned_img is None:
            logging.error("Failed to load scanned fingerprint image")
            return best_match

        logging.info(f"Scanned image shape: {scanned_img.shape}, dtype: {scanned_img.dtype}")
        scanned_keypoints, scanned_descriptors = compute_sift_features(scanned_img)
        scanned_keypoints_count = len(scanned_keypoints) if scanned_keypoints else 0

        logging.info(f"Scanned fingerprint: {scanned_keypoints_count} keypoints, {len(scanned_descriptors) if scanned_descriptors is not None else 0} descriptors")

        if scanned_descriptors is None or len(scanned_descriptors) == 0:
            logging.error("No descriptors found in scanned fingerprint - image may be corrupted or too low quality")
            return best_match

    except Exception as e:
        logging.error(f"Error processing scanned fingerprint: {str(e)}")
        return best_match

    # Process each student fingerprint
    for student in students_fingerprints:
        try:
            processed_count += 1

            # Check if fingerprint data is available
            if not student.get('fingerprint'):
                logging.warning(f"Student {student['id']} has no fingerprint enrolled")
                continue

            # Check for corruption flags from Node.js server
            if student.get('isCorrupted'):
                logging.warning(f"Student {student['id']} has corrupted fingerprint data (detected by Node.js)")
                corrupted_count += 1
                continue

            # Clean and decode base64 fingerprint to image data
            fingerprint_str = clean_base64(student['fingerprint'])
            fingerprint_data = base64.b64decode(fingerprint_str)

            # Validate and repair fingerprint data if corrupted
            validated_data = validate_fingerprint_data(fingerprint_data)
            if validated_data is None:
                logging.warning(f"Failed to validate/repair fingerprint for student {student['id']}")
                corrupted_count += 1
                continue

            # Get cached features or compute them
            student_keypoints, student_descriptors = get_cached_features(student['id'], validated_data)

            if student_descriptors is None or len(student_descriptors) == 0:
                logging.warning(f"No descriptors found for student {student['id']}")
                corrupted_count += 1
                continue

            student_keypoints_count = len(student_keypoints) if student_keypoints else 0

            # Compare fingerprints using optimized matching
            match_score = get_fingerprint_match_score_optimized(
                scanned_descriptors, student_descriptors,
                scanned_keypoints_count, student_keypoints_count
            )

            # Log detailed matching info for debugging
            logging.info(f"Matching student {student['id']}: score={match_score:.2f}%, scanned_kp={scanned_keypoints_count}, student_kp={student_keypoints_count}")

            # Update best match if this score is higher
            if match_score > best_match['confidence']:
                best_match = {
                    'student_id': student['id'],
                    'confidence': match_score
                }
                logging.info(f"✓ New best match: student {student['id']} with score {match_score:.2f}%")

        except Exception as e:
            logging.error(f"Error processing student {student['id']}: {str(e)}")
            corrupted_count += 1
            continue

    processing_time = time.time() - start_time
    logging.info(f"Optimized identification complete in {processing_time:.2f}s. Best match: {best_match}")
    logging.info(f"Processed {processed_count} students, detected {corrupted_count} corrupted fingerprints")

    # Alert if high corruption rate detected
    corruption_rate = (corrupted_count / processed_count) * 100 if processed_count > 0 else 0
    if corruption_rate > 20:  # Alert if more than 20% corrupted
        logging.error(f"High fingerprint corruption rate detected: {corruption_rate:.1f}% ({corrupted_count}/{processed_count})")

    # Only return a match if confidence is above threshold (accept any positive match)
    if best_match['confidence'] < 5.0:
        logging.warning(f"Low confidence ({best_match['confidence']:.2f}%), returning no match")
        logging.info("Possible causes:")
        logging.info("  - Scanned fingerprint quality is poor")
        logging.info("  - Enrolled fingerprints are corrupted")
        logging.info("  - Fingerprint scanner needs cleaning")
        logging.info("  - Student fingerprint not enrolled or doesn't match")
        return {
            'student_id': None,
            'confidence': 0.0
        }

    logging.info(f"✓ SUCCESS: Returning best match with confidence: {best_match['confidence']:.2f}%")
    return best_match

def identify_fingerprint(scanned_fingerprint_path, students_fingerprints):
    """
    Legacy identification function - now uses optimized version
    """
    return identify_fingerprint_optimized(scanned_fingerprint_path, students_fingerprints)

def repair_png_data(fingerprint_data):
    """
    Attempt to repair corrupted PNG data by fixing common issues
    """
    try:
        # Check if it's a valid PNG by examining the header
        if len(fingerprint_data) < 8 or fingerprint_data[:8] != b'\x89PNG\r\n\x1a\n':
            return None

        # Try to use PIL/Pillow for PNG repair if available
        if PIL_AVAILABLE:
            try:
                # Try to open with PIL which is more forgiving
                img_buffer = io.BytesIO(fingerprint_data)
                img = Image.open(img_buffer)

                # Convert to RGB if necessary
                if img.mode != 'RGB':
                    img = img.convert('RGB')

                # Save back to bytes
                output_buffer = io.BytesIO()
                img.save(output_buffer, format='PNG')
                repaired_data = output_buffer.getvalue()
                logging.info("Successfully repaired PNG using PIL")
                return repaired_data

            except Exception as pil_error:
                logging.warning(f"PIL repair failed: {str(pil_error)}")
        else:
            logging.warning("PIL not available for PNG repair")
            # If PIL fails, try to convert to JPEG and back to PNG as a last resort
            try:
                # Try to decode with OpenCV with different flags
                nparr = np.frombuffer(fingerprint_data, np.uint8)

                # Try different decoding options
                img = None
                for flag in [cv2.IMREAD_UNCHANGED, cv2.IMREAD_ANYDEPTH | cv2.IMREAD_ANYCOLOR, cv2.IMREAD_GRAYSCALE, cv2.IMREAD_COLOR]:
                    img = cv2.imdecode(nparr, flag)
                    if img is not None:
                        logging.info(f"Successfully decoded with OpenCV flag: {flag}")
                        break

                if img is not None:
                    # Ensure image has proper dimensions and channels
                    if len(img.shape) == 2:
                        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
                    elif img.shape[2] == 4:
                        img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)

                    # Convert to JPEG first
                    success, jpeg_data = cv2.imencode('.jpg', img)
                    if success:
                        # Convert back to PNG
                        img_jpeg = cv2.imdecode(jpeg_data, cv2.IMREAD_COLOR)
                        success_png, png_data = cv2.imencode('.png', img_jpeg)
                        if success_png:
                            logging.info("Successfully repaired PNG by converting through JPEG")
                            return png_data.tobytes()
            except Exception as cv_error:
                logging.warning(f"OpenCV repair failed: {str(cv_error)}")

        # Fallback: try to fix CRC errors by rebuilding the PNG
        try:
            # This is a basic approach - in a real scenario you'd use a proper PNG library
            # For now, we'll try to extract the IHDR and rebuild minimal PNG
            if len(fingerprint_data) > 24:
                # Extract width and height from IHDR (bytes 16-23)
                width = int.from_bytes(fingerprint_data[16:20], 'big')
                height = int.from_bytes(fingerprint_data[20:24], 'big')

                # Create a minimal valid PNG with the same dimensions
                # This is a placeholder - proper PNG reconstruction would be more complex
                logging.warning(f"PNG dimensions: {width}x{height}, attempting minimal reconstruction")

                # For now, return None to indicate repair failed
                return None

        except Exception as crc_error:
            logging.error(f"CRC repair failed: {str(crc_error)}")
            return None

    except Exception as e:
        logging.error(f"PNG repair failed: {str(e)}")
        return None

def identify_staff_fingerprint_optimized(scanned_fingerprint_path, staff_fingerprints):
    """
    Optimized staff fingerprint identification using cached SIFT features
    Returns the best matching staff ID and confidence score
    """
    best_match = {
        'staff_id': None,
        'confidence': 0.0
    }

    logging.info(f"Starting optimized staff identification for {len(staff_fingerprints)} staff members")

    start_time = time.time()
    corrupted_count = 0
    processed_count = 0

    # First, compute features for the scanned fingerprint
    try:
        scanned_img = cv2.imread(scanned_fingerprint_path)
        if scanned_img is None:
            logging.error("Failed to load scanned staff fingerprint image")
            return best_match

        scanned_keypoints, scanned_descriptors = compute_sift_features(scanned_img)
        if scanned_descriptors is None or len(scanned_descriptors) == 0:
            logging.error("No descriptors found in scanned staff fingerprint")
            return best_match

        scanned_keypoints_count = len(scanned_keypoints) if scanned_keypoints else 0

    except Exception as e:
        logging.error(f"Error processing scanned staff fingerprint: {str(e)}")
        return best_match

    # Process each staff fingerprint
    for staff in staff_fingerprints:
        try:
            processed_count += 1

            # Check if fingerprint data is available
            if not staff.get('fingerprint'):
                logging.warning(f"Staff {staff['id']} has no fingerprint enrolled")
                continue

            # Check for corruption flags from Node.js server
            if staff.get('isCorrupted'):
                logging.warning(f"Staff {staff['id']} has corrupted fingerprint data (detected by Node.js)")
                corrupted_count += 1
                continue

            # Clean and decode base64 fingerprint to image data
            fingerprint_str = clean_base64(staff['fingerprint'])
            fingerprint_data = base64.b64decode(fingerprint_str)

            # Validate and repair fingerprint data if corrupted
            validated_data = validate_fingerprint_data(fingerprint_data)
            if validated_data is None:
                logging.warning(f"Failed to validate/repair fingerprint for staff {staff['id']}")
                corrupted_count += 1
                continue

            # Get cached features or compute them
            staff_keypoints, staff_descriptors = get_cached_features(f"staff_{staff['id']}", validated_data)

            if staff_descriptors is None or len(staff_descriptors) == 0:
                logging.warning(f"No descriptors found for staff {staff['id']}")
                corrupted_count += 1
                continue

            staff_keypoints_count = len(staff_keypoints) if staff_keypoints else 0

            # Compare fingerprints using optimized matching
            match_score = get_fingerprint_match_score_optimized(
                scanned_descriptors, staff_descriptors,
                scanned_keypoints_count, staff_keypoints_count
            )

            # Update best match if this score is higher
            if match_score > best_match['confidence']:
                best_match = {
                    'staff_id': staff['id'],
                    'confidence': match_score
                }
                logging.debug(f"New best match: staff {staff['id']} with score {match_score:.2f}%")

        except Exception as e:
            logging.error(f"Error processing staff {staff['id']}: {str(e)}")
            corrupted_count += 1
            continue

    processing_time = time.time() - start_time
    logging.info(f"Optimized staff identification complete in {processing_time:.2f}s. Best match: {best_match}")
    logging.info(f"Processed {processed_count} staff members, detected {corrupted_count} corrupted fingerprints")

    # Alert if high corruption rate detected
    corruption_rate = (corrupted_count / processed_count) * 100 if processed_count > 0 else 0
    if corruption_rate > 20:  # Alert if more than 20% corrupted
        logging.error(f"High staff fingerprint corruption rate detected: {corruption_rate:.1f}% ({corrupted_count}/{processed_count})")

    # Only return a match if confidence is above threshold (lowered for better recognition)
    if best_match['confidence'] < 20.0:
        logging.info("Confidence too low, returning no match")
        return {
            'staff_id': None,
            'confidence': 0.0
        }

    logging.info(f"Returning best staff match with confidence: {best_match['confidence']:.2f}%")
    return best_match

def identify_staff_fingerprint(scanned_fingerprint_path, staff_fingerprints):
    """
    Legacy staff identification function - now uses optimized version
    """
    return identify_staff_fingerprint_optimized(scanned_fingerprint_path, staff_fingerprints)

def invalidate_cache_entry(student_id):
    """Invalidate cache entry for a specific student"""
    cache_key = f"student_{student_id}"
    with CACHE_LOCK:
        if cache_key in FEATURE_CACHE:
            del FEATURE_CACHE[cache_key]
            logging.info(f"Invalidated cache for student {student_id}")

def invalidate_staff_cache_entry(staff_id):
    """Invalidate cache entry for a specific staff member"""
    cache_key = f"staff_{staff_id}"
    with CACHE_LOCK:
        if cache_key in FEATURE_CACHE:
            del FEATURE_CACHE[cache_key]
            logging.info(f"Invalidated cache for staff {staff_id}")

def precompute_features_on_startup():
    """Precompute SIFT features for all students and staff on server startup"""
    try:
        logging.info("Starting feature precomputation on server startup...")

        BACKEND_URL = "http://localhost:5005"

        # Precompute student features - SKIP THIS since we don't know staff_id at startup
        # We'll compute features on-demand during first identification instead
        logging.info("Feature precomputation skipped - will compute on-demand during identification")
        
        # Note: We can't precompute student features at startup because each staff has different students
        # Features will be cached automatically during the first identification request

    except Exception as e:
        logging.error(f"Feature precomputation failed: {str(e)}")

        # Precompute staff features
        try:
            response = requests.get(f"{BACKEND_URL}/api/staff/fingerprints/all")
            if response.status_code == 200:
                staff_data = response.json().get('data', {}).get('staff', [])
                logging.info(f"Precomputing features for {len(staff_data)} staff members")

                for staff in staff_data:
                    if staff.get('fingerprint') and not staff.get('isCorrupted'):
                        try:
                            fingerprint_str = clean_base64(staff['fingerprint'])
                            fingerprint_data = base64.b64decode(fingerprint_str)
                            validated_data = validate_fingerprint_data(fingerprint_data)

                            if validated_data:
                                get_cached_features(f"staff_{staff['id']}", validated_data)
                                logging.debug(f"Precomputed features for staff {staff['id']}")
                        except Exception as e:
                            logging.warning(f"Failed to precompute features for staff {staff['id']}: {str(e)}")
            else:
                logging.warning("Could not fetch staff for precomputation")
        except Exception as e:
            logging.error(f"Error during staff feature precomputation: {str(e)}")

        # Log cache statistics
        with CACHE_LOCK:
            cache_size = len(FEATURE_CACHE)
            logging.info(f"Feature precomputation complete. Cache contains {cache_size} entries")

    except Exception as e:
        logging.error(f"Feature precomputation failed: {str(e)}")

def get_cache_stats():
    """Get cache statistics for monitoring"""
    with CACHE_LOCK:
        return {
            'cache_size': len(FEATURE_CACHE),
            'cache_ttl': CACHE_TTL,
            'cache_timestamp': CACHE_TIMESTAMP,
            'memory_usage_mb': len(FEATURE_CACHE) * 0.1  # Rough estimate
        }

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def store_fingerprint_images(app, file, idx):
    if file.filename == '':
        flash('No selected file')
        return redirect(request.url)
    if file and allowed_file(file.filename):
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], "fingerprint_{no}.jpeg".format(no=idx+1)))

def create_app(test_config=None):
    app = Flask(__name__)
    CORS(app)
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
    app.config['SECRET_KEY'] = 'dev'

    logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
        logging.info(f"Created upload folder: {UPLOAD_FOLDER}")

    # Precompute features on startup
    precompute_features_on_startup()

    @app.route('/')
    def home():
        return jsonify({"status": "success"})

    @app.route('/verify/fingerprint', methods=['GET', 'POST'])
    def verify_fingerprint():
        if request.method == 'POST':
            app.logger.info(request.files.getlist('file'))
            app.logger.info(request.files.get('file'))
            if 'file' not in request.files:
                flash('No file part')
                abort(400)
            upload_files = request.files.getlist('file')
            app.logger.info(upload_files)
            for idx, file in enumerate(upload_files):
                store_fingerprint_images(app, file, idx)

            match_score = get_fingerprint_match_score(
                "fingerprints/fingerprint_1.jpeg",
                "fingerprints/fingerprint_2.jpeg"
            )
            app.logger.info(f"Match score calculated: {match_score}")
            flash('done')
            return jsonify({
                "status": "success",
                "message": "Verification completed successfully",
                "match_score": match_score
            })
        else:
            return jsonify({"status": "success"})

    @app.route('/identify/fingerprint', methods=['POST'])
    def identify_fingerprint_endpoint():
        try:
            if request.method == 'POST':
                if 'file' not in request.files:
                    logging.error("No file part in request")
                    return jsonify({"status": "error", "message": "No file part"}), 400

                staff_id = request.form.get('staff_id')
                if not staff_id:
                    logging.error("Staff ID is required")
                    return jsonify({"status": "error", "message": "Staff ID is required"}), 400

                try:
                    BACKEND_URL = "http://localhost:5005"
                    logging.info(f"Fetching all student fingerprints for identification")
                    response = requests.get(f"{BACKEND_URL}/api/students/fingerprints/{staff_id}")
                    if response.status_code != 200:
                        logging.error(f"Failed to fetch students' fingerprints: {response.status_code}")
                        return jsonify({"status": "error", "message": "Failed to fetch students' fingerprints"}), 500

                    students_fingerprints = response.json().get('data', {}).get('students', [])
                    if not students_fingerprints:
                        logging.warning("No students found with fingerprints")
                        return jsonify({"status": "error", "message": "No students found with fingerprints"}), 200

                    logging.info(f"Fetched {len(students_fingerprints)} student fingerprints")

                except requests.RequestException as e:
                    logging.error(f"Failed to connect to backend: {str(e)}")
                    return jsonify({"status": "error", "message": f"Failed to connect to backend: {str(e)}"}), 500

                file = request.files['file']
                if file.filename == '':
                    logging.error("No file selected")
                    return jsonify({"status": "error", "message": "No file selected"}), 400

                if file and allowed_file(file.filename):
                    # Save with original extension to preserve format
                    filename = secure_filename(file.filename)
                    scanned_path = os.path.join(app.config['UPLOAD_FOLDER'], f"scanned_fingerprint_{filename}")
                    file.save(scanned_path)
                    logging.info(f"Saved scanned fingerprint to: {scanned_path}")

                    # DEBUG LOGS - Enhanced debugging
                    logging.info("=" * 50)
                    logging.info("STARTING FINGERPRINT IDENTIFICATION")
                    logging.info(f"Students to check: {len(students_fingerprints)}")
                    logging.info(f"Scanned file saved to: {scanned_path}")
                    logging.info(f"File exists: {os.path.exists(scanned_path)}")
                    if os.path.exists(scanned_path):
                        file_size = os.path.getsize(scanned_path)
                        logging.info(f"Scanned file size: {file_size} bytes")
                    logging.info("=" * 50)

                    identification_result = identify_fingerprint(scanned_path, students_fingerprints)

                    # DEBUG LOGS - Enhanced result logging
                    logging.info("=" * 50)
                    logging.info("IDENTIFICATION RESULT:")
                    logging.info(f"Student ID: {identification_result.get('student_id')}")
                    logging.info(f"Confidence: {identification_result.get('confidence'):.2f}%")
                    if identification_result.get('student_id') is None:
                        logging.info("REASON FOR FAILURE: Confidence below threshold")
                        logging.info("TROUBLESHOOTING:")
                        logging.info("  - Check scanned fingerprint image quality")
                        logging.info("  - Verify enrolled fingerprints are valid")
                        logging.info("  - Ensure scanner is clean and well-positioned")
                        logging.info("  - Try re-enrolling student fingerprint")
                    logging.info("=" * 50)

                    # Log detailed results for debugging
                    if identification_result.get('student_id'):
                        logging.info(f"✓ SUCCESS: Matched student {identification_result['student_id']} with {identification_result['confidence']:.2f}% confidence")
                    else:
                        logging.warning("✗ FAILED: No student match found - confidence too low or no valid fingerprints")
                        logging.info(f"Debug info: Best match confidence was {identification_result.get('confidence', 0):.2f}% (threshold: 15.0%)")
                        logging.info("Troubleshooting tips:")
                        logging.info("  - Check if scanned fingerprint is clear and well-positioned")
                        logging.info("  - Verify enrolled fingerprints are not corrupted")
                        logging.info("  - Ensure sufficient lighting and clean fingerprint scanner")
                        logging.info("  - Try re-enrolling the fingerprint if issues persist")
                        logging.info("  - Check server logs for detailed matching information")

                    logging.info("Keeping scanned fingerprint for diagnostics")

                    # Debug: Log the exact response being sent
                    response_data = {
                        "status": "success",
                        "message": "Identification completed successfully",
                        "student_id": identification_result['student_id'],
                        "confidence": identification_result['confidence']
                    }
                    logging.info(f"DEBUG: Sending response: {response_data}")
                    return jsonify(response_data)
                else:
                    logging.error("Invalid file type")
                    return jsonify({"status": "error", "message": "Invalid file type"}), 400
            else:
                return jsonify({"status": "success"})
        except Exception as e:
            logging.error(f"Unexpected error in identify_fingerprint_endpoint: {str(e)}")
            return jsonify({"status": "error", "message": "Internal server error"}), 500

    @app.route('/identify/fingerprint/multi', methods=['POST'])
    def identify_fingerprint_multi_endpoint():
        """
        Identifies a fingerprint against ALL enrolled fingerprints for ALL students.
        This supports multiple fingerprints per student (up to 5).

        Returns:
            - student_id: The matched student's ID
            - confidence: Match confidence score
            - finger_type: Which specific finger was matched (thumb, index, middle, ring, pinky)
        """
        try:
            if request.method == 'POST':
                if 'file' not in request.files:
                    logging.error("No file part in request")
                    return jsonify({"status": "error", "message": "No file part"}), 400

                fingerprints_data_json = request.form.get('fingerprints_data')
                if not fingerprints_data_json:
                    logging.error("No fingerprints data provided")
                    return jsonify({"status": "error", "message": "No fingerprints data provided"}), 400

                try:
                    # Parse the fingerprints data sent from Node.js server
                    all_fingerprints = json.loads(fingerprints_data_json)
                    logging.info(f"Received {len(all_fingerprints)} fingerprint records from Node.js server")

                    if not all_fingerprints:
                        logging.warning("No fingerprints found for identification")
                        return jsonify({"status": "error", "message": "No students found with fingerprints"}), 404

                except json.JSONDecodeError as e:
                    logging.error(f"Failed to parse fingerprints data: {str(e)}")
                    return jsonify({"status": "error", "message": "Invalid fingerprints data format"}), 400

                file = request.files['file']
                if file.filename == '':
                    logging.error("No file selected")
                    return jsonify({"status": "error", "message": "No file selected"}), 400

                if file and allowed_file(file.filename):
                    # Save scanned fingerprint
                    filename = secure_filename(file.filename)
                    scanned_path = os.path.join(app.config['UPLOAD_FOLDER'], f"scanned_multi_{filename}")
                    file.save(scanned_path)
                    logging.info(f"Saved scanned fingerprint to: {scanned_path}")

                    # DEBUG LOGS
                    logging.info("=" * 50)
                    logging.info("STARTING MULTI-FINGERPRINT IDENTIFICATION")
                    logging.info(f"Total fingerprint records to check: {len(all_fingerprints)}")
                    logging.info(f"Scanned file: {scanned_path}")
                    logging.info("=" * 50)

                    # Perform identification
                    identification_result = identify_fingerprint_multi(scanned_path, all_fingerprints)

                    # DEBUG LOGS
                    logging.info("=" * 50)
                    logging.info("MULTI-FINGERPRINT IDENTIFICATION RESULT:")
                    logging.info(f"Student ID: {identification_result.get('student_id')}")
                    logging.info(f"Confidence: {identification_result.get('confidence'):.2f}%")
                    logging.info(f"Matched Finger: {identification_result.get('finger_type')}")
                    logging.info("=" * 50)

                    # Log detailed results
                    if identification_result.get('student_id'):
                        logging.info(f"✓ SUCCESS: Matched student {identification_result['student_id']} - {identification_result['finger_type']} finger with {identification_result['confidence']:.2f}% confidence")
                    else:
                        logging.warning("✗ FAILED: No student match found")
                        logging.info(f"Best match confidence was {identification_result.get('confidence', 0):.2f}%")

                    # Cleanup
                    if os.path.exists(scanned_path):
                        os.remove(scanned_path)
                        logging.info("Cleaned up scanned fingerprint file")

                    return jsonify({
                        "status": "success",
                        "message": "Multi-fingerprint identification completed successfully",
                        "student_id": identification_result['student_id'],
                        "confidence": identification_result['confidence'],
                        "finger_type": identification_result.get('finger_type')
                    })
                else:
                    logging.error("Invalid file type")
                    return jsonify({"status": "error", "message": "Invalid file type"}), 400
            else:
                return jsonify({"status": "success"})
        except Exception as e:
            logging.error(f"Unexpected error in identify_fingerprint_multi_endpoint: {str(e)}")
            import traceback
            logging.error(traceback.format_exc())
            return jsonify({"status": "error", "message": "Internal server error"}), 500


    def identify_fingerprint_multi(scanned_fingerprint_path, all_fingerprints):
        """
        Optimized multi-fingerprint identification.
        Identifies against ALL enrolled fingerprints for ALL students.
        
        Args:
            scanned_fingerprint_path: Path to the scanned fingerprint image
            all_fingerprints: List of all fingerprint records with format:
                [{
                    'id': student_id,
                    'name': student_name,
                    'matric_no': student_matric_no,
                    'grade': student_grade,
                    'fingerprint': fingerprint_data,
                    'finger_type': 'thumb' | 'index' | 'middle' | 'ring' | 'pinky',
                    'fingerprint_id': unique_fingerprint_id,
                    'courses': [...]
                }, ...]
        
        Returns:
            {
                'student_id': matched_student_id or None,
                'confidence': confidence_score,
                'finger_type': matched_finger_type or None
            }
        """
        best_match = {
            'student_id': None,
            'confidence': 0.0,
            'finger_type': None
        }

        logging.info(f"Starting multi-fingerprint identification for {len(all_fingerprints)} fingerprint records")

        start_time = time.time()
        corrupted_count = 0
        processed_count = 0

        # Compute features for the scanned fingerprint
        try:
            logging.info(f"Loading scanned fingerprint from: {scanned_fingerprint_path}")
            scanned_img = cv2.imread(scanned_fingerprint_path)
            if scanned_img is None:
                logging.error("Failed to load scanned fingerprint image")
                return best_match

            logging.info(f"Scanned image shape: {scanned_img.shape}, dtype: {scanned_img.dtype}")
            scanned_keypoints, scanned_descriptors = compute_sift_features(scanned_img)
            scanned_keypoints_count = len(scanned_keypoints) if scanned_keypoints else 0

            logging.info(f"Scanned fingerprint: {scanned_keypoints_count} keypoints, {len(scanned_descriptors) if scanned_descriptors is not None else 0} descriptors")

            if scanned_descriptors is None or len(scanned_descriptors) == 0:
                logging.error("No descriptors found in scanned fingerprint")
                return best_match

        except Exception as e:
            logging.error(f"Error processing scanned fingerprint: {str(e)}")
            return best_match

        # Process each fingerprint record
        for fingerprint_record in all_fingerprints:
            try:
                processed_count += 1

                student_id = fingerprint_record.get('id')
                finger_type = fingerprint_record.get('finger_type', 'unknown')
                fingerprint_id = fingerprint_record.get('fingerprint_id', 'unknown')

                # Check if fingerprint data is available
                if not fingerprint_record.get('fingerprint'):
                    logging.warning(f"Fingerprint record {fingerprint_id} has no fingerprint data")
                    continue

                # Check for corruption flags
                if fingerprint_record.get('isCorrupted'):
                    logging.warning(f"Fingerprint {fingerprint_id} is corrupted (detected by Node.js)")
                    corrupted_count += 1
                    continue

                # Clean and decode base64 fingerprint
                fingerprint_str = clean_base64(fingerprint_record['fingerprint'])
                fingerprint_data = base64.b64decode(fingerprint_str)

                # Validate and repair if needed
                validated_data = validate_fingerprint_data(fingerprint_data)
                if validated_data is None:
                    logging.warning(f"Failed to validate/repair fingerprint {fingerprint_id}")
                    corrupted_count += 1
                    continue

                # Get cached features or compute them
                # Use unique cache key combining student_id and finger_type
                cache_key = f"{student_id}_{finger_type}"
                student_keypoints, student_descriptors = get_cached_features(cache_key, validated_data)

                if student_descriptors is None or len(student_descriptors) == 0:
                    logging.warning(f"No descriptors found for fingerprint {fingerprint_id}")
                    corrupted_count += 1
                    continue

                student_keypoints_count = len(student_keypoints) if student_keypoints else 0

                # Compare fingerprints
                match_score = get_fingerprint_match_score_optimized(
                    scanned_descriptors, student_descriptors,
                    scanned_keypoints_count, student_keypoints_count
                )

                # Log matching info
                logging.info(f"Matching student {student_id} ({finger_type}): score={match_score:.2f}%, scanned_kp={scanned_keypoints_count}, enrolled_kp={student_keypoints_count}")

                # Update best match if this score is higher
                if match_score > best_match['confidence']:
                    best_match = {
                        'student_id': student_id,
                        'confidence': match_score,
                        'finger_type': finger_type
                    }
                    logging.info(f"✓ New best match: student {student_id} ({finger_type}) with score {match_score:.2f}%")

            except Exception as e:
                logging.error(f"Error processing fingerprint record: {str(e)}")
                corrupted_count += 1
                continue

        processing_time = time.time() - start_time
        logging.info(f"Multi-fingerprint identification complete in {processing_time:.2f}s")
        logging.info(f"Processed {processed_count} fingerprint records, detected {corrupted_count} corrupted")

        # Alert if high corruption rate
        corruption_rate = (corrupted_count / processed_count) * 100 if processed_count > 0 else 0
        if corruption_rate > 20:
            logging.error(f"High corruption rate: {corruption_rate:.1f}% ({corrupted_count}/{processed_count})")

        # Only return match if confidence is above threshold
        if best_match['confidence'] < 5.0:
            logging.warning(f"Low confidence ({best_match['confidence']:.2f}%), returning no match")
            return {
                'student_id': None,
                'confidence': 0.0,
                'finger_type': None
            }

        logging.info(f"✓ SUCCESS: Returning best match - student {best_match['student_id']} ({best_match['finger_type']}) with {best_match['confidence']:.2f}% confidence")
        return best_match

    @app.route('/identify/staff-fingerprint', methods=['POST'])
    def identify_staff_fingerprint_endpoint():
        try:
            if request.method == 'POST':
                if 'file' not in request.files:
                    logging.error("No file part in request")
                    return jsonify({"status": "error", "message": "No file part"}), 400

                staff_fingerprints_json = request.form.get('staff_fingerprints')
                if not staff_fingerprints_json:
                    logging.error("No staff fingerprints provided in request")
                    return jsonify({"status": "error", "message": "No staff fingerprints provided"}), 400

                try:
                    staff_fingerprints = json.loads(staff_fingerprints_json)
                    logging.info(f"Received {len(staff_fingerprints)} staff fingerprints from Node.js server")
                except json.JSONDecodeError as e:
                    logging.error(f"Failed to parse staff fingerprints JSON: {str(e)}")
                    return jsonify({"status": "error", "message": "Invalid staff fingerprints format"}), 400

                if not staff_fingerprints:
                    logging.warning("No staff found with fingerprints")
                    return jsonify({"status": "error", "message": "No staff found with fingerprints"}), 404

                file = request.files['file']
                if file.filename == '':
                    logging.error("No file selected")
                    return jsonify({"status": "error", "message": "No file selected"}), 400

                if file and allowed_file(file.filename):
                    scanned_path = os.path.join(app.config['UPLOAD_FOLDER'], "scanned_staff_fingerprint.png")
                    file.save(scanned_path)
                    logging.info(f"Saved scanned staff fingerprint to: {scanned_path}")

                    identification_result = identify_staff_fingerprint_optimized(scanned_path, staff_fingerprints)

                    if os.path.exists(scanned_path):
                        os.remove(scanned_path)
                        logging.info("Cleaned up scanned staff fingerprint file")

                    return jsonify({
                        "status": "success",
                        "message": "Staff identification completed successfully",
                        "staff_id": identification_result['staff_id'],
                        "confidence": identification_result['confidence']
                    })
                else:
                    logging.error("Invalid file type")
                    return jsonify({"status": "error", "message": "Invalid file type"}), 400
            else:
                return jsonify({"status": "success"})
        except Exception as e:
            logging.error(f"Unexpected error in identify_staff_fingerprint_endpoint: {str(e)}")
            import traceback
            logging.error(traceback.format_exc())
            return jsonify({"status": "error", "message": "Internal server error"}), 500

    @app.route('/invalidate-cache/<student_id>', methods=['POST'])
    def invalidate_cache_endpoint(student_id):
        """Invalidate cache entry for a specific student"""
        try:
            invalidate_cache_entry(student_id)
            logging.info(f"Cache invalidated for student {student_id}")
            return jsonify({
                "status": "success",
                "message": f"Cache invalidated for student {student_id}"
            })
        except Exception as e:
            logging.error(f"Error invalidating cache for student {student_id}: {str(e)}")
            return jsonify({"status": "error", "message": "Failed to invalidate cache"}), 500

    return app

APP = create_app()

if __name__ == '__main__':
    APP.run(host='0.0.0.0', port=5050, debug=True)