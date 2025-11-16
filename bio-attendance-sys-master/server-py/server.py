import os
import base64
import json
import re
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

def get_fingerprint_match_score(fingerprint1_path, fingerprint2_path):
    try:
        fingerprint1 = cv2.imread(fingerprint1_path)
        fingerprint2 = cv2.imread(fingerprint2_path)

        if fingerprint1 is None or fingerprint2 is None:
            logging.error(f"Failed to load images: {fingerprint1_path} or {fingerprint2_path}")
            return 0.0

        sift = cv2.SIFT_create()
        keypoints_1, des1 = sift.detectAndCompute(fingerprint1, None)
        keypoints_2, des2 = sift.detectAndCompute(fingerprint2, None)

        if des1 is None or des2 is None or len(des1) == 0 or len(des2) == 0:
            logging.warning(f"Insufficient descriptors for matching: {fingerprint1_path} vs {fingerprint2_path}")
            return 0.0

        # KNN matching with better parameters
        FLANN_INDEX_KDTREE = 1
        index_params = dict(algorithm=FLANN_INDEX_KDTREE, trees=5)
        search_params = dict(checks=50)
        flann = cv2.FlannBasedMatcher(index_params, search_params)

        matches = flann.knnMatch(des1, des2, k=2)

        # Apply ratio test (Lowe's ratio test) - adjusted threshold for better sensitivity
        match_points = []
        for match in matches:
            if len(match) == 2:
                p, q = match
                if p.distance < 0.7 * q.distance:  # Lower ratio for better sensitivity
                    match_points.append(p)

        # Use average keypoints for more stable scoring
        keypoints = (len(keypoints_1) + len(keypoints_2)) / 2
        if keypoints == 0:
            return 0.0

        match_score = (len(match_points) / keypoints) * 100
        logging.info(f"Match score: {match_score:.2f}% for {fingerprint1_path} vs {fingerprint2_path}")
        return match_score
    except Exception as e:
        logging.error(f"Error in get_fingerprint_match_score: {str(e)}")
        return 0.0

def validate_fingerprint_data(fingerprint_data):
    """Validate fingerprint data and attempt repair if corrupted"""
    try:
        # Check if it's a valid PNG by examining the header
        if len(fingerprint_data) < 8 or fingerprint_data[:8] != b'\x89PNG\r\n\x1a\n':
            logging.warning("Invalid PNG header, attempting repair")
            return None

        # Try to use PIL/Pillow for PNG repair if available
        try:
            from PIL import Image
            import io

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

        except ImportError:
            logging.warning("PIL not available for PNG repair")
        except Exception as pil_error:
            logging.warning(f"PIL repair failed: {str(pil_error)}")

        # If PIL fails, try OpenCV repair
        try:
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

                # Convert to JPEG first then back to PNG
                success, jpeg_data = cv2.imencode('.jpg', img)
                if success:
                    img_jpeg = cv2.imdecode(jpeg_data, cv2.IMREAD_COLOR)
                    success_png, png_data = cv2.imencode('.png', img_jpeg)
                    if success_png:
                        logging.info("Successfully repaired PNG by converting through JPEG")
                        return png_data.tobytes()

        except Exception as cv_error:
            logging.warning(f"OpenCV repair failed: {str(cv_error)}")

        # Return original data if repair failed
        return fingerprint_data

    except Exception as e:
        logging.error(f"PNG validation/repair failed: {str(e)}")
        return None

