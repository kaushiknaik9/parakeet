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
        SAMPLE_TRANSCRIPT = """Buyer: Hi, thanks for hopping on the call. Let's finalize the bulk order of wireless earbuds.
Seller: Of course. So we're looking at 500 units of the ANC Pro earbuds at ₹800 per unit, that's ₹4,00,000 total.
Buyer: That works for us. On payment, I'll pay 30% upfront and the rest on delivery.
Seller: Sounds good, so that's ₹1,20,000 advance and ₹2,80,000 balance on delivery.
Buyer: Actually, let's round it — I'll send ₹1,50,000 as advance instead, just to be safe on our end.
Seller: No problem, we'll adjust the balance to ₹2,50,000 then.
Buyer: Great. When can you deliver?
Seller: We can deliver within 15 days, by 30th October, shipped via our logistics partner to your Bangalore warehouse.
Buyer: Perfect. We'll also need a 12 month warranty on all units, and you'll handle any DOA replacements within 7 days.
Seller: Agreed, that's part of our standard terms. We'll also need the advance payment confirmed within 48 hours to lock the manufacturing slot.
Buyer: Understood, I'll get finance to wire it tomorrow. If quality checks fail on the first batch, can we get a partial refund?
Seller: Yes, if more than 5% of a batch fails QC, we'll refund or replace that portion within 10 days.
Buyer: Sounds fair. Let's go ahead with this."""
        return jsonify({"transcript": SAMPLE_TRANSCRIPT}), 200
