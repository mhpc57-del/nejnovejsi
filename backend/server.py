from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import httpx
import base64
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
import stripe
from notifications import notification_service

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'craftbolt-secret-key-2026')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="CraftBolt API")

# Uploads directory
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# Create routers
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ MODELS ============

class UserRole:
    CUSTOMER = "customer"
    SUPPLIER = "supplier"
    ADMIN = "admin"

ADMIN_EMAIL = "m.schwarzer@email.cz"

class SupplierType:
    OSVC = "osvc"  # 490 Kč
    NEPODNIKATEL = "nepodnikatel"  # 290 Kč
    COMPANY = "company"  # 490 Kč (same as OSVC)

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    phone: str
    role: str
    account_type: Optional[str] = None  # nepodnikatel, osvc, company — for both customer and supplier
    supplier_type: Optional[str] = None  # kept for backward compat
    company_name: Optional[str] = None
    ico: Optional[str] = None
    dic: Optional[str] = None
    address: Optional[str] = None
    branch_address: Optional[str] = None
    permanent_address: Optional[str] = None
    actual_address: Optional[str] = None
    date_of_birth: Optional[str] = None
    profile_image: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[str] = None
    categories: Optional[List[str]] = []
    custom_categories: Optional[List[str]] = []
    reference_photos: Optional[List[str]] = []
    service_areas: Optional[List[dict]] = []  # [{lat, lng, radius_km}]

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    phone: str
    role: str
    account_type: Optional[str] = None
    supplier_type: Optional[str] = None
    company_name: Optional[str] = None
    ico: Optional[str] = None
    dic: Optional[str] = None
    address: Optional[str] = None
    branch_address: Optional[str] = None
    permanent_address: Optional[str] = None
    actual_address: Optional[str] = None
    date_of_birth: Optional[str] = None
    profile_image: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[str] = None
    categories: List[str] = []
    custom_categories: List[str] = []
    reference_photos: List[str] = []
    service_areas: List[dict] = []
    is_verified: bool = False
    trial_ends_at: Optional[str] = None
    subscription_active: bool = False
    created_at: str
    rating: float = 0.0
    reviews_count: int = 0
    location: Optional[dict] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class DemandCreate(BaseModel):
    title: str
    description: str
    category: str
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    images: List[str] = []
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    payment_method: str = "cash"  # cash, card, transfer

class DemandResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str
    category: str
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    images: List[str] = []
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    payment_method: Optional[str] = "cash"
    status: str  # open, in_progress, completed, cancelled
    customer_id: str
    customer_name: Optional[str] = None
    assigned_supplier_id: Optional[str] = None
    assigned_supplier_name: Optional[str] = None
    created_at: str
    accepted_at: Optional[str] = None
    completed_at: Optional[str] = None

class MessageCreate(BaseModel):
    demand_id: str
    content: str

class MessageResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    demand_id: str
    sender_id: str
    sender_name: str
    sender_role: str
    content: str
    created_at: str

class ReviewCreate(BaseModel):
    demand_id: str
    rating: int  # 1-5
    comment: str
    images: List[str] = []

class ReviewResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    demand_id: str
    reviewer_id: str
    reviewer_name: str
    reviewed_user_id: str
    rating: int
    comment: str
    images: List[str] = []
    created_at: str

class LocationUpdate(BaseModel):
    latitude: float
    longitude: float

# ============ CATEGORIES ============

CATEGORIES = [
    "Autoservis",
    "Bezpečnostní služby, zabezpečení objektů",
    "Čalounictví",
    "Dluhové poradenství, vymáhání pohledávek",
    "Finanční poradenství",
    "Fotografické služby",
    "Geodetické služby",
    "Hlídání dětí a zvířat",
    "Hodinový manžel",
    "Instalatérství",
    "IT služby, Webdesign",
    "Izolatérství",
    "Jeřábnické práce, autodoprava",
    "Klimatizace, vzduchotechnika",
    "Kominictví",
    "Kosmetické služby",
    "Krejčovství",
    "Lesnictví, myslivectví",
    "Malířství, natěračství",
    "Masérské služby",
    "Měření a regulace",
    "Montáže oken/dveří",
    "Pečovatelské služby",
    "Pískování materiálů",
    "Plynaři, topenáři",
    "Podlaháři",
    "Pojišťovnictví",
    "Požárně bezpečnostní služby",
    "Právnické služby",
    "Projektování staveb",
    "Pronájem reklamních ploch",
    "Překlady, tlumočení",
    "Půjčky, hypotéky",
    "Půjčovny",
    "Realitní služby",
    "Reklamní služby",
    "Revize",
    "Sádrokartonářské práce",
    "Sanace zdiva",
    "Servis elektrospotřebičů",
    "Elektromontáže - silnoproud",
    "Sklenáři",
    "Elektromontáže - slaboproud",
    "Služby pro zvířata",
    "Stavební práce, rekonstrukce",
    "Stěhování, doprava",
    "Strojní a ruční výkopové práce",
    "Tesaři, pokrývači",
    "Truhláři, stolaři, výroba nábytku",
    "Účetnictví, správa firem",
    "Údržba zeleně",
    "Úklidové služby",
    "Veřejné osvětlení",
    "Výroba z kovu",
    "Výškové práce",
    "Výuka",
    "Zahradní architektura",
    "Zámečnictví, svářeči",
    "Zednictví, obkladačství, dlaždičství",
    "Zemnění, hromosvody",
    "Ostatní"
]