def identify_fingerprint(scanned_fingerprint_path, students_fingerprints):
    """
    Identify fingerprint by comparing against all students' fingerprints
    Returns the best matching student ID and confidence score
    Enhanced with corruption detection and integrity checks
    """
    best_match = {
        'student_id': None,
        'confidence': 0.0
    }

    logging.info(f"Starting identification for {len(students_fingerprints)} students")

    corrupted_count = 0
    processed_count = 0

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

            # Clean and decode base64 fingerprint to image
            fingerprint_str = clean_base64(student['fingerprint'])
            fingerprint_data = base64.b64decode(fingerprint_str)

            # Validate and repair fingerprint data if corrupted
            validated_data = validate_fingerprint_data(fingerprint_data)
            if validated_data is None:
                logging.warning(f"Failed to validate/repair fingerprint for student {student['id']}")
                corrupted_count += 1
                continue

            nparr = np.frombuffer(validated_data, np.uint8)
            stored_fingerprint = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if stored_fingerprint is None:
                logging.warning(f"Failed to decode fingerprint for student {student['id']}")
                corrupted_count += 1
                continue

            # Save temporary file for comparison
            temp_path = os.path.join('fingerprints', f"temp_{student['id']}.png")
            cv2.imwrite(temp_path, stored_fingerprint)

            # Compare fingerprints
            match_score = get_fingerprint_match_score(scanned_fingerprint_path, temp_path)

            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)

            # Update best match if this score is higher
            if match_score > best_match['confidence']:
                best_match = {
                    'student_id': student['id'],
                    'confidence': match_score
                }
                logging.info(f"New best match: student {student['id']} with score {match_score:.2f}%")

        except Exception as e:
            logging.error(f"Error processing student {student['id']}: {str(e)}")
            corrupted_count += 1
            continue

    logging.info(f"Identification complete. Best match: {best_match}")
    logging.info(f"Processed {processed_count} students, detected {corrupted_count} corrupted fingerprints")

    # Alert if high corruption rate detected
    corruption_rate = (corrupted_count / processed_count) * 100 if processed_count > 0 else 0
    if corruption_rate > 20:  # Alert if more than 20% corrupted
        logging.error(f"High fingerprint corruption rate detected: {corruption_rate:.1f}% ({corrupted_count}/{processed_count})")
        # Could add alerting mechanism here (email, webhook, etc.)

    # Only return a match if confidence is above 5% (aligned with client threshold)
    if best_match['confidence'] < 5:
        logging.info("Confidence too low, returning no match")
        return {
            'student_id': None,
            'confidence': 0.0
        }

    logging.info(f"Returning best match with confidence: {best_match['confidence']:.2f}%")
    return best_match

def repair_png_data(fingerprint_data):
    """
    Attempt to repair corrupted PNG data by fixing common issues
    """
    try:
        # Check if it's a valid PNG by examining the header
        if len(fingerprint_data) < 8 or fingerprint_data[:8] != b'\x89PNG\r\n\x1a\n':
            return None

        # Try to use PIL/Pillow for PNG repair if available
        try:
            from PIL import Image
            import io

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

        except ImportError:
            logging.warning("PIL not available for PNG repair")
        except Exception as pil_error:
            logging.warning(f"PIL repair failed: {str(pil_error)}")
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

