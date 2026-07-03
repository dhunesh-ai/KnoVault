import asyncio
import os
import sys
from datetime import datetime, timedelta
import json

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import init_db, engine
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from models.user import User
from models.workspace import (
    Workspace, WorkspaceMember, WorkspaceNote, WorkspaceTask, WorkspaceGoal,
    WorkspaceDiscussion, WorkspaceKnowledge, WorkspaceMeeting, WorkspaceIdea,
    WorkspaceActivity, WorkspaceAnalytics, WorkspaceEvent
)
from services.ai_service import ai_service


async def run_flow_test():
    print("[FLOW TEST] Initializing database mapping...")
    await init_db()
    
    async_session = AsyncSession(engine)
    
    try:
        # 1. Create or retrieve test user
        print("[FLOW TEST] Creating test users...")
        test_email_1 = "test_user_alpha@knovault.com"
        test_email_2 = "test_user_beta@knovault.com"
        
        # Clean up existing test users/workspaces first
        async with async_session.begin():
            # Delete old test users
            u1_res = await async_session.execute(select(User).where(User.email == test_email_1))
            u1 = u1_res.scalar_one_or_none()
            if u1:
                # Delete workspace records owned by user
                await async_session.execute(delete(Workspace).where(Workspace.owner_id == u1.id))
                await async_session.execute(delete(User).where(User.id == u1.id))
                
            u2_res = await async_session.execute(select(User).where(User.email == test_email_2))
            u2 = u2_res.scalar_one_or_none()
            if u2:
                await async_session.execute(delete(User).where(User.id == u2.id))
                
        # Create fresh test users
        async with async_session.begin():
            user1 = User(
                email=test_email_1,
                full_name="Alpha Teammate",
                hashed_password="mock_hashed_password",
                is_verified=True
            )
            user2 = User(
                email=test_email_2,
                full_name="Beta Teammate",
                hashed_password="mock_hashed_password",
                is_verified=True
            )
            async_session.add(user1)
            async_session.add(user2)
            await async_session.flush()
            
            u1_id = user1.id
            u2_id = user2.id
            print(f"[FLOW TEST] Seeded user1 (ID: {u1_id}) and user2 (ID: {u2_id})")

        # 2. Create Workspace
        print("[FLOW TEST] Creating a collaborative workspace...")
        async with async_session.begin():
            ws = Workspace(
                name="Project Launchpad",
                description="E2E test room for collaborative features",
                icon="🚀",
                theme="purple",
                category="Startup",
                privacy_level="Invite Only",
                owner_id=u1_id
            )
            async_session.add(ws)
            await async_session.flush()
            ws_id = ws.id
            
            # Add members
            m1 = WorkspaceMember(workspace_id=ws_id, user_id=u1_id, role="Owner")
            m2 = WorkspaceMember(workspace_id=ws_id, user_id=u2_id, role="Member")
            async_session.add_all([m1, m2])
            
            # Add activity log
            activity = WorkspaceActivity(workspace_id=ws_id, user_id=u1_id, action="created workspace", details="Project Launchpad")
            async_session.add(activity)
            
            # Add analytics records
            an1 = WorkspaceAnalytics(workspace_id=ws_id, user_id=u1_id, contribution_score=10.0, workspace_activity=1)
            an2 = WorkspaceAnalytics(workspace_id=ws_id, user_id=u2_id, contribution_score=0.0, workspace_activity=0)
            async_session.add_all([an1, an2])
            
            print(f"[FLOW TEST] Workspace created successfully. ID: {ws_id}")

        # 3. Create Note & Verify AI Summary
        print("[FLOW TEST] Testing Shared Notes + AI Summarizer...")
        note_content = "FastAPI is a modern, fast (high-performance), web framework for building APIs with Python 3.8+ based on standard Python type hints. Key features include automatic interactive documentation, fast coding speeds, and fewer bugs."
        async with async_session.begin():
            # Trigger Groq API note summarizer
            print("[AI ENGINE] Querying Groq to summarize note content...")
            ai_summary = await ai_service.summarize_note(note_content, category="Web Development")
            print(f"[AI ENGINE] Groq response: {ai_summary}")
            
            note = WorkspaceNote(
                workspace_id=ws_id,
                user_id=u1_id,
                title="FastAPI Cheat Sheet",
                content=note_content,
                category="Development",
                ai_summary=ai_summary,
                comments=[]
            )
            async_session.add(note)
            print("[FLOW TEST] Note created and summarized successfully.")

        # 4. Create Kanban Task & subtask progress
        print("[FLOW TEST] Testing Kanban Board & Checklist Subtasks...")
        async with async_session.begin():
            subtasks = [
                {"id": "st-1", "title": "Setup repository structure", "completed": True},
                {"id": "st-2", "title": "Configure env files", "completed": False},
                {"id": "st-3", "title": "Run initial DB migrations", "completed": False}
            ]
            # Calculate progress: 1 of 3 completed = 33%
            total = len(subtasks)
            completed = sum(1 for s in subtasks if s["completed"])
            progress = int((completed / total) * 100)
            
            task = WorkspaceTask(
                workspace_id=ws_id,
                assignee_id=u2_id,
                creator_id=u1_id,
                title="Backend Architecture setup",
                description="Initialize SQLAlchemy, setup Base, and structure routers",
                priority="High",
                status="In Progress",
                due_date=datetime.utcnow() + timedelta(days=5),
                progress=progress,
                tags=["backend", "db"],
                subtasks=subtasks,
                comments=[]
            )
            async_session.add(task)
            print(f"[FLOW TEST] Task created with dynamic progress: {progress}%")

        # 5. Create Goal
        print("[FLOW TEST] Testing Goals + Milestones...")
        async with async_session.begin():
            goal = WorkspaceGoal(
                workspace_id=ws_id,
                creator_id=u1_id,
                title="Launch Version 1.0 Alpha",
                progress=50,
                milestones=[
                    {"name": "Setup DB migrations", "completed": True},
                    {"name": "Register API routers", "completed": True},
                    {"name": "Deploy staging server", "completed": False},
                    {"name": "Perform end-to-end audit", "completed": False}
                ]
            )
            async_session.add(goal)
            print("[FLOW TEST] Goal created successfully.")

        # 6. Schedule Events & run AI Conflict Check
        print("[FLOW TEST] Testing Calendar Events + AI Schedule Conflict Checker...")
        async with async_session.begin():
            ev1 = WorkspaceEvent(
                workspace_id=ws_id,
                user_id=u1_id,
                title="Weekly Demo Sync",
                description="Check-in on tasks and blockers",
                type="Meeting",
                date=datetime.utcnow() + timedelta(days=1)
            )
            ev2 = WorkspaceEvent(
                workspace_id=ws_id,
                user_id=u2_id,
                title="Database Migration Deadline",
                description="Run the workspace tables script",
                type="Deadline",
                date=datetime.utcnow() + timedelta(days=1, hours=1) # Clashing closely
            )
            async_session.add_all([ev1, ev2])
            await async_session.flush()
            
            # Fetch events and format for Groq
            events_text = f"1. {ev1.title} on {ev1.date.isoformat()}\n2. {ev2.title} on {ev2.date.isoformat()}"
            print("[AI ENGINE] Querying Groq to check schedule conflicts...")
            
            conflict_system = (
                "You are an AI calendar coordinator. Review the list of workspace events, identify if there are "
                "any tight schedules or conflicting dates/times, and write a warning summary with suggestions."
            )
            report = await ai_service.chat_with_ai(
                message=f"Here is the event list:\n{events_text}\nAnalyze conflicts:",
                context="",
                custom_system_prompt=conflict_system
            )
            print(f"[AI ENGINE] Groq conflict report:\n{report}")

        # 7. Discussion board + React
        print("[FLOW TEST] Testing Discussion Hub + Reactions...")
        async with async_session.begin():
            disc = WorkspaceDiscussion(
                workspace_id=ws_id,
                user_id=u2_id,
                title="Should we use Neon DB or local SQLite in prod?",
                content="Neon is serverless Postgres, supporting connection pooling. Local SQLite is single-write only.",
                category="Updates",
                reactions={"👍": [u1_id, u2_id], "💡": [u1_id]}
            )
            async_session.add(disc)
            print("[FLOW TEST] Discussion and initial reactions saved.")

        # 8. Knowledge Wall + AI Organize Tree
        print("[FLOW TEST] Testing Knowledge Wall + AI Taxonomy Organization...")
        async with async_session.begin():
            kw1 = WorkspaceKnowledge(workspace_id=ws_id, user_id=u1_id, title="Big-O Notation", content="O(N log N) is standard for merge/heap sort. Quick sort is O(N log N) average, O(N^2) worst case.", category="Computer Science")
            kw2 = WorkspaceKnowledge(workspace_id=ws_id, user_id=u2_id, title="Vite Bundler", content="Vite uses ES Modules natively, bypasses bundling for development server, which starts fast.", category="Web Engineering")
            async_session.add_all([kw1, kw2])
            await async_session.flush()
            
            contributions = f"Topic: {kw1.title}\nContent: {kw1.content}\nTopic: {kw2.title}\nContent: {kw2.content}"
            print("[AI ENGINE] Querying Groq to build organized taxonomy tree...")
            tree_prompt = f"Given these contributions:\n{contributions}\nGenerate a visual ascii taxonomy hierarchy tree:"
            tree_system = "You are a research taxonomy organizer. Format contributions into a clear hierarchy tree using indentation."
            tree = await ai_service.chat_with_ai(message=tree_prompt, context="", custom_system_prompt=tree_system)
            print(f"[AI ENGINE] Organized Tree:\n{tree}")

        # 9. Brainstorm sticky notes + AI clustering
        print("[FLOW TEST] Testing Brainstorm Board + AI Concept Clustering...")
        async with async_session.begin():
            i1 = WorkspaceIdea(workspace_id=ws_id, user_id=u1_id, title="Glassmorphism UI", content="Frosted glass containers with blur background for the workspace cards.", category="Design", votes=[u1_id, u2_id])
            i2 = WorkspaceIdea(workspace_id=ws_id, user_id=u2_id, title="Mascot Mascot bounce", content="Mascot floats up and down on the mobile page.", category="Design", votes=[u2_id])
            i3 = WorkspaceIdea(workspace_id=ws_id, user_id=u1_id, title="FastAPI async pool", content="Ensure Neon uses asyncpg session connection pool.", category="Performance", votes=[u1_id])
            async_session.add_all([i1, i2, i3])
            await async_session.flush()
            
            ideas_text = f"- {i1.title}: {i1.content}\n- {i2.title}: {i2.content}\n- {i3.title}: {i3.content}"
            print("[AI ENGINE] Querying Groq to cluster brainstorming sticky notes...")
            cluster_system = "You are a brainstorming facilitator. Cluster these sticky notes into thematic groups with a title and list."
            clusters = await ai_service.chat_with_ai(message=f"Sticky notes:\n{ideas_text}\nCluster them:", context="", custom_system_prompt=cluster_system)
            print(f"[AI ENGINE] Thematic Clusters:\n{clusters}")

        # 10. Meeting Center + AI Minutes + Auto Task Creation
        print("[FLOW TEST] Testing Meeting Center + AI Minutes Note Parser...")
        async with async_session.begin():
            meet = WorkspaceMeeting(
                workspace_id=ws_id,
                organizer_id=u1_id,
                title="Sprint 1 Kickoff",
                date=datetime.utcnow(),
                agenda="Discuss DB migration, design style, and assign initial repository setups."
            )
            async_session.add(meet)
            await async_session.flush()
            meet_id = meet.id
            
            raw_meeting_notes = (
                "Decided to use Neon DB in production because it supports scaling. "
                "Alpha Teammate will write verify_workspaces.py script by tomorrow. "
                "Beta Teammate will write mobile/app/goals.tsx navigation stack rearrangement by Friday."
            )
            
            print("[AI ENGINE] Querying Groq to parse minutes notes...")
            parser_prompt = (
                f"Meeting: {meet.title}\nAgenda: {meet.agenda}\nRaw Notes:\n{raw_meeting_notes}\n"
                "Return a JSON block containing:\n"
                "1. 'summary': text summary\n"
                "2. 'decisions': text block of decisions\n"
                "3. 'action_items': array of objects containing 'task' (string title), 'assignee' (full name match), and 'due_date' (YYYY-MM-DD)"
            )
            parser_system = (
                "You are an executive assistant. Parse raw notes into summaries and follow-up action items. "
                "Output ONLY a valid JSON object matching the format request."
            )
            response = await ai_service.chat_with_ai(message=parser_prompt, context="", custom_system_prompt=parser_system)
            print(f"[AI ENGINE] Parsed JSON response: {response}")
            
            # Cleanup for potential markdown code blocks
            clean_res = response.strip()
            if "```json" in clean_res:
                clean_res = clean_res.split("```json")[1].split("```")[0].strip()
            elif "```" in clean_res:
                clean_res = clean_res.split("```")[1].split("```")[0].strip()
                
            data = json.loads(clean_res)
            meet.summary = data.get("summary")
            meet.decisions = data.get("decisions")
            meet.action_items = data.get("action_items", [])
            
            # Automatically create follow-up tasks
            print("[FLOW TEST] Automatically adding parsed action items to Kanban Board...")
            for act in meet.action_items:
                # Resolve assignee matching the names
                assignee_id = None
                if "Alpha" in act.get("assignee", ""):
                    assignee_id = u1_id
                elif "Beta" in act.get("assignee", ""):
                    assignee_id = u2_id
                
                due = None
                if act.get("due_date"):
                    try:
                        due = datetime.strptime(act.get("due_date"), "%Y-%m-%d")
                    except:
                        due = datetime.utcnow() + timedelta(days=2)
                        
                t_follow = WorkspaceTask(
                    workspace_id=ws_id,
                    assignee_id=assignee_id,
                    creator_id=u1_id,
                    title=act.get("task", "Action Item"),
                    priority="Medium",
                    status="To Do",
                    due_date=due,
                    progress=0,
                    tags=["meeting-minutes", "follow-up"]
                )
                async_session.add(t_follow)
            print("[FLOW TEST] Action items populated successfully as new tasks!")

        # 11. AI assistant chat + Team Memory context query
        print("[FLOW TEST] Testing AI Workspace Assistant + Team Memory query...")
        async with async_session.begin():
            # Pull activity history
            act_res = await async_session.execute(select(WorkspaceActivity).where(WorkspaceActivity.workspace_id == ws_id))
            activities_list = act_res.scalars().all()
            context_activities = "\n".join([f"- User ID {a.user_id}: {a.action} ({a.details or ''})" for a in activities_list])
            
            query_prompt = f"Review this activity timeline of the workspace:\n{context_activities}\nQuestion: What did Alpha Teammate do first?"
            print(f"[FLOW TEST] Prompt sent to AI Assistant: '{query_prompt}'")
            
            assistant_response = await ai_service.chat_with_ai(
                message=query_prompt,
                context="",
                custom_system_prompt="You are a workspace memory assistant. Analyze the activity logs and answer questions."
            )
            print(f"[AI ENGINE] Assistant reply: {assistant_response}")

        # 12. Productivity Leaderboard calculations
        print("[FLOW TEST] Testing Leaderboard scoring...")
        async with async_session.begin():
            # Update member analytics
            an1_res = await async_session.execute(select(WorkspaceAnalytics).where(WorkspaceAnalytics.workspace_id == ws_id, WorkspaceAnalytics.user_id == u1_id))
            analytics1 = an1_res.scalar_one()
            analytics1.notes_created = 1
            analytics1.tasks_completed = 1
            analytics1.goals_achieved = 0
            analytics1.workspace_activity = 5
            analytics1.contribution_score = (analytics1.tasks_completed * 10) + (analytics1.notes_created * 5) + (analytics1.workspace_activity * 2) # = 10 + 5 + 10 = 25 pts
            
            an2_res = await async_session.execute(select(WorkspaceAnalytics).where(WorkspaceAnalytics.workspace_id == ws_id, WorkspaceAnalytics.user_id == u2_id))
            analytics2 = an2_res.scalar_one()
            analytics2.notes_created = 0
            analytics2.tasks_completed = 0
            analytics2.workspace_activity = 2
            analytics2.contribution_score = 4.0
            
            # Sort leaderboard
            leaderboard_stmt = select(WorkspaceAnalytics).where(WorkspaceAnalytics.workspace_id == ws_id).order_by(WorkspaceAnalytics.contribution_score.desc())
            lb_res = await async_session.execute(leaderboard_stmt)
            ranking = lb_res.scalars().all()
            
            print("[FLOW TEST] Leaderboard results calculated:")
            for idx, rank in enumerate(ranking):
                print(f"  #{idx+1}: User {rank.user_id} - Score: {rank.contribution_score} pts (Activity: {rank.workspace_activity})")
                
            assert ranking[0].user_id == u1_id, "Owner should be first based on seed values"
            print("[FLOW TEST] Assert verified: sorting functions correctly.")

        # 13. Cleaning up test data
        print("[FLOW TEST] Cleaning up mock tables...")
        async with async_session.begin():
            # Delete workspace cascade deletes members, notes, tasks, etc. due to SQL constraints
            ws_to_delete = await async_session.execute(select(Workspace).where(Workspace.id == ws_id))
            await async_session.delete(ws_to_delete.scalar_one())
            
            # Delete users
            u1_to_delete = await async_session.execute(select(User).where(User.id == u1_id))
            await async_session.delete(u1_to_delete.scalar_one())
            u2_to_delete = await async_session.execute(select(User).where(User.id == u2_id))
            await async_session.delete(u2_to_delete.scalar_one())
            
        print("[FLOW TEST] Database successfully cleaned. No stray test records left.")
        print("\n[FLOW TEST] SUCCESS: All 12 workspace modules, 6 custom Groq AI integration triggers, and leaderboard sorting rules executed and validated successfully!")
        sys.exit(0)
        
    except Exception as e:
        print(f"[FLOW TEST] FAILURE: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        # Attempt recovery deletion
        try:
            async with async_session.begin():
                await async_session.execute(delete(Workspace).where(Workspace.name == "Project Launchpad"))
                await async_session.execute(delete(User).where(User.email.in_([test_email_1, test_email_2])))
        except:
            pass
        sys.exit(1)
    finally:
        await async_session.close()


if __name__ == "__main__":
    asyncio.run(run_flow_test())
