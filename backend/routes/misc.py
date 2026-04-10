from fastapi import APIRouter, HTTPException, Depends
from database import db
from auth import get_current_user
from models import CATEGORIES, CategorySuggestion, ADMIN_EMAIL
from notifications import NotificationService
from datetime import datetime, timezone
import uuid
import httpx
import logging

logger = logging.getLogger(__name__)
router = APIRouter()
notification_service = NotificationService()


# ============ CATEGORIES ============

@router.get("/categories")
async def get_categories():
    # Combine static categories with admin-approved ones
    approved = await db.approved_categories.find({}, {"_id": 0, "name": 1}).to_list(200)
    approved_names = [a["name"] for a in approved if a.get("name") and a["name"] not in CATEGORIES]
    all_categories = sorted(set(CATEGORIES + approved_names), key=lambda x: x.lower())
    return {"categories": all_categories}


@router.post("/categories/suggest")
async def suggest_category(data: CategorySuggestion, current_user: dict = Depends(get_current_user)):
    suggestion = {
        "id": str(uuid.uuid4()),
        "category_name": data.name,
        "suggested_by": current_user["id"],
        "suggested_by_name": current_user.get("company_name") or current_user["email"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "pending"
    }
    await db.category_suggestions.insert_one(suggestion)
    
    notification = {
        "id": str(uuid.uuid4()),
        "type": "category_suggestion",
        "message": f"Dodavatel {suggestion['suggested_by_name']} navrhl novou kategorii: {data.name}",
        "admin_email": ADMIN_EMAIL,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    # Send email to admin
    try:
        await notification_service.notify_category_suggestion(
            ADMIN_EMAIL, data.name, suggestion['suggested_by_name']
        )
    except Exception as e:
        logger.error(f"Failed to send category suggestion email: {e}")
    
    logger.info(f"Category suggestion: {data.name} by {suggestion['suggested_by_name']}")
    return {"message": "Návrh kategorie byl odeslán ke schválení"}


# ============ GEOCODING ============

@router.get("/geocode/search")
async def geocode_search(q: str):
    """Search addresses with Nominatim, fallback to Photon."""
    # Try Nominatim first
    try:
        async with httpx.AsyncClient(timeout=10.0) as client_http:
            response = await client_http.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "q": q,
                    "format": "json",
                    "addressdetails": 1,
                    "limit": 5,
                    "countrycodes": "cz",
                    "accept-language": "cs",
                },
                headers={"User-Agent": "CraftBolt/2.0 (info@craftbolt.cz)"}
            )
            if response.status_code == 200:
                try:
                    data = response.json()
                    if isinstance(data, list) and len(data) > 0:
                        return data
                except Exception:
                    pass
    except Exception as e:
        logger.warning(f"Nominatim failed: {e}")

    # Fallback to Photon (komoot)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client_http:
            response = await client_http.get(
                "https://photon.komoot.io/api/",
                params={"q": q, "limit": 8, "lat": 49.8, "lon": 15.5},
                headers={"User-Agent": "CraftBolt/2.0"}
            )
            if response.status_code == 200:
                data = response.json()
                features = data.get("features", [])
                # Convert Photon format to Nominatim-compatible format
                results = []
                for f in features:
                    props = f.get("properties", {})
                    coords = f.get("geometry", {}).get("coordinates", [0, 0])
                    country = props.get("country", "")
                    if country and "czech" not in country.lower() and "česk" not in country.lower():
                        continue
                    parts = []
                    if props.get("street"):
                        street = props["street"]
                        if props.get("housenumber"):
                            street += f" {props['housenumber']}"
                        parts.append(street)
                    elif props.get("name"):
                        parts.append(props["name"])
                    if props.get("postcode"):
                        parts.append(props["postcode"])
                    if props.get("city"):
                        parts.append(props["city"])
                    elif props.get("county"):
                        parts.append(props["county"])
                    display = ", ".join(parts) if parts else props.get("name", q)
                    results.append({
                        "display_name": display,
                        "lat": str(coords[1]) if len(coords) > 1 else "0",
                        "lon": str(coords[0]) if len(coords) > 0 else "0",
                        "address": {
                            "road": props.get("street", ""),
                            "house_number": props.get("housenumber", ""),
                            "postcode": props.get("postcode", ""),
                            "city": props.get("city", ""),
                            "state": props.get("state", ""),
                            "country": props.get("country", ""),
                        }
                    })
                return results
    except Exception as e:
        logger.warning(f"Photon fallback also failed: {e}")

    return []


@router.get("/geocode/reverse")
async def geocode_reverse(lat: float, lon: float):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client_http:
            response = await client_http.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"lat": lat, "lon": lon, "format": "json", "addressdetails": 1, "accept-language": "cs"},
                headers={"User-Agent": "CraftBolt/2.0 (info@craftbolt.cz)"}
            )
            if response.status_code != 200:
                return {}
            try:
                return response.json()
            except Exception:
                return {}
    except Exception as e:
        logger.error(f"Geocode reverse error: {e}")
        return {}


# ============ ARES ============

@router.get("/ares/{ico}")
async def ares_lookup(ico: str):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client_http:
            response = await client_http.get(f"https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/{ico}")
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="IČ nenalezeno v registru ARES")
            data = response.json()
            
            result = {"company_name": data.get("obchodniJmeno", ""), "ico": data.get("ico", ico), "dic": "", "address": ""}
            
            dic_list = data.get("dic", []) if isinstance(data.get("dic"), list) else []
            if dic_list:
                result["dic"] = dic_list[0] if dic_list else ""
            elif isinstance(data.get("dic"), str):
                result["dic"] = data.get("dic", "")
            
            sidlo = data.get("sidlo", {})
            if sidlo:
                parts = []
                if sidlo.get("nazevUlice"):
                    street = sidlo["nazevUlice"]
                    if sidlo.get("cisloDomovni"):
                        street += f" {sidlo['cisloDomovni']}"
                    if sidlo.get("cisloOrientacni"):
                        street += f"/{sidlo['cisloOrientacni']}"
                    parts.append(street)
                if sidlo.get("psc"):
                    parts.append(str(sidlo["psc"]))
                if sidlo.get("nazevObce"):
                    parts.append(sidlo["nazevObce"])
                result["address"] = ", ".join(parts)
            
            return result
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="ARES služba není dostupná")


# ============ PLATFORM STATS (public) ============

@router.get("/platform/stats")
async def get_platform_stats():
    """Public endpoint returning user counts and online count."""
    customers = await db.users.count_documents({"role": "customer", "is_blocked": {"$ne": True}})
    suppliers = await db.users.count_documents({"role": "supplier", "is_blocked": {"$ne": True}})
    both = await db.users.count_documents({"role": "customer_supplier", "is_blocked": {"$ne": True}})
    online = await db.online_users.count_documents({})
    return {
        "customers": customers,
        "suppliers": suppliers,
        "customer_suppliers": both,
        "online": online
    }


@router.post("/platform/heartbeat")
async def heartbeat(current_user: dict = Depends(get_current_user)):
    """Track online users via heartbeat."""
    await db.online_users.update_one(
        {"user_id": current_user["id"]},
        {"$set": {
            "user_id": current_user["id"],
            "role": current_user.get("role", ""),
            "last_seen": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"ok": True}


# ============ HEALTH ============

@router.get("/")
async def root():
    return {"message": "CraftBolt API v1.0", "status": "running"}


@router.get("/health")
async def health():
    return {"status": "healthy"}
