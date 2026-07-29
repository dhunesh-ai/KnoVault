import json
import re
import asyncio
import logging
import traceback
from typing import List, Dict, Any
from groq import Groq
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from config import get_settings
from models.note import Note
from models.goal import Goal
from models.reminder import Reminder
from models.important_day import ImportantDay

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("KnoVaultAI")

settings = get_settings()

# Startup verification
print(f"[AI SERVICE] GROQ_API_KEY loaded: {bool(settings.GROQ_API_KEY)} (len={len(settings.GROQ_API_KEY)})")
print(f"[AI SERVICE] GROQ_MODEL: {settings.GROQ_MODEL}")


class AIService:
    def __init__(self):
        self.client = None
        self.model = settings.GROQ_MODEL
        
        try:
            self.client = Groq(api_key=settings.GROQ_API_KEY)
            logger.info(f"[GROQ CONNECTED] Model: {self.model}")
        except Exception as e:
            logger.error(f"[GROQ FAILED] Initialization error: {e}")
            traceback.print_exc()

        self.system_prompt = (
            "You are KnoVault AI Assistant – Your Personal Knowledge Management Assistant.\n\n"
            "Your purpose is ONLY to help users manage, organize, search, summarize, and interact with information stored inside KnoVault.\n"
            "You are NOT a general-purpose AI assistant like ChatGPT.\n\n"
            "STRICT DATABASE GROUNDING & ZERO HALLUCINATION RULES:\n"
            "1. Answer ONLY using the facts present in the provided USER CONTEXT JSON block.\n"
            "2. NEVER invent, rename, or modify event categories. Use the EXACT category/type stored in the database context:\n"
            "   - If category is 'Birthday', report 'Birthday'.\n"
            "   - If category is 'Festival', report 'Festival'.\n"
            "   - If category is 'Meeting', report 'Meeting'.\n"
            "   - If category is 'Wedding Anniversary', report 'Wedding Anniversary'.\n"
            "   - NEVER convert a Birthday to an Anniversary or 'RAX anniversary'.\n"
            "3. NEVER state 'You don't have any special days marked' if records exist in the `special_days` list.\n"
            "4. If a user asks about an item not found in the context, respond: 'I couldn't find that information in your KnoVault.'\n\n"
            "RESPONSIBILITIES:\n"
            "You can ONLY assist with KnoVault features, including:\n"
            "• Notes & Secure Notes (never reveal content of secure notes unless explicitly authorized by the application)\n"
            "• AI Note Summarization, Explanation, & Organization\n"
            "• Voice Notes & Documents\n"
            "• Projects & Workspaces\n"
            "• Goals & Tasks\n"
            "• Reminders & Medicine Reminders\n"
            "• Calendar Events & Birthdays\n"
            "• Notifications & Personal Productivity\n"
            "• Searching user information stored inside KnoVault\n\n"
            "STRICT RESTRICTIONS:\n"
            "You MUST NOT answer:\n"
            "• General Knowledge, Politics, Current Affairs, Sports, Movies, Entertainment, Coding tutorials, Mathematics, Science questions unrelated to KnoVault, History, Geography, Medical advice, Legal advice, Religious discussions, or any topic unrelated to KnoVault.\n\n"
            "OUT OF SCOPE RESPONSE:\n"
            "If a user asks anything outside your scope, NEVER attempt to answer it. Reply politely with EXACTLY:\n"
            "\"I'm KnoVault AI Assistant. I can only help you with your personal information and productivity inside KnoVault.\n\n"
            "I can assist you with:\n"
            "• Notes\n"
            "• Summaries\n"
            "• Reminders\n"
            "• Goals\n"
            "• Tasks\n"
            "• Calendar\n"
            "• Projects\n"
            "• Workspaces\n"
            "• Documents\n"
            "• Voice Notes\n"
            "• Medicine Reminders\n"
            "• Birthdays\n\n"
            "Please ask a KnoVault-related question.\"\n\n"
            "RESPONSE STYLE:\n"
            "- Professional, friendly, short, clear, helpful.\n"
            "- Keep responses compact (MOBILE phone optimized).\n"
            "- Use bullet points whenever appropriate.\n"
            "- Avoid long explanations unless explicitly requested."
        )

        # Patterns that indicate simple intro/conversational questions
        self._intro_patterns = [
            r'\bwho are you\b',
            r'\btell me about yourself\b',
            r'\bsay about yourself\b',
            r'\bintroduce yourself\b',
            r'\bwhat can you do\b',
            r'\bwhat do you do\b',
            r'\bwhat are you\b',
            r'\byour capabilities\b',
            r'\bwhat.s your (name|purpose)\b',
            r'^hi$', r'^hello$', r'^hey$',
            r'^good (morning|afternoon|evening)$',
            r'^how are you',
            r'^thanks?$', r'^thank you$',
        ]

    def _call_groq(self, messages: list, temperature: float = 0.7, max_tokens: int = 1024) -> str:
        """
        Synchronous Groq API call - meant to be run via asyncio.to_thread
        """
        logger.info("[GROQ CALL] Sending request...")
        api_model = self.model
        if api_model == "gpt-oss-20b":
            api_model = "openai/gpt-oss-20b"
            
        completion = self.client.chat.completions.create(
            messages=messages,
            model=api_model,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        result = completion.choices[0].message.content
        logger.info(f"[GROQ CALL] Response received ({len(result)} chars)")
        return result

    async def get_user_context(self, db: AsyncSession, user_id: int, user_message: str = "") -> str:
        """
        Fetches a complete, structured JSON context of the user's non-secure data.
        Performs entity and intent search to highlight relevant records.
        """
        logger.info(f"[AI CONTEXT ENGINE] Generating structured context for user {user_id}")
        context_data: Dict[str, Any] = {
            "special_days": [],
            "notes": [],
            "goals": [],
            "reminders": [],
            "matched_entities": []
        }

        user_query_lower = (user_message or "").strip().lower()

        try:
            # 1. Fetch ALL Special Days / Important Days
            important_days_query = await db.execute(
                select(ImportantDay)
                .where(and_(ImportantDay.user_id == user_id, ImportantDay.is_deleted == False))
                .order_by(ImportantDay.date.asc())
            )
            important_days = important_days_query.scalars().all()
            for day in important_days:
                turning_val = None
                if day.notes:
                    match = re.search(r'turning\s*(\d+)', day.notes, re.IGNORECASE)
                    if match:
                        turning_val = int(match.group(1))

                day_dict = {
                    "id": day.id,
                    "title": day.title,
                    "category": day.type or "Special Day",
                    "custom_type": day.custom_type,
                    "date": str(day.date) if day.date else None,
                    "notes": day.notes,
                    "turning": turning_val,
                    "contact_relationship": day.contact_relationship,
                    "recipient_email": day.recipient_email,
                    "email_enabled": day.email_enabled,
                }
                context_data["special_days"].append(day_dict)

                # Entity matching check & semantic intent routing
                if user_query_lower:
                    search_terms = [t for t in re.split(r'\W+', user_query_lower) if len(t) >= 2]
                    is_special_day_intent = any(kw in user_query_lower for kw in [
                        "special day", "special days", "birthday", "birthdays", "anniversary", 
                        "anniversaries", "festival", "festivals", "event", "events", "celebration", 
                        "celebrations", "meeting", "meetings", "raax", "rakshith", "details"
                    ])
                    day_text = f"{day.title} {day.type} {day.custom_type or ''} {day.notes or ''} {day.contact_relationship or ''}".lower()
                    if is_special_day_intent or any(term in day_text for term in search_terms):
                        context_data["matched_entities"].append(day_dict)
        except Exception as e:
            logger.error(f"[AI CONTEXT] Important Days fetch error: {e}")

        # If matched_entities is empty but special_days exist, fallback to copying all special_days into matched_entities
        if not context_data["matched_entities"] and context_data["special_days"]:
            context_data["matched_entities"] = context_data["special_days"]

        try:
            # 2. Fetch Non-Secure Notes
            notes_query = await db.execute(
                select(Note).where(
                    and_(
                        Note.user_id == user_id,
                        Note.category != "Secure",
                        Note.is_secure == False
                    )
                ).order_by(Note.updated_at.desc()).limit(20)
            )
            notes = notes_query.scalars().all()
            for n in notes:
                context_data["notes"].append({
                    "id": n.id,
                    "title": n.title,
                    "category": n.category,
                    "content_preview": (n.content or "")[:250]
                })
        except Exception as e:
            logger.error(f"[AI CONTEXT] Notes fetch error: {e}")

        try:
            # 3. Fetch Goals
            goals_query = await db.execute(
                select(Goal).where(and_(Goal.user_id == user_id, Goal.completed == False)).limit(15)
            )
            goals = goals_query.scalars().all()
            for g in goals:
                context_data["goals"].append({
                    "id": g.id,
                    "title": g.title,
                    "status": "pending"
                })
        except Exception as e:
            logger.error(f"[AI CONTEXT] Goals fetch error: {e}")

        try:
            # 4. Fetch Reminders
            reminders_query = await db.execute(
                select(Reminder).where(and_(Reminder.user_id == user_id, Reminder.is_deleted == False)).limit(15)
            )
            reminders = reminders_query.scalars().all()
            for r in reminders:
                context_data["reminders"].append({
                    "id": r.id,
                    "title": r.title,
                    "reminder_date": str(r.reminder_date) if r.reminder_date else None,
                    "is_completed": r.is_completed
                })
        except Exception as e:
            logger.error(f"[AI CONTEXT] Reminders fetch error: {e}")

        full_context = json.dumps(context_data, indent=2)
        logger.info(f"[AI CONTEXT SUCCESS] UserID={user_id} | ContextSize={len(full_context)} chars | SpecialDaysCount={len(context_data['special_days'])} | MatchedEntities={len(context_data['matched_entities'])}")
        return full_context

    def _is_intro_question(self, message: str) -> bool:
        """Detect simple conversational / introduction questions."""
        cleaned = message.strip().lower().rstrip('?!.')
        for pattern in self._intro_patterns:
            if re.search(pattern, cleaned):
                logger.info(f"[INTRO PROMPT DETECTED] Pattern matched for: '{message[:40]}'")
                return True
        return False

    def _classify_response_length(self, message: str) -> tuple:
        """
        Returns (max_tokens, temperature, extra_instruction) based on message complexity.
        Simple → short, Moderate → medium, Complex → full.
        """
        lower = message.lower().strip()

        # Intro / greeting → very concise
        if self._is_intro_question(message):
            logger.info("[CONCISE MODE ENABLED] Intro/greeting question")
            return 200, 0.6, (
                "IMPORTANT: The user asked a simple conversational question. "
                "Reply in 2-3 short sentences maximum. Be warm and concise. "
                "Do NOT use bullet points, headings, or lists. Just a brief friendly answer."
            )

        # Requests for summaries, lists, or details
        if any(kw in lower for kw in ['special days', 'birthday', 'detail', 'summarize', 'list all', 'event', 'celebration']):
            return 1536, 0.5, None

        # Default: moderate length
        return 1024, 0.6, None

    async def chat_with_ai(self, message: str, context: str, history: List[Dict[str, str]] = None, custom_system_prompt: str = None) -> str:
        """
        General AI Chat with Context - runs Groq in a thread to not block the event loop.
        Automatically adjusts response length based on question complexity.
        """
        if not self.client:
            logger.error("[AI REQUEST FAILED] Groq client not initialized")
            return "AI is temporarily unavailable."

        # Security check for keywords in message
        lower_msg = message.lower()
        if "secure note" in lower_msg or "private note" in lower_msg:
            return "Secure notes are protected and cannot be accessed by AI for your privacy."

        # Classify response length
        max_tokens, temperature, extra_instruction = self._classify_response_length(message)

        active_system_prompt = custom_system_prompt if custom_system_prompt else self.system_prompt

        # AUDIT LOGGING
        try:
            ctx_data = json.loads(context) if context.startswith("{") else {}
            spec_days = ctx_data.get("special_days", [])
            titles = [d.get("title") for d in spec_days]
            categories = [d.get("category") for d in spec_days]
            dates = [d.get("date") for d in spec_days]
            logger.info(f"[AI AUDIT PRE-FLIGHT] SpecialDaysCount={len(spec_days)} | Titles={titles} | Categories={categories} | Dates={dates}")
        except Exception:
            logger.info(f"[AI AUDIT PRE-FLIGHT] Raw context size={len(context)} chars")

        messages = [
            {"role": "system", "content": active_system_prompt}
        ]

        if history:
            messages.extend(history)

        # Inject Ground-Truth Context AFTER history to prevent history contamination
        ground_truth_block = (
            "==================================================\n"
            "GROUND-TRUTH DATABASE CONTEXT (PRIMARY SINGLE SOURCE OF TRUTH):\n"
            f"{context}\n"
            "==================================================\n"
            "MANDATORY INSTRUCTION: You MUST answer the user's query using ONLY the ground-truth database JSON above. "
            "If previous conversation history contradicts this database context or claims items do not exist, "
            "you MUST OVERRIDE history and state the exact items found in the database context."
        )

        messages.append({"role": "system", "content": ground_truth_block})

        # Inject concise-mode instruction if needed
        if extra_instruction and not custom_system_prompt:
            messages.append({"role": "system", "content": extra_instruction})

        messages.append({"role": "user", "content": message})

        logger.info(f"[AI REQUEST START] Query: '{message}' | max_tokens={max_tokens}")
        try:
            result = await asyncio.to_thread(self._call_groq, messages, temperature, max_tokens)
            logger.info(f"[AI RESPONSE SUCCESS] [AI RESPONSE LENGTH] {len(result)} chars")
            return result
        except Exception as e:
            logger.error(f"[AI RESPONSE ERROR] {e}")
            traceback.print_exc()
            if "invalid_api_key" in str(e).lower() or "401" in str(e):
                return "Authentication failed: The Groq API Key is invalid. Please update your .env file."
            return "AI is temporarily unavailable. Please try again later."

    async def summarize_note(self, text: str, category: str = "General") -> str:
        """
        Summarize a specific note (Internal check for security)
        """
        if category == "Secure":
            return "Secure notes are protected and cannot be summarized by AI."

        if not self.client:
            return "AI is temporarily unavailable."

        prompt = f"Summarize the following note content concisely. Identify key points and potential todos.\n\nContent:\n{text}"
        
        try:
            messages = [
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt}
            ]
            result = await asyncio.to_thread(self._call_groq, messages, 0.5, 500)
            return result
        except Exception as e:
            logger.error(f"[AI SUMMARIZE ERROR] {e}")
            traceback.print_exc()
            return "Unable to generate summary at this time."

    async def suggest_tasks(self, context: str) -> list:
        """
        Extract tasks from context
        """
        if not self.client:
            return []

        prompt = (
            "Based on the user's recent notes and context, suggest 5 high-impact short tasks. "
            "Return them as a JSON list of raw strings: [\"Task 1\", \"Task 2\"]"
            f"\n\nContext: {context}"
        )
        
        try:
            messages = [
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt}
            ]
            content = await asyncio.to_thread(self._call_groq, messages, 0.6, 500)
            # Cleanup for potential markdown
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            
            return json.loads(content)
        except Exception as e:
            logger.error(f"[AI TASK ERROR] {e}")
            traceback.print_exc()
            return []


ai_service = AIService()
