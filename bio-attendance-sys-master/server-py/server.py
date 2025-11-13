import os
import base64
import json
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

        # Apply ratio test (Lowe's ratio test) - balanced threshold for accurate matching
        match_points = []
        for match in matches:
            if len(match) == 2:
                p, q = match
                if p.distance < 0.8 * q.distance:  # Balanced ratio for accuracy
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

def identify_fingerprint(scanned_fingerprint_path, students_fingerprints):
    """
    Identify fingerprint by comparing against all students' fingerprints
    Returns the best matching student ID and confidence score
    """
    best_match = {
        'student_id': None,
        'confidence': 0.0
    }

    logging.info(f"Starting identification for {len(students_fingerprints)} students")

    for student in students_fingerprints:
        try:
            # Decode base64 fingerprint to image
            fingerprint_data = base64.b64decode(student['fingerprint'])
            nparr = np.frombuffer(fingerprint_data, np.uint8)
            stored_fingerprint = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if stored_fingerprint is None:
                logging.warning(f"Failed to decode fingerprint for student {student['id']}")
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
            logging.error(f"Error processing student {student['id']}: {e}")
            continue

    logging.info(f"Identification complete. Best match: {best_match}")

    # Only return a match if confidence is above 1%
    if best_match['confidence'] < 1:
        logging.info("Confidence too low, returning no match")
        return {
            'student_id': None,
            'confidence': 0.0
        }

    logging.info(f"Returning best match with confidence: {best_match['confidence']:.2f}%")
    return best_match

def identify_staff_fingerprint(scanned_fingerprint_path, staff_fingerprints):
    """
    Identify fingerprint by comparing against all staff fingerprints
    Returns the best matching staff ID and confidence score
    """
    best_match = {
        'staff_id': None,
        'confidence': 0.0
    }

    logging.info(f"Starting staff identification for {len(staff_fingerprints)} staff members")

    for staff in staff_fingerprints:
        try:
            # Check if staff has fingerprint
            if not staff.get('fingerprint'):
                logging.info(f"Staff {staff['id']} has no fingerprint enrolled")
                continue

            # Log fingerprint data for debugging
            fingerprint_str = staff['fingerprint']
            logging.info(f"Processing fingerprint for staff {staff['id']}, length: {len(fingerprint_str)}")

            # Decode base64 fingerprint to image (handle data URL prefix if present)
            if fingerprint_str.startswith('data:image/'):
                # Remove data URL prefix
                fingerprint_str = fingerprint_str.split(',')[1]

            # Validate base64 string
            try:
                # Check if it's valid base64 by attempting to decode
                fingerprint_data = base64.b64decode(fingerprint_str)
            except Exception as decode_error:
                logging.error(f"Invalid base64 fingerprint data for staff {staff['id']}: {str(decode_error)}")
                continue

            nparr = np.frombuffer(fingerprint_data, np.uint8)
            stored_fingerprint = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if stored_fingerprint is None:
                logging.warning(f"Failed to decode fingerprint image for staff {staff['id']}")
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
            continue

    logging.info(f"Staff identification complete. Best match: {best_match}")

    # Only return a match if confidence is above 10%
    if best_match['confidence'] < 10:
        logging.info("Confidence too low, returning no match")
        return {
            'staff_id': None,
            'confidence': 0.0
        }

    logging.info(f"Returning best match with confidence: {best_match['confidence']:.2f}%")
    return best_match

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def store_fingerprint_images(app, file, idx):
    if file.filename == '':
        flash('No selected file')
        return redirect(request.url)
    if file and allowed_file(file.filename):
        # filename = secure_filename(file.filename)
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], "fingerprint_{no}.jpeg".format(no=idx+1)))

