from flask import jsonify
from services import email_service
from services.ai import llm_is_configured, stt_is_configured, stt_provider


def register_health_routes(app):
    @app.route("/")
    def index():
        return jsonify(
            {
                "status": "ok",
                "service": "Armour API",
                "llm_configured": llm_is_configured(),
                "stt_configured": stt_is_configured(),
                "stt_provider": stt_provider(),
                "email_configured": email_service.is_configured(),
            }
        )

    @app.get("/api/sample-transcript")
    def sample_transcript():
        SAMPLE_TRANSCRIPT = """Buyer: Hi, thanks for hopping on the call. Let's finalize the order for our new IoT controller production run.
Seller: Perfect. We are quoting 5,000 units of STM32F407VG microcontrollers at ₹450 per unit, total ₹22,50,000.
Buyer: That pricing works for us. We also need 2,000 units of ESP32-WROOM Wi-Fi modules at ₹200 per unit, total ₹4,00,000.
Seller: Confirmed. So the total order value comes out to ₹26,50,000.
Buyer: Great. For payment terms, we'll do 30% advance on PO issue and 70% balance post-inspection.
Seller: Agreed. That's ₹7,95,000 advance and ₹18,55,000 balance.
Buyer: What is the delivery lead time?
Seller: Lead time is 4 weeks, delivered in 2 staggered shipments to your Bangalore facility.
Buyer: Perfect. We require 12-Month RMA warranty, RoHS compliance, and anti-static ESD packaging.
Seller: Confirmed. All parts are 100% factory certified with 12-Month RMA replacement."""
        return jsonify({"transcript": SAMPLE_TRANSCRIPT}), 200
