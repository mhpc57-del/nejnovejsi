from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict


class UserRole:
    CUSTOMER = "customer"
    SUPPLIER = "supplier"
    CUSTOMER_SUPPLIER = "customer_supplier"
    ADMIN = "admin"

ADMIN_EMAIL = "m.schwarzer@email.cz"

class SupplierType:
    OSVC = "osvc"
    NEPODNIKATEL = "nepodnikatel"
    COMPANY = "company"


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    phone: str
    role: str
    account_type: Optional[str] = None
    supplier_type: Optional[str] = None
    company_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
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
    service_areas: Optional[List[dict]] = []
    preferred_languages: Optional[List[str]] = []
    branch_addresses: Optional[List[str]] = []


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
    first_name: Optional[str] = None
    last_name: Optional[str] = None
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
    rating_percentage: float = 0.0
    certifications: List[dict] = []
    trust_score: int = 0
    punctuality_score: Optional[float] = None
    avg_arrival_minutes: Optional[float] = None
    preferred_languages: List[str] = []
    branch_addresses: List[str] = []


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
    payment_method: str = "cash"
    deadline: Optional[str] = None


class DemandUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    images: Optional[List[str]] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    deadline: Optional[str] = None


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
    status: str
    customer_id: str
    customer_name: Optional[str] = None
    assigned_supplier_id: Optional[str] = None
    assigned_supplier_name: Optional[str] = None
    created_at: str
    accepted_at: Optional[str] = None
    completed_at: Optional[str] = None
    supplier_arrived: bool = False
    supplier_arrived_at: Optional[str] = None
    invoiced_amount: Optional[float] = None
    progress_photos: List[str] = []
    cancellation_reason: Optional[str] = None
    deadline: Optional[str] = None
    soft_accepts: List[dict] = []
    cancellations: List[dict] = []


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
    rating: int  # 1-5 stars
    comment: str
    images: List[str] = []
    rating_percentage: Optional[int] = None  # 0-100%


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
    rating_percentage: Optional[int] = None
    created_at: str


class LocationUpdate(BaseModel):
    latitude: float
    longitude: float


class ProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    branch_address: Optional[str] = None
    permanent_address: Optional[str] = None
    actual_address: Optional[str] = None
    date_of_birth: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[str] = None
    profile_image: Optional[str] = None
    categories: Optional[List[str]] = None
    reference_photos: Optional[List[str]] = None
    service_areas: Optional[List[dict]] = None


class CertificationUpload(BaseModel):
    name: str
    description: Optional[str] = None
    file_url: str


class TrustScoreUpdate(BaseModel):
    user_id: str
    trust_score: int  # 1-5 stars


class CreateCheckoutRequest(BaseModel):
    plan_id: str
    origin_url: str


class CategorySuggestion(BaseModel):
    name: str


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

SUBSCRIPTION_PLANS = {
    "zakaznik": {
        "name": "Zákazník",
        "price": 199.0,
        "description": "Neomezený počet zadání, výběr z ověřených dodavatelů",
        "role": "customer",
        "trial_days": 14
    },
    "dodavatel": {
        "name": "Dodavatel",
        "price": 299.0,
        "description": "Neomezený přístup k zakázkám, ověřený profil",
        "role": "supplier",
        "trial_days": 14
    },
    "zakaznik_dodavatel": {
        "name": "Zákazník i Dodavatel",
        "price": 399.0,
        "description": "Kompletní přístup — zadávání i přijímání zakázek",
        "role": "customer_supplier",
        "trial_days": 14
    }
}
