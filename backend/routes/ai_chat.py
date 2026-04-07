from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from emergentintegrations.llm.chat import LlmChat, UserMessage
from database import db
from datetime import datetime, timezone
import os
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

SYSTEM_MESSAGE = """Jsi CraftBolt AI asistent — přátelský, stručný a profesionální pomocník české řemeslnické platformy CraftBolt.cz.

O platformě CraftBolt:
- CraftBolt.cz je online tržiště spojující zákazníky s ověřenými řemeslníky a dodavateli služeb v České republice.
- Zákazníci zadávají poptávky (co potřebují opravit/vyrobit/nainstalovat), dodavatelé na ně reagují nabídkami.
- K dispozici je online chat mezi zákazníkem a dodavatelem přímo v aplikaci.

Typy účtů a ceník:
- Zákazník (199 Kč/měsíc bez DPH) — zadávání neomezeného počtu poptávek, výběr z ověřených dodavatelů, chat, notifikace
- Dodavatel (299 Kč/měsíc bez DPH) — přístup k zakázkám, ověřený profil, chat, notifikace
- Zákazník i Dodavatel (399 Kč/měsíc bez DPH) — kompletní přístup, zadávání i přijímání zakázek
- Všechny tarify mají 14denní zkušební dobu zdarma.
- Platby probíhají přes zabezpečenou bránu Stripe, předplatné lze kdykoliv zrušit.

Registrace:
- Na stránce /registrace uživatel vyplní email, heslo, vybere roli, zda má IČ nebo ne, a doplní údaje.
- Po registraci je nutné ověřit email kliknutím na odkaz v doručeném emailu.
- Dodavatelé vybírají kategorie služeb, které nabízejí (elektro, instalatérství, zednictví atd.)

Funkce platformy:
- Zadání poptávky s popisem, kategorií, lokací a fotografiemi
- Rychlá poptávka bez registrace (pouze email + telefon + popis)
- Chat mezi zákazníkem a dodavatelem
- Notifikace emailem a SMS
- Mapy s barevnými markery na dashboardu
- Tmavý režim (dark mode)
- Profil s fotografií, certifikáty a hodnocením

Kontakt: info@craftbolt.cz
Provozovatel: AC/DC MONT s.r.o., IČ: 097 44 550, Sportovní 7, 789 63 Ruda nad Moravou

Pravidla:
- Odpovídej VŽDY česky.
- Buď stručný (max 2-3 věty), přátelský a profesionální.
- Pokud nevíš odpověď, nasměruj uživatele na info@craftbolt.cz.
- Neodpovídej na dotazy nesouvisející s CraftBolt (politika, sport, osobní otázky apod.) — zdvořile odkaz na to, že jsi tu jen pro pomoc s CraftBolt.
"""


class ChatRequest(BaseModel):
    message: str
    session_id: str = ""


class ChatResponse(BaseModel):
    reply: str
    session_id: str


@router.post("/ai/chat", response_model=ChatResponse)
async def ai_chat(request: ChatRequest):
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI služba není nakonfigurována")

    session_id = request.session_id or str(uuid.uuid4())
    user_text = request.message.strip()

    if not user_text:
        raise HTTPException(status_code=400, detail="Zpráva je povinná")

    # Load chat history from DB for this session
    history = await db.ai_chat_history.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(50)

    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=SYSTEM_MESSAGE
        )

        # Replay history into LlmChat context
        for msg in history:
            if msg["role"] == "user":
                chat.messages.append({"role": "user", "content": msg["content"]})
            else:
                chat.messages.append({"role": "assistant", "content": msg["content"]})

        user_message = UserMessage(text=user_text)
        reply = await chat.send_message(user_message)

        # Save both messages to DB
        now = datetime.now(timezone.utc).isoformat()
        await db.ai_chat_history.insert_many([
            {"session_id": session_id, "role": "user", "content": user_text, "created_at": now},
            {"session_id": session_id, "role": "assistant", "content": reply, "created_at": now}
        ])

        return ChatResponse(reply=reply, session_id=session_id)

    except Exception as e:
        logger.error(f"AI chat error: {str(e)}")
        raise HTTPException(status_code=500, detail="Omlouváme se, AI asistent je momentálně nedostupný.")


@router.get("/ai/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    history = await db.ai_chat_history.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    return {"messages": history}
