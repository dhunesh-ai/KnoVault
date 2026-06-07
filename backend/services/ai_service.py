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
            "You are KnoVault AI — a premium, intelligent productivity assistant.\n\n"
            "CRITICAL FORMATTING RULES (ALWAYS FOLLOW):\n"
            "- You are displayed on a MOBILE phone screen. Keep responses compact.\n"
            "- For simple/conversational questions: reply in 2-4 short sentences. No lists.\n"
            "- For productivity questions: use short bullet points (max 5-6 items).\n"
            "- For detailed analysis: use brief paragraphs with minimal headings.\n"
            "- NEVER write long essays, giant bullet lists, or multi-paragraph introductions.\n"
            "- NEVER use nested bullets or excessive markdown formatting.\n"
            "- Avoid repeating information the user already knows.\n"
            "- Be warm, direct, and helpful — like a smart personal assistant.\n\n"
            "SECURITY:\n"
            "- You CANNOT access notes categorized as 'Secure' or marked is_secure.\n"
            "- If asked about secure notes, say: 'Secure notes are protected and cannot be accessed by AI for your privacy.'\n\n"
            "CAPABILITIES: Summarize notes, suggest goals/reminders, analyze workload, "
            "recommend priorities, track goal progress, remember special days and celebrations, and provide smart scheduling advice."
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
        completion = self.client.chat.completions.create(
            messages=messages,
            model=self.model,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        result = completion.choices[0].message.content
        logger.info(f"[GROQ CALL] Response received ({len(result)} chars)")
        return result

    async def get_user_context(self, db: AsyncSession, user_id: int) -> str:
        """
        Fetches a condensed context of the user's non-secure data.
        """
        logger.info(f"[AI CONTEXT ENGINE] Generating context for user {user_id}")
        context_parts = []

        try:
            # 1. Fetch Non-Secure Notes
            notes_query = await db.execute(
                select(Note).where(
                    and_(
                        Note.user_id == user_id,
                        Note.category != "Secure",
                        Note.is_secure == False
                    )
                ).order_by(Note.updated_at.desc()).limit(15)
            )
            notes = notes_query.scalars().all()
            if notes:
                context_parts.append("RECENT NOTES:")
                for n in notes:
                    content_preview = (n.content or "")[:200]
                    context_parts.append(f"- [{n.category}] {n.title}: {content_preview}")
        except Exception as e:
            logger.error(f"[AI CONTEXT] Notes fetch error: {e}")

        try:
            # 2. Fetch Active Goals
            goals_query = await db.execute(
                select(Goal).where(
                    and_(Goal.user_id == user_id, Goal.completed == False)
                ).limit(10)
            )
            goals = goals_query.scalars().all()
            if goals:
                context_parts.append("\nACTIVE GOALS:")
                for g in goals:
                    context_parts.append(f"- {g.title} (Pending)")
        except Exception as e:
            logger.error(f"[AI CONTEXT] Goals fetch error: {e}")

        try:
            # 3. Fetch Upcoming Reminders
            reminders_query = await db.execute(
                select(Reminder).where(Reminder.user_id == user_id).limit(10)
            )
            reminders = reminders_query.scalars().all()
            if reminders:
                context_parts.append("\nUPCOMING REMINDERS:")
                for r in reminders:
                    context_parts.append(f"- {r.title} at {r.reminder_date}")
        except Exception as e:
            logger.error(f"[AI CONTEXT] Reminders fetch error: {e}")

        try:
            # 4. Fetch Important Days
            important_days_query = await db.execute(
                select(ImportantDay).where(ImportantDay.user_id == user_id).limit(10)
            )
            important_days = important_days_query.scalars().all()
            if important_days:
                context_parts.append("\nUPCOMING IMPORTANT DAYS:")
                for b in important_days:
                    context_parts.append(f"- [{b.type}] {b.title} on {b.date}")
        except Exception as e:
            logger.error(f"[AI CONTEXT] Important Days fetch error: {e}")

        full_context = "\n".join(context_parts) if context_parts else "No user data available yet."
        logger.info(f"[AI CONTEXT SUCCESS] Context size: {len(full_context)} chars")
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

        # Simple short questions
        if len(lower.split()) <= 6 and '?' not in lower:
            return 400, 0.7, None

        # Requests for summaries or analysis
        if any(kw in lower for kw in ['summarize', 'analyze', 'list all', 'detail', 'explain in detail']):
            return 1024, 0.7, None

        # Default: moderate length
        return 600, 0.7, None

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

        messages = [
            {"role": "system", "content": active_system_prompt},
            {"role": "system", "content": f"USER CONTEXT (NON-SECURE DATA):\n{context}"}
        ]

        # Inject concise-mode instruction if needed
        if extra_instruction and not custom_system_prompt:
            messages.append({"role": "system", "content": extra_instruction})

        if history:
            messages.extend(history)

        messages.append({"role": "user", "content": message})

        logger.info(f"[AI REQUEST START] Message: '{message[:50]}...' | max_tokens={max_tokens}")
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
            return []


ai_service = AIService()
