import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

from dotenv import load_dotenv

load_dotenv()

from flask import Flask
from flask_cors import CORS

from models import init_db
from routes import (
    register_activity_routes,
    register_auth_routes,
    register_deals_routes,
    register_health_routes,
    register_profile_routes,
)
from services.ai import llm_is_configured

app = Flask(__name__)
CORS(app)

# Raise Flask/Werkzeug's own request body cap above our own MAX_AUDIO_BYTES
# check below — otherwise the dev server can reject a long recording before
# our code ever gets a chance to return a friendly error.
app.config["MAX_CONTENT_LENGTH"] = 250 * 1024 * 1024  # 250 MB hard ceiling

init_db()

# Register all route modules
register_health_routes(app)
register_auth_routes(app)
register_profile_routes(app)
register_deals_routes(app)
register_activity_routes(app)


# ── Error handlers ────────────────────────────────────────────────────────
@app.errorhandler(400)
@app.errorhandler(401)
@app.errorhandler(403)
@app.errorhandler(404)
@app.errorhandler(405)
@app.errorhandler(500)
def handle_http_error(error):
    return {"error": f"http error {error.code}: {error.description}"}, error.code


@app.errorhandler(Exception)
def handle_exception(error):
    status_code = getattr(error, "code", 500)
    if not isinstance(status_code, int):
        status_code = 500
    print(f"[EXCEPTION_HANDLER] {type(error).__name__}: {str(error)}")
    import traceback

    traceback.print_exc()
    return {"error": f"server error: {str(error)}", "type": type(error).__name__}, status_code


if __name__ == "__main__":
    if not llm_is_configured():
        print(
            "[WARN] No LLM API key found in .env — running in FALLBACK mode "
            "(heuristic extraction). Add an API key to backend/.env for full AI analysis."
        )
    # threaded=True so a slow/long-running request (e.g. transcribing a long
    # audio file, which can legitimately take minutes) doesn't block every
    # other request on the single dev-server thread.
    app.run(debug=False, port=5000, threaded=True)
