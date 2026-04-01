from fastapi import APIRouter, HTTPException, Depends
from database import db
from auth import get_current_user
from models import CATEGORIES, CategorySuggestion, ADMIN_EMAIL
from datetime import datetime, timezone
import uuid
import httpx
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# ============ CATEGORIES ============

@router.get("/categories")
async def get_categories():
    return {"categories": CATEGORIES}


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
    
    logger.info(f"Category suggestion: {data.name} by {suggestion['suggested_by_name']}")
    return {"message": "Návrh kategorie byl odeslán ke schválení"}


# ============ GEOCODING ============

@router.get("/geocode/search")
async def geocode_search(q: str):
    async with httpx.AsyncClient() as client_http:
        response = await client_http.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": q, "format": "json", "addressdetails": 1, "limit": 5, "countrycodes": "cz", "accept-language": "cs"},
            headers={"User-Agent": "CraftBolt/1.0"}
        )
        return response.json()


@router.get("/geocode/reverse")
async def geocode_reverse(lat: float, lon: float):
    async with httpx.AsyncClient() as client_http:
        response = await client_http.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={"lat": lat, "lon": lon, "format": "json", "addressdetails": 1, "accept-language": "cs"},
            headers={"User-Agent": "CraftBolt/1.0"}
        )
        return response.json()


# ============ ARES ============

@router.get("/ares/{ico}")
async def ares_lookup(ico: str):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client_http:
            response = await client_http.get(f"https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/{ico}")
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="IČO nenalezeno v registru ARES")
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


# ============ HEALTH ============

@router.get("/")
async def root():
    return {"message": "CraftBolt API v1.0", "status": "running"}


@router.get("/health")
async def health():
    return {"status": "healthy"}
