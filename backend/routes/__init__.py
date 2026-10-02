from .activity import register_activity_routes
from .auth import register_auth_routes
from .deals import register_deals_routes
from .health import register_health_routes
from .profile import register_profile_routes

__all__ = [
    "register_activity_routes",
    "register_auth_routes",
    "register_deals_routes",
    "register_health_routes",
    "register_profile_routes",
]