# ============ HELPER FUNCTIONS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def user_to_response(user: dict) -> UserResponse:
    return UserResponse(
        id=user["id"],
        email=user["email"],
        phone=user["phone"],
        role=user["role"],
        supplier_type=user.get("supplier_type"),
        company_name=user.get("company_name"),
        ico=user.get("ico"),
        address=user.get("address"),
        categories=user.get("categories", []),
        is_verified=user.get("is_verified", False),
        trial_ends_at=user.get("trial_ends_at"),
        subscription_active=user.get("subscription_active", False),
        created_at=user.get("created_at", datetime.now(timezone.utc).isoformat()),
        rating=user.get("rating", 0.0),
        reviews_count=user.get("reviews_count", 0),
        location=user.get("location")
    )

# ============ AUTH ROUTES ============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    trial_end = now + timedelta(days=14)
    
    # Resolve account_type (use account_type or fallback to supplier_type)
    account_type = user_data.account_type or user_data.supplier_type
    
    user = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "phone": user_data.phone,
        "role": user_data.role,
        "account_type": account_type,
        "supplier_type": account_type,  # backward compat
        "company_name": user_data.company_name,
        "ico": user_data.ico,
        "dic": user_data.dic,
        "address": user_data.address,
        "branch_address": user_data.branch_address,
        "permanent_address": user_data.permanent_address,
        "actual_address": user_data.actual_address,
        "date_of_birth": user_data.date_of_birth,
        "profile_image": user_data.profile_image,
        "bio": user_data.bio,
        "website": user_data.website,
        "categories": user_data.categories or [],
        "custom_categories": user_data.custom_categories or [],
        "reference_photos": user_data.reference_photos or [],
        "service_areas": user_data.service_areas or [],
        "is_verified": False,
        "trial_ends_at": trial_end.isoformat(),
        "subscription_active": True,  # Active during trial
        "created_at": now.isoformat(),
        "rating": 0.0,
        "reviews_count": 0,
        "location": None
    }
    
    await db.users.insert_one(user)
    
    # Send registration notification
    try:
        await notification_service.notify_registration(
            user_email=user_data.email,
            user_name=user_data.company_name or user_data.email.split('@')[0],
            user_role=user_data.role,
            user_phone=user_data.phone
        )
    except Exception as e:
        logger.error(f"Failed to send registration notification: {str(e)}")
    
    token = create_token(user_id, user_data.email, user_data.role)
    
    return TokenResponse(
        access_token=token,
        user=user_to_response(user)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"], user["role"])
    
    return TokenResponse(
        access_token=token,
        user=user_to_response(user)
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return user_to_response(current_user)

# ============ USER ROUTES ============

@api_router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user_to_response(user)

class ProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    phone: Optional[str] = None
    ico: Optional[str] = None
    dic: Optional[str] = None
    address: Optional[str] = None
    branch_address: Optional[str] = None
    permanent_address: Optional[str] = None
    actual_address: Optional[str] = None
    date_of_birth: Optional[str] = None
    profile_image: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[str] = None
    categories: Optional[List[str]] = None
    custom_categories: Optional[List[str]] = None
    reference_photos: Optional[List[str]] = None
    service_areas: Optional[List[dict]] = None
    account_type: Optional[str] = None

PROFILE_FIELDS = [
    "company_name", "phone", "ico", "dic", "address", "branch_address",
    "permanent_address", "actual_address", "date_of_birth", "profile_image",
    "bio", "website", "categories", "custom_categories", "reference_photos",
    "service_areas", "account_type"
]

@api_router.put("/users/profile")
async def update_profile(
    data: ProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    update_data = {}
    for field in PROFILE_FIELDS:
        val = getattr(data, field, None)
        if val is not None:
            update_data[field] = val
    
    # Sync supplier_type with account_type
    if "account_type" in update_data:
        update_data["supplier_type"] = update_data["account_type"]
    
    if update_data:
        await db.users.update_one({"id": current_user["id"]}, {"$set": update_data})
    
    updated = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    return updated

@api_router.post("/users/location")
async def update_location(
    location: LocationUpdate,
    current_user: dict = Depends(get_current_user)
):
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"location": {"lat": location.latitude, "lng": location.longitude, "updated_at": datetime.now(timezone.utc).isoformat()}}}
    )
    return {"message": "Location updated"}

