# Module 08 — Social Media & LinkedIn (Replaces Marblism)
# Dash ERP System Specification

## Purpose

Per-business LinkedIn and social media management inside Dash ERP.
Replaces Marblism. Claude drafts posts, tracks engagement, manages
LinkedIn connections, and schedules content per business brand voice.

## Social Accounts Per Business

  SwiftFi:
    - LinkedIn: SwiftFi company page + founder personal (for thought leadership)
    - Twitter/X: @swiftfi (if exists)

  UnbeatableLoans:
    - LinkedIn: UnbeatableLoans company page
    - Twitter/X: if exists

  OllaCart:
    - LinkedIn: OllaCart company page
    - Twitter/X: if exists
    - Instagram: if exists (social shopping is visual)

## LinkedIn Integration

  Auth: LinkedIn OAuth 2.0
    Scopes: r_liteprofile, r_emailaddress, w_member_social, r_organization_social,
            w_organization_social, rw_organization_admin

  LinkedIn App: Create one LinkedIn app that manages all business pages
  Store tokens: Supabase table "social_accounts"

  File: /lib/linkedin.ts
  Use LinkedIn API v2

  Key endpoints:
    GET  /v2/me                          — personal profile
    GET  /v2/organizations?q=vanityName  — company page
    POST /v2/ugcPosts                    — create post (personal or company)
    GET  /v2/socialActions/{postId}      — get post engagement
    GET  /v2/connections                 — personal connections
    POST /v2/socialActions/{urn}/likes   — like a post (engagement)

## Supabase Schema

  Table: social_accounts
    id: uuid PRIMARY KEY
    business_id: text NOT NULL
    platform: text                    -- "linkedin" | "twitter" | "instagram"
    account_type: text                -- "personal" | "company_page"
    account_name: text
    account_id: text                  -- platform-specific ID
    access_token: text (encrypted)
    refresh_token: text (encrypted)
    token_expires_at: timestamp
    is_active: boolean DEFAULT true

  Table: social_posts
    id: uuid PRIMARY KEY
    business_id: text NOT NULL
    social_account_id: uuid REFERENCES social_accounts(id)
    platform: text
    status: text DEFAULT 'draft'      -- "draft" | "scheduled" | "published" | "failed"
    content: text
    media_urls: text[]
    scheduled_for: timestamp
    published_at: timestamp
    platform_post_id: text            -- ID returned by platform after publishing
    likes: integer DEFAULT 0
    comments: integer DEFAULT 0
    shares: integer DEFAULT 0
    impressions: integer DEFAULT 0
    claude_generated: boolean DEFAULT false
    created_at: timestamp DEFAULT now()

  Table: linkedin_connections
    id: uuid PRIMARY KEY
    business_id: text NOT NULL        -- which business context this connection belongs to
    linkedin_member_id: text
    name: text
    headline: text
    company: text
    connected_at: timestamp
    last_interaction_at: timestamp
    notes: text
    contact_type: text                -- "investor" | "partner" | "customer" | "peer" | "other"
    crm_contact_id: uuid              -- linked to crm_contacts if applicable

## API Routes

  GET /api/social/posts
    - List posts: all or filtered by business_id, platform, status
    - Sorted by scheduled_for or created_at

  POST /api/social/posts
    - Create or schedule a post
    - Body: business_id, platform, account_id, content, scheduled_for?

  POST /api/social/posts/:id/publish
    - Publish immediately or at scheduled time

  POST /api/social/posts/draft
    - Claude drafts a post based on topic/goal
    - Params: business_id, platform, topic, goal, tone?

  GET /api/social/analytics
    - Engagement metrics per business per platform
    - Params: business_id, platform, days_back

  POST /api/social/linkedin/connect
    - Initiate LinkedIn OAuth for a business

  GET /api/social/linkedin/connections
    - List LinkedIn connections with filters

## Claude Content Generation

  Content calendar generation (weekly):
    System: Generate 5 LinkedIn posts for this week for {business_name}.
    Goal: {awareness | leads | investor interest | hiring}
    Audience: {target audience for this business}
    Topics to cover: {current projects, milestones, thoughts}
    Tone: {brand voice}
    Length: LinkedIn optimal (150-300 words for thought leadership,
            under 150 for quick updates)
    Format: Mix of formats (text only, question posts, list posts)

  Per-business content angles:

  SwiftFi:
    - Crypto/fintech thought leadership
    - Behind-the-scenes building a fintech startup
    - User success stories (anonymized)
    - Market commentary on crypto onramp landscape
    Audience: crypto users, fintech investors, Web3 builders

  UnbeatableLoans:
    - Mortgage education (demystify the process)
    - Market insights (rate commentary)
    - Founder story: building in mortgage tech
    - Tips for first-time homebuyers
    Audience: homebuyers, real estate agents, mortgage investors

  OllaCart:
    - Social commerce trends
    - Building in public updates (Rye API integration journey)
    - Universal cart vision and use cases
    - Creator economy and shopping
    Audience: e-commerce builders, creators, investors, shoppers

## Content Calendar UI

  File: /components/social/SocialView.tsx

  Views:
    - Content calendar (week/month view with scheduled posts)
    - Post composer (Claude-assisted)
    - Analytics dashboard
    - LinkedIn connections manager

  Content calendar:
    - Color-coded by business
    - Drag to reschedule
    - Click to edit post
    - Status indicators: draft / scheduled / published
    - Per-platform icons

  Post composer:
    - Business selector
    - Platform selector (LinkedIn / Twitter / Instagram)
    - Topic input → Claude generates draft
    - Edit draft
    - Schedule or publish immediately
    - Character count (per platform limits)
    - Preview mode

  Analytics:
    - Impressions, likes, comments, shares per post
    - Best performing post per week
    - Follower growth trend
    - Engagement rate

## LinkedIn Connection Strategy

  Claude reviews new connection requests weekly:
    - Categorizes: investor / potential customer / partner / peer / irrelevant
    - Recommends: accept / ignore / pending
    - Suggests a personalized message for high-value connections

  Connection follow-up:
    - When a new investor-category connection is made
    - Claude drafts a personalized follow-up message
    - Links to VC pipeline (creates draft deal record if investor)

## Posting Schedule (Default)

  SwiftFi:          Tuesday and Thursday, 9am EST
  UnbeatableLoans:  Monday and Wednesday, 8am EST
  OllaCart:         Wednesday and Friday, 10am EST

  Adjust based on analytics once data is available.

## Content Approval Flow

  1. Claude generates draft posts weekly (Sunday night)
  2. Founder reviews in content calendar
  3. Edit or approve each post
  4. Posts publish automatically at scheduled time
  5. Engagement metrics pulled daily

  NEVER publish without founder approval. Auto-publish is off by default.
