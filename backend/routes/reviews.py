from fastapi import APIRouter, HTTPException, Depends
from database import db
from auth import get_current_user
from models import ReviewCreate, ReviewResponse
from typing import List
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/reviews", response_model=ReviewResponse)
async def create_review(review_data: ReviewCreate, current_user: dict = Depends(get_current_user)):
    demand = await db.demands.find_one({"id": review_data.demand_id})
    if not demand:
        raise HTTPException(status_code=404, detail="Demand not found")
    
    if demand["status"] != "completed":
        raise HTTPException(status_code=400, detail="Can only review completed demands")
    
    if current_user["id"] == demand["customer_id"]:
        reviewed_user_id = demand["assigned_supplier_id"]
    elif current_user["id"] == demand["assigned_supplier_id"]:
        reviewed_user_id = demand["customer_id"]
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    
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
        "rating_percentage": review_data.rating_percentage,
        "created_at": now.isoformat()
    }
    
    await db.reviews.insert_one(review)
    
    # Update user rating (both star and percentage) with punctuality influence
    reviews = await db.reviews.find({"reviewed_user_id": reviewed_user_id}, {"_id": 0, "rating": 1, "rating_percentage": 1}).to_list(500)
    if reviews:
        avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
        # Calculate percentage rating (0-100%)
        pct_reviews = [r for r in reviews if r.get("rating_percentage") is not None]
        avg_pct = sum(r["rating_percentage"] for r in pct_reviews) / len(pct_reviews) if pct_reviews else (avg_rating / 5.0) * 100
        
        # Blend punctuality score into overall rating for suppliers (80% reviews + 20% punctuality)
        reviewed_user = await db.users.find_one({"id": reviewed_user_id}, {"_id": 0, "role": 1, "punctuality_score": 1})
        final_pct = avg_pct
        if reviewed_user and reviewed_user.get("role") == "supplier" and reviewed_user.get("punctuality_score") is not None:
            punctuality = reviewed_user["punctuality_score"]
            final_pct = (avg_pct * 0.8) + (punctuality * 0.2)
        
        await db.users.update_one(
            {"id": reviewed_user_id},
            {"$set": {
                "rating": round(avg_rating, 1),
                "rating_percentage": round(final_pct, 1),
                "review_avg_percentage": round(avg_pct, 1),
                "reviews_count": len(reviews)
            }}
        )
    
    return ReviewResponse(**review)


@router.get("/reviews/user/{user_id}", response_model=List[ReviewResponse])
async def get_user_reviews(user_id: str):
    reviews = await db.reviews.find({"reviewed_user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [ReviewResponse(**r) for r in reviews]