# ============ CATEGORIES ROUTES ============

@api_router.get("/categories")
async def get_categories():
    return {"categories": CATEGORIES}

class CategorySuggestion(BaseModel):
    category_name: str

@api_router.post("/categories/suggest")
async def suggest_category(
    data: CategorySuggestion,
    current_user: dict = Depends(get_current_user)
):
    suggestion = {
        "id": str(uuid.uuid4()),
        "category_name": data.category_name,
        "suggested_by": current_user["id"],
        "suggested_by_name": current_user.get("company_name") or current_user["email"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "pending"
    }
    await db.category_suggestions.insert_one(suggestion)
    
    # Create admin notification
    notification = {
        "id": str(uuid.uuid4()),
        "type": "category_suggestion",
        "message": f"Dodavatel {suggestion['suggested_by_name']} navrhl novou kategorii: {data.category_name}",
        "admin_email": ADMIN_EMAIL,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    logger.info(f"Category suggestion: {data.category_name} by {suggestion['suggested_by_name']} — notification sent to {ADMIN_EMAIL}")
    
    return {"message": "Návrh kategorie byl odeslán ke schválení"}

# ============ GEOCODING ROUTES ============

@api_router.get("/geocode/search")
async def geocode_search(q: str):
    """Search for addresses using OpenStreetMap Nominatim"""
    async with httpx.AsyncClient() as client_http:
        response = await client_http.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "q": q,
                "format": "json",
                "addressdetails": 1,
                "limit": 5,
                "countrycodes": "cz",
                "accept-language": "cs"
            },
            headers={"User-Agent": "CraftBolt/1.0"}
        )
        return response.json()

@api_router.get("/geocode/reverse")
async def geocode_reverse(lat: float, lon: float):
    """Reverse geocode coordinates to address using Nominatim"""
    async with httpx.AsyncClient() as client_http:
        response = await client_http.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={
                "lat": lat,
                "lon": lon,
                "format": "json",
                "addressdetails": 1,
                "accept-language": "cs"
            },
            headers={"User-Agent": "CraftBolt/1.0"}
        )
        return response.json()

# ============ ARES ROUTES ============