def identify_staff_fingerprint(scanned_fingerprint_path, staff_fingerprints):
    """
    Identify staff fingerprint by comparing against all staff fingerprints
    Returns the best matching staff ID and confidence score
    Enhanced with corruption detection and integrity checks
    """
    best_match = {
        'staff_id': None,
        'confidence': 0.0
    }

    logging.info(f"Starting staff identification for {len(staff_fingerprints)} staff members")

    corrupted_count = 0
    processed_count = 0

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

            # Clean and decode base64 fingerprint to image
            fingerprint_str = clean_base64(staff['fingerprint'])
            fingerprint_data = base64.b64decode(fingerprint_str)

            # Validate and repair fingerprint data if corrupted
            validated_data = validate_fingerprint_data(fingerprint_data)
            if validated_data is None:
                logging.warning(f"Failed to validate/repair fingerprint for staff {staff['id']}")
                corrupted_count += 1
                continue

            nparr = np.frombuffer(validated_data, np.uint8)
            stored_fingerprint = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if stored_fingerprint is None:
                logging.warning(f"Failed to decode fingerprint for staff {staff['id']}")
                corrupted_count += 1
                continue

            # Save temporary file for comparison
            temp_path = os.path.join('fingerprints', f"temp_staff_{staff['id']}.png")
            cv2.imwrite(temp_path, stored_fingerprint)

            # Compare fingerprints
            match_score = get_fingerprint_match_score(scanned_fingerprint_path, temp_path)

            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)

            # Update best match if this score is higher
            if match_score > best_match['confidence']:
                best_match = {
                    'staff_id': staff['id'],
                    'confidence': match_score
                }
                logging.info(f"New best match: staff {staff['id']} with score {match_score:.2f}%")

        except Exception as e:
            logging.error(f"Error processing staff {staff['id']}: {str(e)}")
            corrupted_count += 1
            continue

    logging.info(f"Staff identification complete. Best match: {best_match}")
    logging.info(f"Processed {processed_count} staff members, detected {corrupted_count} corrupted fingerprints")

    # Alert if high corruption rate detected
    corruption_rate = (corrupted_count / processed_count) * 100 if processed_count > 0 else 0
    if corruption_rate > 20:  # Alert if more than 20% corrupted
        logging.error(f"High staff fingerprint corruption rate detected: {corruption_rate:.1f}% ({corrupted_count}/{processed_count})")
        # Could add alerting mechanism here (email, webhook, etc.)

    # Only return a match if confidence is above 5% (aligned with client threshold)
    if best_match['confidence'] < 5:
        logging.info("Confidence too low, returning no match")
        return {
            'staff_id': None,
            'confidence': 0.0
        }

    logging.info(f"Returning best staff match with confidence: {best_match['confidence']:.2f}%")
    return best_match

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

    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
        logging.info(f"Created upload folder: {UPLOAD_FOLDER}")

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
                    backend_url = "http://localhost:5005"
                    logging.info(f"Fetching fingerprints for staff_id: {staff_id}")
                    response = requests.get(f"{backend_url}/api/students/fingerprints/{staff_id}")
                    if response.status_code != 200:
                        logging.error(f"Failed to fetch students' fingerprints: {response.status_code}")
                        return jsonify({"status": "error", "message": "Failed to fetch students' fingerprints"}), 500

                    students_fingerprints = response.json().get('data', {}).get('students', [])
                    if not students_fingerprints:
                        logging.warning(f"No students found for staff_id: {staff_id}")
                        return jsonify({"status": "error", "message": "No students found for this staff"}), 404

                    logging.info(f"Fetched {len(students_fingerprints)} student fingerprints")

                except requests.RequestException as e:
                    logging.error(f"Failed to connect to backend: {str(e)}")
                    return jsonify({"status": "error", "message": f"Failed to connect to backend: {str(e)}"}), 500

                file = request.files['file']
                if file.filename == '':
                    logging.error("No file selected")
                    return jsonify({"status": "error", "message": "No file selected"}), 400

                if file and allowed_file(file.filename):
                    scanned_path = os.path.join(app.config['UPLOAD_FOLDER'], "scanned_fingerprint.png")
                    file.save(scanned_path)
                    logging.info(f"Saved scanned fingerprint to: {scanned_path}")

                    identification_result = identify_fingerprint(scanned_path, students_fingerprints)

                    if os.path.exists(scanned_path):
                        os.remove(scanned_path)
                        logging.info("Cleaned up scanned fingerprint file")

                    return jsonify({
                        "status": "success",
                        "message": "Identification completed successfully",
                        "student_id": identification_result['student_id'],
                        "confidence": identification_result['confidence']
                    })
                else:
                    logging.error("Invalid file type")
                    return jsonify({"status": "error", "message": "Invalid file type"}), 400
            else:
                return jsonify({"status": "success"})
        except Exception as e:
            logging.error(f"Unexpected error in identify_fingerprint_endpoint: {str(e)}")
            return jsonify({"status": "error", "message": "Internal server error"}), 500

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

                    identification_result = identify_staff_fingerprint(scanned_path, staff_fingerprints)

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

    return app

APP = create_app()

if __name__ == '__main__':
    APP.run(host='0.0.0.0', port=5050, debug=True)