import os
import uuid
import mimetypes
import io
import socket
import zipfile
from pathlib import Path
from datetime import datetime, timedelta
from functools import wraps

from werkzeug.utils import secure_filename
from flask import (
    Flask, request, jsonify, send_from_directory,
    abort, session, send_file
)
from flask_cors import CORS
import qrcode

# -----------------------------
# Flask setup
# -----------------------------

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET", str(uuid.uuid4()))

# Allow React frontend to call this backend with cookies (sessions)
CORS(app, supports_credentials=True)

# Limit upload size (optional, 100 MB)
app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024  # 100 MB

# In-memory store for share sessions
# token -> {"path": Path, "password": str, "created": datetime, "expires": datetime|None}
SHARES = {}

# Default expiry in minutes (None => no expiry)
DEFAULT_EXPIRY_MINUTES = 24 * 60  # 24 hours

# React dev server port
FRONTEND_URL_PORT = 5173


# -----------------------------
# Helpers
# -----------------------------

def get_local_ip():
    """Try to detect a reasonable local IP address (not 127.0.0.1)."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't actually send to 8.8.8.8, but forces selection of default route
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        try:
            s.close()
        except Exception:
            pass


def require_auth_for_token(f):
    """Decorator to require that session has authenticated for given token."""
    @wraps(f)
    def wrapped(token, *args, **kwargs):
        token_state = SHARES.get(token)
        if not token_state:
            abort(404, "Share not found or expired")

        # simple UTC-based expiry check
        if token_state.get("expires") and datetime.utcnow() > token_state["expires"]:
            SHARES.pop(token, None)
            abort(410, "Share expired")

        if session.get(f"auth_{token}") is True:
            return f(token, *args, **kwargs)

        abort(401, "Not authenticated for this share")

    return wrapped


# -----------------------------
# Utility API
# -----------------------------

@app.route("/api/suggest_ip", methods=["GET"])
def api_suggest_ip():
    """Give frontend a suggested IP for display in Sender form."""
    return jsonify({"ip": get_local_ip()})


# -----------------------------
# Sender: create share session
# -----------------------------

@app.route("/api/share/create", methods=["POST"])
def create_share():
    """
    Create a share session for an absolute directory path and password.
    Request JSON:
      { "dirpath": "...", "password": "...", "ip": "...", "expiry_minutes": 60 }
    """
    data = request.get_json(force=True)

    dirpath = (data.get("dirpath") or "").strip()
    password = (data.get("password") or "").strip()
    host_ip = (data.get("ip") or "").strip()
    expiry_minutes_raw = data.get("expiry_minutes", "")

    expiry_minutes = (
        str(expiry_minutes_raw).strip()
        if expiry_minutes_raw is not None
        else ""
    )

    if not dirpath or not password:
        return jsonify({"error": "Directory path and password are required."}), 400

    # If IP not provided, attempt server-side detection
    if not host_ip:
        host_ip = get_local_ip()

    # Validate directory
    try:
        p = Path(dirpath).expanduser().resolve()
    except Exception as e:
        return jsonify({"error": f"Invalid directory path provided: {e}"}), 400

    if not p.exists() or not p.is_dir():
        return jsonify({"error": f"Directory does not exist or is not a directory: {dirpath}"}), 400

    # Create share token and expiry
    token = uuid.uuid4().hex
    expires = None
    try:
        if expiry_minutes:
            m = int(expiry_minutes)
            if m > 0:
                expires = datetime.utcnow() + timedelta(minutes=m)
            else:
                expires = None  # Explicitly non-expiring if 0 or negative
        else:
            expires = datetime.utcnow() + timedelta(minutes=DEFAULT_EXPIRY_MINUTES)
    except ValueError:
        return jsonify({"error": "Invalid value provided for expiry_minutes."}), 400
    except Exception:
        expires = datetime.utcnow() + timedelta(minutes=DEFAULT_EXPIRY_MINUTES)

    SHARES[token] = {
        "path": p,
        "password": password,
        "created": datetime.utcnow(),
        "expires": expires,
    }

    # Frontend (React) receiver URL:
    # e.g. http://<host_ip>:5173/receive/<token>
    share_link = f"http://{host_ip}:{FRONTEND_URL_PORT}/receive/{token}"

    # QR endpoint for that full URL
    qr_link = f"/qr/{token}?url={share_link}"

    return jsonify({
        "token": token,
        "share_link": share_link,
        "qr_link": qr_link,
        "expires_at": expires.isoformat() if expires else None
    })


# -----------------------------
# QR code for share link
# -----------------------------

@app.route("/qr/<token>")
def qr_code(token):
    """Return a PNG QR code that encodes the provided share URL."""
    share = SHARES.get(token)
    if not share:
        abort(404)

    # Prefer explicit URL passed from frontend
    url_param = request.args.get("url", None)
    if url_param:
        share_link = url_param
    else:
        host = request.args.get("host", None) or get_local_ip()
        share_link = f"http://{host}:{FRONTEND_URL_PORT}/receive/{token}"

    img = qrcode.make(share_link)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return send_file(buf, mimetype="image/png")


# -----------------------------
# Receiver: status / auth / info
# -----------------------------

@app.route("/api/share/<token>/status", methods=["GET"])
def share_status(token):
    """Check if share exists, expired, and auth status."""
    share = SHARES.get(token)
    if not share:
        abort(404, "Share not found or expired")

    if share.get("expires") and datetime.utcnow() > share["expires"]:
        SHARES.pop(token, None)
        abort(410, "Share expired")

    is_authed = session.get(f"auth_{token}") is True
    return jsonify({
        "token": token,
        "authed": is_authed,
        "created": share["created"].isoformat(),
        "expires": share["expires"].isoformat() if share["expires"] else None
    })


@app.route("/api/share/<token>/auth", methods=["POST"])
def auth_action(token):
    """Check password and set session flag if correct."""
    share = SHARES.get(token)
    if not share:
        abort(404)

    data = request.get_json(force=True)
    pw = data.get("password", "")

    if pw == share["password"]:
        session[f"auth_{token}"] = True
        return jsonify({"ok": True, "message": "Authenticated"})
    return jsonify({"ok": False, "message": "Incorrect password"}), 401


@app.route("/api/share/<token>/info", methods=["GET"])
@require_auth_for_token
def share_info(token):
    """Basic info about the share."""
    share = SHARES[token]
    return jsonify({
        "token": token,
        "root": str(share["path"]),
        "created": share["created"].isoformat(),
        "expires": share["expires"].isoformat() if share["expires"] else None
    })


# -----------------------------
# Upload into shared folder
# -----------------------------

@app.route("/api/<token>/upload", methods=["POST"])
@app.route("/api/<token>/upload/<path:relpath>", methods=["POST"])
@require_auth_for_token
def api_upload(token, relpath=""):
    """
    Upload a file into the shared folder (or a subfolder).
    URL:
      /api/<token>/upload            -> uploads to root shared folder
      /api/<token>/upload/<relpath>  -> uploads to subfolder under root
    Form-data:
      file: the uploaded file
    """
    share = SHARES[token]
    base = share["path"].resolve()

    # target directory
    target_dir = (base / relpath).resolve() if relpath else base

    # security: ensure target_dir is inside base
    if not str(target_dir).startswith(str(base)):
        abort(403, "Invalid upload path")

    if not target_dir.exists() or not target_dir.is_dir():
        return jsonify({"ok": False, "message": "Target upload directory does not exist"}), 400

    file = request.files.get("file")
    if not file or file.filename == "":
        return jsonify({"ok": False, "message": "No file provided"}), 400

    filename = secure_filename(file.filename)
    if not filename:
        return jsonify({"ok": False, "message": "Invalid filename"}), 400

    save_path = target_dir / filename

    try:
        file.save(str(save_path))
    except Exception as e:
        return jsonify({"ok": False, "message": f"Failed to save file: {e}"}), 500

    return jsonify({"ok": True, "filename": filename}), 200


# -----------------------------
# List / download / preview
# -----------------------------

@app.route("/api/<token>/list", methods=["GET"])
@require_auth_for_token
def api_list(token):
    share = SHARES[token]
    base = share["path"]
    q = request.args.get("q", "").lower()

    items = []
    for p in base.iterdir():
        if q and q not in p.name.lower():
            continue
        stat = p.stat()
        items.append({
            "name": p.name,
            "is_dir": p.is_dir(),
            "size": stat.st_size,
            "mtime": int(stat.st_mtime),
            "mime": mimetypes.guess_type(str(p))[0] or "application/octet-stream"
        })
    items.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))
    return jsonify({"path": "", "items": items})


@app.route("/api/<token>/list/<path:relpath>", methods=["GET"])
@require_auth_for_token
def api_list_sub(token, relpath):
    share = SHARES[token]
    base = share["path"]
    candidate = (base / relpath).resolve()
    if not str(candidate).startswith(str(base)) or not candidate.exists() or not candidate.is_dir():
        abort(404)
    items = []
    for p in candidate.iterdir():
        stat = p.stat()
        items.append({
            "name": p.name,
            "is_dir": p.is_dir(),
            "size": stat.st_size,
            "mtime": int(stat.st_mtime),
            "mime": mimetypes.guess_type(str(p))[0] or "application/octet-stream"
        })
    items.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))
    return jsonify({"path": relpath, "items": items})


@app.route("/api/<token>/download/<path:relpath>", methods=["GET"])
@require_auth_for_token
def api_download(token, relpath):
    share = SHARES[token]
    base = share["path"]
    candidate = (base / relpath).resolve()
    if not str(candidate).startswith(str(base)):
        abort(403)
    if not candidate.exists() or candidate.is_dir():
        abort(404)
    return send_from_directory(str(base), relpath, as_attachment=True)

@app.route("/api/<token>/archive", methods=["GET"])
@app.route("/api/<token>/archive/<path:relpath>", methods=["GET"])
@require_auth_for_token
def api_archive(token, relpath=""):
    """
    Create a ZIP archive of the shared folder (or a subfolder)
    and return it as a downloadable file.

    /api/<token>/archive            -> zip entire root shared folder
    /api/<token>/archive/<relpath>  -> zip subfolder under root
    """
    share = SHARES[token]
    base = share["path"].resolve()

    # target directory for archiving
    target_dir = (base / relpath).resolve() if relpath else base

    # security: ensure target_dir is inside base
    if not str(target_dir).startswith(str(base)):
        abort(403, "Invalid archive path")

    if not target_dir.exists() or not target_dir.is_dir():
        abort(404, "Folder to archive does not exist")

    # Decide archive name based on folder name
    folder_name = target_dir.name if relpath else base.name or "share"

    # Create ZIP in memory (for medium-sized folders this is OK)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(target_dir):
            for fname in files:
                full_path = Path(root) / fname
                # store paths relative to the selected target_dir
                arcname = full_path.relative_to(target_dir.parent)
                zf.write(full_path, arcname)

    buf.seek(0)
    return send_file(
        buf,
        mimetype="application/zip",
        as_attachment=True,
        download_name=f"{folder_name}.zip",
    )

@app.route("/api/<token>/preview/<path:relpath>", methods=["GET"])
@require_auth_for_token
def api_preview(token, relpath):
    share = SHARES[token]
    base = share["path"]
    candidate = (base / relpath).resolve()
    if not str(candidate).startswith(str(base)) or not candidate.exists():
        abort(404)
    mime, _ = mimetypes.guess_type(str(candidate))
    if mime and (mime.startswith("image/") or mime.startswith("text/")):
        return send_from_directory(str(base), relpath)
    return jsonify({"name": candidate.name, "mime": mime or "application/octet-stream"})


# -----------------------------
# Revoke share
# -----------------------------

@app.route("/revoke/<token>", methods=["POST"])
def revoke(token):
    SHARES.pop(token, None)
    return "revoked", 200


# -----------------------------
# Main entry
# -----------------------------

if __name__ == "__main__":
    # For development: accessible on LAN
    app.run(host="0.0.0.0", port=8000, debug=True)

