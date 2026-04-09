# Module 04 — Calendar Manager
# Dash ERP System Specification

## Purpose

Per-business Google Calendar integration. Claude knows your schedule and
automatically creates prep tasks, sends briefings before meetings, and
helps you plan your week across all three businesses.

## Calendar Accounts

  One Google Calendar per business (linked to the same Google OAuth accounts
  as email — reuse tokens):

  SwiftFi:       Calendar on swiftfi.com Google Workspace account
  UnbeatableLoans: Calendar on unbeatableloans.com Google Workspace account
  OllaCart:      Calendar on john@ollacart.com account

  Personal:      Option to connect personal Google Calendar as well

## Supabase Schema

  Table: calendar_events
    id: uuid PRIMARY KEY
    business_id: text NOT NULL
    google_event_id: text UNIQUE
    calendar_account: text          -- which email account owns this calendar
    title: text NOT NULL
    description: text
    start_time: timestamp NOT NULL
    end_time: timestamp NOT NULL
    location: text
    attendees: jsonb                -- [{email, name, status}]
    event_type: text                -- "investor_meeting" | "dev_sync" | "customer_call" |
                                   --  "internal" | "personal" | "pitch"
    claude_prep_notes: text         -- Claude's prep brief for this meeting
    task_id: uuid                   -- linked prep task
    is_recurring: boolean
    created_at: timestamp DEFAULT now()
    updated_at: timestamp DEFAULT now()

## API Routes

  GET /api/calendar/events
    - Returns events for date range across all or specific business calendars
    - Params: business_id?, start_date, end_date, event_type?
    - Default: next 7 days

  POST /api/calendar/events
    - Create a new calendar event via Google Calendar API
    - Requires user confirmation before creating

  PATCH /api/calendar/events/:id
    - Update event details

  POST /api/calendar/sync
    - Syncs events from Google Calendar API for all connected accounts
    - Runs every 30 minutes as background job

  POST /api/calendar/prep
    - Generates Claude prep notes for an upcoming meeting
    - Params: event_id
    - Pulls attendee info from Neo4j contacts, creates prep task

  GET /api/calendar/today
    - Returns today's events with prep notes
    - Used in daily brief

## Daily Schedule Philosophy

  The founder's natural schedule (encode in Claude memory):

  Morning (8am - 12pm):   SwiftFi deep work (building, Cursor, dev sync)
  Midday (12pm - 2pm):    Meetings, investor calls, emails
  Afternoon (2pm - 6pm):  OllaCart work, growth experiments, outreach
  Evening (after 9pm):    UnbeatableLoans (mortgage app, Cursor, spec writing)

  Claude should:
  - Suggest scheduling investor calls during midday windows
  - Never schedule dev syncs in the evening (UnbeatableLoans time)
  - Flag when a meeting conflicts with a deep work block

## Meeting Types & Handling

  investor_meeting:
    - Auto-create task: "Prep pitch for {investor name}" due 1 day before
    - Pull investor profile from Neo4j VC pipeline
    - Claude generates: key points to cover, questions to ask, materials to send

  dev_sync:
    - Auto-create task: "Prep dev agenda for {date}"
    - Claude generates: list of open PRs, blockers, priorities to discuss

  customer_call:
    - Auto-create task: "Review customer history before call"
    - Pull customer info from support tickets and email history

  pitch:
    - Auto-create tasks: "Update deck", "Practice elevator pitch", "Send materials"
    - Link to VC pipeline deal record

## Claude Pre-Meeting Brief

  Triggers 30 minutes before any meeting with external attendees.
  Delivered as a Dash chat message.

  Brief includes:
    - Who you're meeting and why
    - Last interaction with this person (from Neo4j)
    - Key talking points
    - What you need from this meeting (outcome)
    - Relevant context (open tasks, recent emails about this topic)

  Example:
    "In 30 minutes: investor call with Sarah Chen (Sequoia).
    Last contact: email 3 days ago — she asked for the SwiftFi deck.
    Status: deck not sent yet — do you want me to draft that email now?
    Key points to cover: revenue growth, user acquisition, team.
    Open question from last call: unit economics per transaction."

## Week Planning (Monday Brief)

  Every Monday at 8am, Claude generates a weekly plan:

  Format:
    This week's priorities:
    [SwiftFi] — 3 key goals
    [UnbeatableLoans] — 1-2 night goals
    [OllaCart] — 1-2 afternoon goals

    Meetings this week: {list}
    Deadlines this week: {list}
    Recommended focus each day: {Mon-Fri breakdown}

## UI Components

  File: /components/calendar/CalendarView.tsx

  Views:
    - Week view (default): shows all businesses color-coded
    - Day view: detailed with prep notes
    - Agenda view: list format with Claude summaries

  Color coding:
    SwiftFi events:       blue
    UnbeatableLoans events: amber
    OllaCart events:      coral/orange
    Personal events:      gray

  Features:
    - Click event to see Claude prep brief
    - "Schedule meeting" button opens Claude to find optimal time
    - Show "focus blocks" for deep work (grayed out = protected time)
    - Drag to reschedule (updates Google Calendar via API)

## Google Calendar API

  File: /lib/google-calendar.ts

  Use googleapis package (same auth as Gmail).

  Functions:
    listEvents(auth, calendarId, timeMin, timeMax)
    createEvent(auth, calendarId, event)
    updateEvent(auth, calendarId, eventId, updates)
    deleteEvent(auth, calendarId, eventId)

  Calendar IDs:
    - "primary" for the main calendar of each Google account
    - Store calendar IDs in email_accounts table as calendar_id field
