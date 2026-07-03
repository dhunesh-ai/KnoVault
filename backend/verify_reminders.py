import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, delete

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import init_db, async_session
from models.user import User
from models.workspace import Workspace, WorkspaceMember, WorkspaceMeeting, WorkspaceEvent
from models.notification import Notification
from services.notification_scheduler import check_and_send_workspace_reminders

async def test_scheduler():
    import logging
    logging.basicConfig(level=logging.WARNING, stream=sys.stdout)
    logging.getLogger("NotificationScheduler").setLevel(logging.INFO)
    logging.getLogger("NotificationService").setLevel(logging.INFO)
    print("=== STARTING WORKSPACE REMINDER SCHEDULER TEST ===")
    await init_db()
    
    async with async_session() as session:
        try:
            # 1. Get or create test user
            res = await session.execute(select(User).limit(1))
            user = res.scalar_one_or_none()
            if not user:
                user = User(
                    email="reminder_test@knovault.com",
                    full_name="Reminder Test User",
                    hashed_password="mock_password",
                    is_verified=True
                )
                session.add(user)
                await session.flush()
            
            # Set a dummy Expo push token to test Expo Push API pathway
            user.fcm_token = "ExponentPushToken[dummy-token-for-test]"
            session.add(user)
            await session.flush()
            
            # 2. Get or create test workspace
            res_ws = await session.execute(select(Workspace).limit(1))
            ws = res_ws.scalar_one_or_none()
            if not ws:
                ws = Workspace(
                    name="Reminder Testing Workspace",
                    description="Workspace for reminder test",
                    icon="⏰",
                    theme="blue",
                    category="Testing",
                    privacy_level="Private",
                    owner_id=user.id
                )
                session.add(ws)
                await session.flush()
                
                # Add owner member
                m = WorkspaceMember(workspace_id=ws.id, user_id=user.id, role="Owner")
                session.add(m)
                await session.flush()

            # Clean up old reminders to have a clean test
            await session.execute(delete(Notification).where(
                Notification.related_item_id.like("meeting:%:reminder:%") |
                Notification.related_item_id.like("event:%:reminder:%")
            ))
            await session.commit()

            # Force all workspace members to use Expo push tokens so we test Expo routing
            stmt = select(User).join(WorkspaceMember, WorkspaceMember.user_id == User.id).where(WorkspaceMember.workspace_id == ws.id)
            members_res = await session.execute(stmt)
            original_tokens = {}
            for m_user in members_res.scalars().all():
                original_tokens[m_user.id] = m_user.fcm_token
                m_user.fcm_token = f"ExponentPushToken[dummy-token-{m_user.id}]"
                session.add(m_user)
            await session.flush()

            print(f"Using Workspace ID: {ws.id}, User ID: {user.id}")

            # 3. Create a meeting happening in 5 minutes (offset = 5)
            # Make it timezone-aware UTC
            meeting_time = datetime.now(timezone.utc) + timedelta(minutes=5)
            
            meeting = WorkspaceMeeting(
                workspace_id=ws.id,
                organizer_id=user.id,
                title="Weekly Demo Sync",
                date=meeting_time,
                agenda="Discuss DB migration",
                decisions=None,
                action_items=[],
                summary=None
            )
            session.add(meeting)
            await session.flush()
            print(f"Scheduled meeting '{meeting.title}' at {meeting_time} (aware)")

            # 4. Create an event happening now (offset = 0)
            # Make this one timezone-aware UTC to verify it works for aware too!
            event_time = datetime.now(timezone.utc)
            
            event = WorkspaceEvent(
                workspace_id=ws.id,
                user_id=user.id,
                title="Database Migration Deadline",
                description="Run the tables script",
                type="Deadline",
                date=event_time
            )
            session.add(event)
            await session.flush()
            print(f"Scheduled event '{event.title}' at {event_time} (aware)")

            await session.commit()

            # Diagnostic print
            meet_check = await session.execute(select(WorkspaceMeeting))
            all_meetings = meet_check.scalars().all()
            print(f"Diagnostics - Total meetings in DB: {len(all_meetings)}")
            for m in all_meetings:
                title_s = m.title.encode('ascii', 'ignore').decode('ascii')
                print(f" - Meeting ID: {m.id}, Title: {title_s}, Date: {m.date}, Tz: {m.date.tzinfo if m.date else 'None'}")

            # 5. Run the scheduler check
            print("\nRunning check_and_send_workspace_reminders() (First run - creates notifications)...")
            await check_and_send_workspace_reminders()

            print("\nRunning check_and_send_workspace_reminders() (Second run - should skip all duplicates)...")
            await check_and_send_workspace_reminders()

            # 6. Verify notifications were generated in the database
            print("\nVerifying notifications in database...")
            notifs_res = await session.execute(
                select(Notification).where(
                    Notification.workspace_id == ws.id
                ).order_by(Notification.created_at.desc())
            )
            notifs = notifs_res.scalars().all()
            
            print(f"Found {len(notifs)} workspace notifications:")
            meeting_reminder_found = False
            event_started_found = False

            for n in notifs:
                title_safe = n.title.encode('ascii', 'ignore').decode('ascii')
                msg_safe = n.message.encode('ascii', 'ignore').decode('ascii')
                print(f" - [{n.type.upper()}] Title: '{title_safe}', Msg: '{msg_safe}', Related: '{n.related_item_id}'")
                if "meeting" in n.type and "reminder:5" in n.related_item_id:
                    meeting_reminder_found = True
                if "event" in n.type and "reminder:0" in n.related_item_id:
                    event_started_found = True

            # Assertions
            assert meeting_reminder_found, "Meeting 5-minute reminder notification not generated!"
            assert event_started_found, "Event starts now notification not generated!"
            
            print("\n=== SUCCESS: timezone handling and reminder notification generation verified! ===")
            
            # Clean up test meetings and events so they don't clog future runs
            await session.execute(delete(WorkspaceMeeting).where(WorkspaceMeeting.id == meeting.id))
            await session.execute(delete(WorkspaceEvent).where(WorkspaceEvent.id == event.id))
            await session.execute(delete(Notification).where(
                Notification.related_item_id.like(f"meeting:{meeting.id}:%") |
                Notification.related_item_id.like(f"event:{event.id}:%")
            ))
            
            # Restore original tokens
            for m_user_id, orig_token in original_tokens.items():
                u_res = await session.execute(select(User).where(User.id == m_user_id))
                u = u_res.scalar_one_or_none()
                if u:
                    u.fcm_token = orig_token
                    session.add(u)
            await session.commit()
            
            sys.exit(0)

        except Exception as e:
            print(f"\n[TEST FAILED]: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == "__main__":
    asyncio.run(test_scheduler())