@api_router.get("/ares/{ico}")
async def ares_lookup(ico: str):
    """Lookup company info from Czech ARES registry by ICO"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client_http:
            response = await client_http.get(
                f"https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/{ico}"
            )
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="IČO nenalezeno v registru ARES")
            data = response.json()
            
            result = {
                "company_name": data.get("obchodniJmeno", ""),
                "ico": data.get("ico", ico),
                "dic": "",
                "address": ""
            }
            
            # Extract DIC
            dic_list = data.get("dic", []) if isinstance(data.get("dic"), list) else []
            if dic_list:
                result["dic"] = dic_list[0] if dic_list else ""
            elif isinstance(data.get("dic"), str):
                result["dic"] = data.get("dic", "")
            
            # Extract address
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

# ============ UPLOAD ROUTES ============

ALLOWED_IMAGE_TYPES = [
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "image/heic", "image/heif", "image/bmp", "image/tiff",
    "image/svg+xml", "image/avif",
]
MAX_UPLOAD_SIZE = 25 * 1024 * 1024  # 25MB

async def _process_upload(file: UploadFile):
    """Shared upload logic for both authenticated and public endpoints."""
    content_type = file.content_type or ""
    ext = (file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg").lower()
    
    # Accept by content type OR file extension
    allowed_extensions = ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "bmp", "tiff", "tif", "svg", "avif"]
    if content_type not in ALLOWED_IMAGE_TYPES and ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Nepodporovaný formát ({ext}). Povolené: JPEG, PNG, WebP, GIF, HEIC, BMP, TIFF, AVIF"
        )
    
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE:
        size_mb = len(contents) / (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Soubor je příliš velký ({size_mb:.1f} MB). Max 25 MB.")
    
    # Convert HEIC/HEIF to JPEG if Pillow is available
    if ext in ["heic", "heif"]:
        try:
            import pillow_heif
            pillow_heif.register_heif_opener()
            from PIL import Image
            import io
            img = Image.open(io.BytesIO(contents))
            output = io.BytesIO()
            img.convert("RGB").save(output, format="JPEG", quality=90)
            contents = output.getvalue()
            ext = "jpg"
        except Exception as e:
            logger.warning(f"HEIC conversion failed, saving raw: {e}")
    
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = UPLOADS_DIR / filename
    
    with open(filepath, "wb") as f:
        f.write(contents)
    
    return {"url": f"/api/uploads/{filename}", "filename": filename}

@api_router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    return await _process_upload(file)

@api_router.post("/upload/public")
async def upload_file_public(file: UploadFile = File(...)):
    """Public upload endpoint for registration (no auth required)."""
    return await _process_upload(file)

# ============ DEMANDS ROUTES ============

@api_router.post("/demands", response_model=DemandResponse)
async def create_demand(
    demand_data: DemandCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != UserRole.CUSTOMER and current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only customers can create demands")
    
    demand_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    demand = {
        "id": demand_id,
        "title": demand_data.title,
        "description": demand_data.description,
        "category": demand_data.category,
        "address": demand_data.address,
        "latitude": demand_data.latitude,
        "longitude": demand_data.longitude,
        "images": demand_data.images,
        "budget_min": demand_data.budget_min,
        "budget_max": demand_data.budget_max,
        "payment_method": demand_data.payment_method,
        "status": "open",
        "customer_id": current_user["id"],
        "customer_name": current_user.get("company_name") or current_user["email"],
        "assigned_supplier_id": None,
        "assigned_supplier_name": None,
        "created_at": now.isoformat(),
        "accepted_at": None,
        "completed_at": None
    }
    
    await db.demands.insert_one(demand)
    
    # Notify suppliers in this category
    try:
        suppliers = await db.users.find({
            "role": "supplier",
            "categories": demand_data.category,
            "subscription_active": True
        }, {"_id": 0, "email": 1, "phone": 1}).to_list(100)
        
        if suppliers:
            await notification_service.notify_new_demand(
                suppliers=suppliers,
                demand_title=demand_data.title,
                demand_category=demand_data.category,
                demand_address=demand_data.address or ""
            )
    except Exception as e:
        logger.error(f"Failed to send new demand notifications: {str(e)}")
    
    return DemandResponse(**demand)

@api_router.get("/demands", response_model=List[DemandResponse])
async def get_demands(
    status: Optional[str] = None,
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if current_user["role"] == UserRole.CUSTOMER:
        query["customer_id"] = current_user["id"]
    elif current_user["role"] == UserRole.SUPPLIER:
        # Suppliers see open demands or their assigned ones
        if status:
            if status == "open":
                query["status"] = "open"
            else:
                query["$or"] = [
                    {"status": status, "assigned_supplier_id": current_user["id"]},
                    {"status": "open"}
                ]
        else:
            query["$or"] = [
                {"assigned_supplier_id": current_user["id"]},
                {"status": "open"}
            ]
    
    if category:
        query["category"] = category
    
    demands = await db.demands.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [DemandResponse(**d) for d in demands]

@api_router.get("/demands/available", response_model=List[DemandResponse])
async def get_available_demands(
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != UserRole.SUPPLIER:
        raise HTTPException(status_code=403, detail="Only suppliers can view available demands")
    
    query = {"status": "open"}
    
    # Filter by supplier's categories if they have any
    supplier_categories = current_user.get("categories", [])
    if supplier_categories:
        query["category"] = {"$in": supplier_categories}
    
    if category:
        query["category"] = category
    
    demands = await db.demands.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [DemandResponse(**d) for d in demands]

@api_router.get("/demands/my", response_model=List[DemandResponse])
async def get_my_demands(current_user: dict = Depends(get_current_user)):
    query = {}
    
    if current_user["role"] == UserRole.CUSTOMER:
        query["customer_id"] = current_user["id"]
    elif current_user["role"] == UserRole.SUPPLIER:
        query["assigned_supplier_id"] = current_user["id"]
    
    demands = await db.demands.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [DemandResponse(**d) for d in demands]

@api_router.get("/demands/{demand_id}", response_model=DemandResponse)
async def get_demand(demand_id: str, current_user: dict = Depends(get_current_user)):
    demand = await db.demands.find_one({"id": demand_id}, {"_id": 0})
    if not demand:
        raise HTTPException(status_code=404, detail="Demand not found")
    return DemandResponse(**demand)

@api_router.post("/demands/{demand_id}/accept")
async def accept_demand(demand_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.SUPPLIER:
        raise HTTPException(status_code=403, detail="Only suppliers can accept demands")
    
    demand = await db.demands.find_one({"id": demand_id})
    if not demand:
        raise HTTPException(status_code=404, detail="Demand not found")
    
    if demand["status"] != "open":
        raise HTTPException(status_code=400, detail="Demand is not available")
    
    now = datetime.now(timezone.utc)
    await db.demands.update_one(
        {"id": demand_id},
        {"$set": {
            "status": "in_progress",
            "assigned_supplier_id": current_user["id"],
            "assigned_supplier_name": current_user.get("company_name") or current_user["email"],
            "accepted_at": now.isoformat()
        }}
    )
    
    # Notify customer about accepted demand
    try:
        customer = await db.users.find_one({"id": demand["customer_id"]}, {"_id": 0, "email": 1, "phone": 1})
        if customer:
            await notification_service.notify_new_offer(
                customer_email=customer["email"],
                customer_phone=customer.get("phone"),
                supplier_name=current_user.get("company_name") or current_user["email"],
                demand_title=demand["title"]
            )
    except Exception as e:
        logger.error(f"Failed to send accept notification: {str(e)}")
    
    return {"message": "Demand accepted"}

@api_router.post("/demands/{demand_id}/complete")
async def complete_demand(demand_id: str, current_user: dict = Depends(get_current_user)):
    demand = await db.demands.find_one({"id": demand_id})
    if not demand:
        raise HTTPException(status_code=404, detail="Demand not found")
    
    # Both customer and assigned supplier can complete
    if current_user["id"] != demand["customer_id"] and current_user["id"] != demand.get("assigned_supplier_id"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    now = datetime.now(timezone.utc)
    await db.demands.update_one(
        {"id": demand_id},
        {"$set": {"status": "completed", "completed_at": now.isoformat()}}
    )
    
    # Notify both parties about completion
    try:
        customer = await db.users.find_one({"id": demand["customer_id"]}, {"_id": 0, "email": 1, "phone": 1})
        supplier = await db.users.find_one({"id": demand.get("assigned_supplier_id")}, {"_id": 0, "email": 1, "phone": 1}) if demand.get("assigned_supplier_id") else None
        
        if customer:
            await notification_service.notify_status_change(
                user_email=customer["email"],
                user_phone=customer.get("phone"),
                demand_title=demand["title"],
                old_status="in_progress",
                new_status="completed"
            )
        if supplier:
            await notification_service.notify_status_change(
                user_email=supplier["email"],
                user_phone=supplier.get("phone"),
                demand_title=demand["title"],
                old_status="in_progress",
                new_status="completed"
            )
    except Exception as e:
        logger.error(f"Failed to send completion notification: {str(e)}")
    
    return {"message": "Demand completed"}

@api_router.post("/demands/{demand_id}/cancel")
async def cancel_demand(demand_id: str, current_user: dict = Depends(get_current_user)):
    demand = await db.demands.find_one({"id": demand_id})
    if not demand:
        raise HTTPException(status_code=404, detail="Demand not found")
    
    if current_user["id"] != demand["customer_id"] and current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.demands.update_one(
        {"id": demand_id},
        {"$set": {"status": "cancelled"}}
    )
    
    # Notify supplier about cancellation
    try:
        if demand.get("assigned_supplier_id"):
            supplier = await db.users.find_one({"id": demand["assigned_supplier_id"]}, {"_id": 0, "email": 1, "phone": 1})
            if supplier:
                await notification_service.notify_status_change(
                    user_email=supplier["email"],
                    user_phone=supplier.get("phone"),
                    demand_title=demand["title"],
                    old_status=demand["status"],
                    new_status="cancelled"
                )
    except Exception as e:
        logger.error(f"Failed to send cancellation notification: {str(e)}")
    
    return {"message": "Demand cancelled"}

# ============ MESSAGES ROUTES ============

@api_router.post("/messages", response_model=MessageResponse)
async def send_message(
    message_data: MessageCreate,
    current_user: dict = Depends(get_current_user)
):
    demand = await db.demands.find_one({"id": message_data.demand_id})
    if not demand:
        raise HTTPException(status_code=404, detail="Demand not found")
    
    # Only customer and assigned supplier can chat
    if current_user["id"] != demand["customer_id"] and current_user["id"] != demand.get("assigned_supplier_id"):
        # Allow if demand is open and user is supplier
        if demand["status"] != "open" or current_user["role"] != UserRole.SUPPLIER:
            raise HTTPException(status_code=403, detail="Not authorized to send messages")
    
    message_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    message = {
        "id": message_id,
        "demand_id": message_data.demand_id,
        "sender_id": current_user["id"],
        "sender_name": current_user.get("company_name") or current_user["email"],
        "sender_role": current_user["role"],
        "content": message_data.content,
        "created_at": now.isoformat()
    }
    
    await db.messages.insert_one(message)
    
    # Send notification to recipient
    try:
        # Determine recipient
        if current_user["id"] == demand["customer_id"]:
            # Message from customer to supplier
            recipient_id = demand.get("assigned_supplier_id")
        else:
            # Message from supplier to customer
            recipient_id = demand["customer_id"]
        
        if recipient_id:
            recipient = await db.users.find_one({"id": recipient_id}, {"_id": 0, "email": 1, "phone": 1})
            if recipient:
                await notification_service.notify_new_message(
                    recipient_email=recipient["email"],
                    recipient_phone=recipient.get("phone"),
                    sender_name=current_user.get("company_name") or current_user["email"],
                    demand_title=demand["title"],
                    message=message_data.content
                )
    except Exception as e:
        logger.error(f"Failed to send message notification: {str(e)}")
    
    return MessageResponse(**message)

@api_router.get("/messages/{demand_id}", response_model=List[MessageResponse])
async def get_messages(demand_id: str, current_user: dict = Depends(get_current_user)):
    demand = await db.demands.find_one({"id": demand_id})
    if not demand:
        raise HTTPException(status_code=404, detail="Demand not found")
    
    messages = await db.messages.find({"demand_id": demand_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return [MessageResponse(**m) for m in messages]

# ============ REVIEWS ROUTES ============

@api_router.post("/reviews", response_model=ReviewResponse)
async def create_review(
    review_data: ReviewCreate,
    current_user: dict = Depends(get_current_user)
):
    demand = await db.demands.find_one({"id": review_data.demand_id})
    if not demand:
        raise HTTPException(status_code=404, detail="Demand not found")
    
    if demand["status"] != "completed":
        raise HTTPException(status_code=400, detail="Can only review completed demands")
    
    # Determine who is being reviewed
    if current_user["id"] == demand["customer_id"]:
        reviewed_user_id = demand["assigned_supplier_id"]
    elif current_user["id"] == demand["assigned_supplier_id"]:
        reviewed_user_id = demand["customer_id"]
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if already reviewed
    existing = await db.reviews.find_one({
        "demand_id": review_data.demand_id,
        "reviewer_id": current_user["id"]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already reviewed")
    
    review_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    review = {
        "id": review_id,
        "demand_id": review_data.demand_id,
        "reviewer_id": current_user["id"],
        "reviewer_name": current_user.get("company_name") or current_user["email"],
        "reviewed_user_id": reviewed_user_id,
        "rating": review_data.rating,
        "comment": review_data.comment,
        "images": review_data.images,
        "created_at": now.isoformat()
    }
    
    await db.reviews.insert_one(review)
    
    # Update user rating
    reviews = await db.reviews.find({"reviewed_user_id": reviewed_user_id}, {"_id": 0}).to_list(1000)
    if reviews:
        avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
        await db.users.update_one(
            {"id": reviewed_user_id},
            {"$set": {"rating": round(avg_rating, 1), "reviews_count": len(reviews)}}
        )
    
    return ReviewResponse(**review)

@api_router.get("/reviews/user/{user_id}", response_model=List[ReviewResponse])
async def get_user_reviews(user_id: str):
    reviews = await db.reviews.find({"reviewed_user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [ReviewResponse(**r) for r in reviews]

# ============ ADMIN ROUTES ============

@api_router.get("/admin/stats")
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    total_users = await db.users.count_documents({})
    customers = await db.users.count_documents({"role": UserRole.CUSTOMER})
    suppliers = await db.users.count_documents({"role": UserRole.SUPPLIER})
    total_demands = await db.demands.count_documents({})
    open_demands = await db.demands.count_documents({"status": "open"})
    completed_demands = await db.demands.count_documents({"status": "completed"})
    
    return {
        "total_users": total_users,
        "customers": customers,
        "suppliers": suppliers,
        "total_demands": total_demands,
        "open_demands": open_demands,
        "completed_demands": completed_demands
    }

@api_router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [user_to_response(u) for u in users]

@api_router.get("/admin/demands", response_model=List[DemandResponse])
async def get_all_demands(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    demands = await db.demands.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [DemandResponse(**d) for d in demands]

# ============ SUBSCRIPTION PLANS ============

SUBSCRIPTION_PLANS = {
    "zakaznik": {
        "name": "Zákazník",
        "price": 99.0,  # CZK
        "description": "Neomezený počet zadání, výběr z ověřených dodavatelů",
        "role": "customer",
        "trial_days": 14
    },
    "dodavatel": {
        "name": "Dodavatel",
        "price": 399.0,  # CZK
        "description": "Neomezený přístup k zakázkám, ověřený profil",
        "role": "supplier",
        "trial_days": 14
    }
}

# ============ STRIPE MODELS ============

class CreateCheckoutRequest(BaseModel):
    plan_id: str
    origin_url: str

class CancelSubscriptionRequest(BaseModel):
    pass

# ============ STRIPE ROUTES ============

@api_router.get("/subscription/plans")
async def get_subscription_plans():
    """Get all available subscription plans"""
    return {"plans": SUBSCRIPTION_PLANS}

@api_router.post("/subscription/checkout")
async def create_subscription_checkout(
    request: Request,
    data: CreateCheckoutRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create Stripe Checkout session for recurring subscription"""
    if data.plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Neplatný tarif")
    
    plan = SUBSCRIPTION_PLANS[data.plan_id]
    
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe není nakonfigurován")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    # Build URLs
    success_url = f"{data.origin_url}/platba/uspech?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/platba/zruseno"
    
    try:
        # Create checkout session with emergentintegrations
        checkout_request = CheckoutSessionRequest(
            amount=plan["price"],
            currency="czk",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": current_user["id"],
                "user_email": current_user["email"],
                "plan_id": data.plan_id,
                "plan_name": plan["name"],
                "subscription_type": "monthly_recurring",
                "trial_days": str(plan["trial_days"])
            }
        )
        
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create transaction record
        transaction = {
            "id": str(uuid.uuid4()),
            "session_id": session.session_id,
            "user_id": current_user["id"],
            "user_email": current_user["email"],
            "plan_id": data.plan_id,
            "plan_name": plan["name"],
            "amount": plan["price"],
            "currency": "CZK",
            "payment_status": "pending",
            "subscription_type": "monthly_recurring",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.insert_one(transaction)
        
        logger.info(f"Subscription checkout created for {current_user['email']}, plan: {data.plan_id}")
        
        return {
            "url": session.url,
            "session_id": session.session_id
        }
        
    except Exception as e:
        logger.error(f"Stripe checkout error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chyba při vytváření platby: {str(e)}")

@api_router.get("/subscription/status/{session_id}")
async def get_subscription_status(
    request: Request,
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Check payment/subscription status"""
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe není nakonfigurován")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    try:
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Find transaction
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        if not transaction:
            raise HTTPException(status_code=404, detail="Transakce nenalezena")
        
        # Update transaction
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "payment_status": status.payment_status,
                "status": status.status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # If payment successful, activate subscription
        if status.payment_status == "paid" and transaction.get("payment_status") != "paid":
            # Calculate next billing date (1 month from now)
            next_billing = datetime.now(timezone.utc) + timedelta(days=30)
            
            await db.users.update_one(
                {"id": transaction["user_id"]},
                {"$set": {
                    "subscription_active": True,
                    "subscription_plan": transaction["plan_id"],
                    "subscription_status": "active",
                    "subscription_current_period_end": next_billing.isoformat(),
                    "subscription_started_at": datetime.now(timezone.utc).isoformat(),
                    "trial_ends_at": None
                }}
            )
            
            # Send payment success notification
            try:
                await notification_service.notify_payment_success(
                    user_email=transaction["user_email"],
                    plan_name=transaction["plan_name"],
                    amount=transaction["amount"]
                )
            except Exception as e:
                logger.error(f"Failed to send payment notification: {str(e)}")
            
            logger.info(f"Subscription activated for {transaction['user_email']}, plan: {transaction['plan_id']}")
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount": status.amount_total / 100 if status.amount_total else transaction["amount"],
            "currency": "CZK",
            "plan_id": transaction.get("plan_id"),
            "plan_name": transaction.get("plan_name")
        }
        
    except Exception as e:
        logger.error(f"Stripe status error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chyba při ověřování platby: {str(e)}")

@api_router.post("/subscription/cancel")
async def cancel_subscription(current_user: dict = Depends(get_current_user)):
    """Cancel user's subscription (at end of billing period)"""
    user = await db.users.find_one({"id": current_user["id"]})
    
    if not user.get("subscription_active"):
        raise HTTPException(status_code=400, detail="Nemáte aktivní předplatné")
    
    # Mark subscription as canceling
    cancel_at = user.get("subscription_current_period_end")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "subscription_status": "canceling",
            "subscription_cancel_at": cancel_at
        }}
    )
    
    logger.info(f"Subscription cancellation requested for {current_user['email']}")
    
    return {
        "message": "Předplatné bude zrušeno na konci aktuálního období",
        "cancel_at": cancel_at
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events for subscriptions"""
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        return {"status": "error", "message": "Stripe not configured"}
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature", "")
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        logger.info(f"Stripe webhook received: {webhook_response.event_type}")
        
        # Handle checkout.session.completed event
        if webhook_response.event_type == "checkout.session.completed":
            session_id = webhook_response.session_id
            
            transaction = await db.payment_transactions.find_one({"session_id": session_id})
            if transaction and transaction.get("payment_status") != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {
                        "payment_status": "paid",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # Activate subscription
                next_billing = datetime.now(timezone.utc) + timedelta(days=30)
                await db.users.update_one(
                    {"id": transaction["user_id"]},
                    {"$set": {
                        "subscription_active": True,
                        "subscription_plan": transaction["plan_id"],
                        "subscription_status": "active",
                        "subscription_current_period_end": next_billing.isoformat(),
                        "subscription_started_at": datetime.now(timezone.utc).isoformat(),
                        "trial_ends_at": None
                    }}
                )
                logger.info(f"Subscription activated via webhook: {transaction['user_email']}")
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Stripe webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}

@api_router.get("/subscription/my")
async def get_my_subscription(current_user: dict = Depends(get_current_user)):
    """Get current user's subscription status"""
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    
    # Check if trial is still active
    trial_active = False
    if user.get("trial_ends_at"):
        trial_end = datetime.fromisoformat(user["trial_ends_at"].replace('Z', '+00:00'))
        trial_active = trial_end > datetime.now(timezone.utc)
    
    # Check if subscription is active
    subscription_active = user.get("subscription_active", False)
    if user.get("subscription_ends_at"):
        sub_end = datetime.fromisoformat(user["subscription_ends_at"].replace('Z', '+00:00'))
        if sub_end < datetime.now(timezone.utc):
            subscription_active = False
    
    return {
        "subscription_active": subscription_active,
        "subscription_plan": user.get("subscription_plan"),
        "subscription_ends_at": user.get("subscription_ends_at"),
        "trial_active": trial_active,
        "trial_ends_at": user.get("trial_ends_at")
    }

# ============ SUPPLIERS PUBLIC ROUTES ============

@api_router.get("/suppliers", response_model=List[UserResponse])
async def get_suppliers(category: Optional[str] = None):
    query = {"role": UserRole.SUPPLIER, "is_verified": True}
    if category:
        query["categories"] = category
    
    suppliers = await db.users.find(query, {"_id": 0, "password": 0}).sort("rating", -1).to_list(100)
    return [user_to_response(s) for s in suppliers]

# ============ ROOT ROUTE ============

@api_router.get("/")
async def root():
    return {"message": "CraftBolt API v1.0", "status": "running"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include router
app.include_router(api_router)

# Serve uploaded files
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("role")
    await db.demands.create_index("customer_id")
    await db.demands.create_index("assigned_supplier_id")
    await db.demands.create_index("status")
    await db.demands.create_index("category")
    await db.messages.create_index("demand_id")
    await db.reviews.create_index("reviewed_user_id")
    await db.payment_transactions.create_index("session_id", unique=True)
    await db.payment_transactions.create_index("user_id")
    
    # Create admin user if not exists
    admin = await db.users.find_one({"email": "admin@craftbolt.cz"})
    if not admin:
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": "admin@craftbolt.cz",
            "password": hash_password("CraftBolt2026!"),
            "phone": "+420000000000",
            "role": UserRole.ADMIN,
            "supplier_type": None,
            "company_name": "CraftBolt Admin",
            "ico": None,
            "address": None,
            "categories": [],
            "is_verified": True,
            "trial_ends_at": None,
            "subscription_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "rating": 0.0,
            "reviews_count": 0,
            "location": None
        }
        await db.users.insert_one(admin_user)
        logger.info("Admin user created: admin@craftbolt.cz")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