# Function that create the app
def create_app(test_config=None ):
    # create and configure the app
    app = Flask(__name__)
    CORS(app)
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
    app.config['SECRET_KEY'] = 'dev'

    # Set up logging
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

    # Ensure upload folder exists
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
        logging.info(f"Created upload folder: {UPLOAD_FOLDER}")

    # Simple route
    @app.route('/')
    def home():
        return jsonify({
           "status": "success",
        })

    @app.route('/verify/fingerprint', methods=['GET', 'POST'])
    def verify_fingerprint():
        if request.method == 'POST':
            app.logger.info(request.files.getlist('file'))
            app.logger.info(request.files.get('file'))
            # check if the post request has the file part
            if 'file' not in request.files:
                flash('No file part')
                abort(400)
            # log files;
            upload_files = request.files.getlist('file')
            app.logger.info(upload_files)
            for idx, file in enumerate(upload_files):
                store_fingerprint_images(app, file, idx)

            match_score = get_fingerprint_match_score(
                "fingerprints/fingerprint_1.jpeg",
                "fingerprints/fingerprint_2.jpeg"
            )
            app.logger.info(f"Match score calculated: {match_score}")
            # Temporarily keep files for debugging
            # for idx in range(2):
            #    os.remove(os.path.join(app.config['UPLOAD_FOLDER'], "fingerprint_{no}.jpeg".format(no=idx+1)))
            # If the user does not select a file, the browser submits an
            # empty file without a filename.
            flash('done')
            return  jsonify({
                "status": "success",
                "message": "Verification completed successfully",
                "match_score": match_score
            })
        else:
            return jsonify({ "status": "success" })

    @app.route('/identify/fingerprint', methods=['POST'])
    def identify_fingerprint_endpoint():
        try:
            if request.method == 'POST':
                # check if the post request has the file part
                if 'file' not in request.files:
                    logging.error("No file part in request")
                    return jsonify({
                        "status": "error",
                        "message": "No file part"
                    }), 400

                # Get staff_id from request
                staff_id = request.form.get('staff_id')
                if not staff_id:
                    logging.error("Staff ID is required")
                    return jsonify({
                        "status": "error",
                        "message": "Staff ID is required"
                    }), 400

                # Get students' fingerprints from Node.js backend
                try:
                    backend_url = "http://localhost:5005"  # Adjust if different
                    logging.info(f"Fetching fingerprints for staff_id: {staff_id}")
                    response = requests.get(f"{backend_url}/api/students/fingerprints/{staff_id}")
                    if response.status_code != 200:
                        logging.error(f"Failed to fetch students' fingerprints: {response.status_code}")
                        return jsonify({
                            "status": "error",
                            "message": "Failed to fetch students' fingerprints"
                        }), 500

                    students_fingerprints = response.json().get('data', {}).get('students', [])
                    if not students_fingerprints:
                        logging.warning(f"No students found for staff_id: {staff_id}")
                        return jsonify({
                            "status": "error",
                            "message": "No students found for this staff"
                        }), 404

                    logging.info(f"Fetched {len(students_fingerprints)} student fingerprints")

                except requests.RequestException as e:
                    logging.error(f"Failed to connect to backend: {str(e)}")
                    return jsonify({
                        "status": "error",
                        "message": f"Failed to connect to backend: {str(e)}"
                    }), 500

                # Store the scanned fingerprint
                file = request.files['file']
                if file.filename == '':
                    logging.error("No file selected")
                    return jsonify({
                        "status": "error",
                        "message": "No file selected"
                    }), 400

                if file and allowed_file(file.filename):
                    scanned_path = os.path.join(app.config['UPLOAD_FOLDER'], "scanned_fingerprint.png")
                    file.save(scanned_path)
                    logging.info(f"Saved scanned fingerprint to: {scanned_path}")

                    # Identify fingerprint
                    identification_result = identify_fingerprint(scanned_path, students_fingerprints)

                    # Clean up scanned file
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
                    return jsonify({
                        "status": "error",
                        "message": "Invalid file type"
                    }), 400
            else:
                return jsonify({ "status": "success" })
        except Exception as e:
            logging.error(f"Unexpected error in identify_fingerprint_endpoint: {str(e)}")
            return jsonify({
                "status": "error",
                "message": "Internal server error"
            }), 500

    @app.route('/identify/staff-fingerprint', methods=['POST'])
    def identify_staff_fingerprint_endpoint():
        try:
            if request.method == 'POST':
                # check if the post request has the file part
                if 'file' not in request.files:
                    logging.error("No file part in request")
                    return jsonify({
                        "status": "error",
                        "message": "No file part"
                    }), 400

                # Get staff fingerprints from request form data (sent by Node.js server)
                staff_fingerprints_json = request.form.get('staff_fingerprints')
                if not staff_fingerprints_json:
                    logging.error("No staff fingerprints provided in request")
                    return jsonify({
                        "status": "error",
                        "message": "No staff fingerprints provided"
                    }), 400

                try:
                    staff_fingerprints = json.loads(staff_fingerprints_json)
                    logging.info(f"Received {len(staff_fingerprints)} staff fingerprints from Node.js server")
                except json.JSONDecodeError as e:
                    logging.error(f"Failed to parse staff fingerprints JSON: {str(e)}")
                    return jsonify({
                        "status": "error",
                        "message": "Invalid staff fingerprints format"
                    }), 400

                if not staff_fingerprints:
                    logging.warning("No staff found with fingerprints")
                    return jsonify({
                        "status": "error",
                        "message": "No staff found with fingerprints"
                    }), 404

                # Store the scanned fingerprint
                file = request.files['file']
                if file.filename == '':
                    logging.error("No file selected")
                    return jsonify({
                        "status": "error",
                        "message": "No file selected"
                    }), 400

                if file and allowed_file(file.filename):
                    scanned_path = os.path.join(app.config['UPLOAD_FOLDER'], "scanned_staff_fingerprint.png")
                    file.save(scanned_path)
                    logging.info(f"Saved scanned staff fingerprint to: {scanned_path}")

                    # Identify fingerprint
                    identification_result = identify_staff_fingerprint(scanned_path, staff_fingerprints)

                    # Clean up scanned file
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
                    return jsonify({
                        "status": "error",
                        "message": "Invalid file type"
                    }), 400
            else:
                return jsonify({ "status": "success" })
        except Exception as e:
            logging.error(f"Unexpected error in identify_staff_fingerprint_endpoint: {str(e)}")
            return jsonify({
                "status": "error",
                "message": "Internal server error"
            }), 500

    return app # do not forget to return the app

APP = create_app()

if __name__ == '__main__':
    APP.run(host='0.0.0.0', port=5050, debug=True)
    # APP.run(debug=True)
