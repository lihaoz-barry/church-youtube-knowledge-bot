# Feature Specification: Telegram AI Knowledge Assistant

**Feature Branch**: `002-telegram-assistant`
**Created**: 2025-10-31
**Status**: Draft
**Input**: User description: "Telegram AI Knowledge Assistant - As a congregation member, I can ask questions to a Telegram bot which answers based on all sermon video transcripts, providing precise video timestamp links for easy review."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect Telegram Bot (Priority: P1)

As a church administrator, I need to connect a Telegram bot to the system so that congregation members can start querying sermon content.

**Why this priority**: Without bot connection, no congregation members can access the knowledge base. This is the foundational step that enables end-user value delivery.

**Independent Test**: Administrator enters bot token on dashboard, clicks "Connect", and verifies that status shows "Bot active: @bot_username". Can test by sending a test message to the bot and receiving a response.

**Acceptance Scenarios**:

1. **Given** an administrator on the dashboard with a valid Telegram bot token, **When** they enter the token and click "Connect Telegram Bot", **Then** the system validates the token and displays "Bot active: @bot_username"
2. **Given** an invalid bot token, **When** administrator attempts to connect, **Then** the system displays clear error message "Invalid token - please verify your BotFather token"
3. **Given** a connected bot, **When** the administrator views the dashboard, **Then** connection status shows active with bot username and timestamp of last activity
4. **Given** a connected bot, **When** administrator clicks "Disconnect", **Then** bot is deactivated and status updates to "Disconnected"

---

### User Story 2 - Ask Simple Questions (Priority: P2)

As a congregation member, I can send a question to the Telegram bot and receive an answer based on sermon transcripts with video links.

**Why this priority**: This is the core value proposition - enabling members to query sermon content. Must work before advanced features like conversation history.

**Independent Test**: Send message "What is grace?" to bot. Verify that: (1) bot responds within 5 seconds, (2) answer includes summary text, (3) response includes video title and timestamp link, (4) clicking link opens YouTube at correct moment.

**Acceptance Scenarios**:

1. **Given** a user sends "What is justification by faith?" to the bot, **When** the bot processes the query, **Then** the bot returns an answer summarizing the concept with 2-3 relevant video segment links including titles and timestamps
2. **Given** relevant sermon content exists, **When** user clicks a timestamp link in bot response, **Then** YouTube opens in browser at the exact video timestamp (within 2 seconds accuracy)
3. **Given** a user asks a question with no relevant sermon content, **When** the bot searches the knowledge base, **Then** the bot responds "Sorry, I couldn't find relevant content in our sermons. Please try rephrasing your question."
4. **Given** multiple sermon segments match the query, **When** the bot formats the response, **Then** segments are ranked by relevance and top 3-5 are included with video titles, timestamps, and brief context snippets
5. **Given** a user sends a message in Chinese, **When** the bot processes the query, **Then** the bot responds in Chinese with relevant sermon segments (language is preserved)

---

### User Story 3 - Multi-Turn Conversations (Priority: P3)

As a congregation member, I can ask follow-up questions and the bot understands the conversation context from my previous messages.

**Why this priority**: Enhances user experience by enabling natural conversation flow. Depends on basic Q&A working first (P2).

**Independent Test**: Send "What is grace?" then "Can you give more examples?" Verify that bot understands "more examples" refers to grace without repeating the topic name.

**Acceptance Scenarios**:

1. **Given** a user asked "What is grace?" and received an answer, **When** they send follow-up "Can you explain more?", **Then** the bot maintains context and provides additional details about grace
2. **Given** a conversation with 3+ exchanges, **When** user asks "What was my first question?", **Then** the bot references the conversation history accurately
3. **Given** a user starts a new topic after 5 minutes of inactivity, **When** they send a new question, **Then** the bot treats it as a fresh query without applying stale context
4. **Given** conversation history includes last 5 messages, **When** user sends 6th message, **Then** oldest message is dropped from context but recent messages are retained

---

### User Story 4 - View Bot Analytics (Priority: P4)

As a church administrator, I can view analytics about bot usage to understand what topics congregation members are asking about.

**Why this priority**: Provides insight into congregation interests and bot effectiveness. Lower priority because bot must be functional first.

**Independent Test**: After bot receives 10+ queries, administrator opens dashboard analytics panel and sees: total queries count, list of most asked questions, average response time chart.

**Acceptance Scenarios**:

1. **Given** the bot has processed 50 queries this month, **When** administrator views analytics dashboard, **Then** total query count displays "50 queries this month"
2. **Given** users have asked various questions, **When** administrator views "Most Asked Questions" section, **Then** top 10 questions are listed with query count for each
3. **Given** bot queries have been processed with varying response times, **When** administrator views response time graph, **Then** average response time is displayed (e.g., "2.3 seconds average")
4. **Given** bot usage data exists, **When** administrator views engagement metrics, **Then** percentage of users asking follow-up questions is displayed (e.g., "35% ask follow-ups")

---

### User Story 5 - Broadcast Messages (Priority: P5)

As a church administrator, I can send broadcast announcements to all bot users for important church communications.

**Why this priority**: Useful feature but not critical to core knowledge base functionality. Can be added after bot is stable and proven.

**Independent Test**: Administrator enters broadcast message "Service time changed to 10 AM this Sunday" and clicks "Send to all users". Verify that all users who have messaged the bot receive the notification.

**Acceptance Scenarios**:

1. **Given** an administrator has a broadcast message ready, **When** they enter the message in dashboard and click "Broadcast to all users", **Then** the message is sent to all users who have previously interacted with the bot
2. **Given** a broadcast is being sent, **When** sending is in progress, **Then** dashboard shows progress indicator "Sending to 127 users..."
3. **Given** broadcast message includes links or formatting, **When** users receive it, **Then** Telegram renders the message with proper formatting (bold, links, etc.)
4. **Given** some users have blocked the bot, **When** broadcast is sent, **Then** system tracks failed deliveries and displays "Sent to 120/127 users (7 failed)"

---

### Edge Cases

- **Very long answers**: If generated answer exceeds Telegram's 4096 character limit, system splits message into multiple parts or truncates with "..." and prompt to continue
- **No indexed videos**: If no videos have been processed yet, bot responds "Knowledge base is being built. Please check back soon."
- **Ambiguous questions**: Questions like "Tell me everything" that are too broad receive response "Your question is quite broad. Could you be more specific? For example, ask about a particular topic or Bible passage."
- **Rate limiting exceeded**: User sends 10+ messages in 1 minute, bot responds "Please slow down. You can ask up to 10 questions per minute."
- **API failures**: If OpenAI API times out, bot responds "Processing, please retry shortly." (graceful degradation)
- **Similarity threshold too low**: If best match has similarity score < 0.5, treat as no results and ask for clarification
- **Bot token revoked**: If Telegram returns 401 Unauthorized, system alerts administrator in dashboard "Bot token invalid - please reconnect"
- **Concurrent queries from same user**: If user sends multiple messages before first response, queue them and process sequentially
- **Special characters in queries**: Handle emoji, quotes, apostrophes gracefully in embedding generation and response formatting
- **Video deleted after indexing**: If timestamp link points to deleted video, bot includes note "(Note: This video is no longer available)" next to link

## Requirements *(mandatory)*

### Functional Requirements

#### Telegram Bot Connection

- **FR-001**: System MUST provide input field on dashboard for church administrators to enter Telegram bot token
- **FR-002**: System MUST validate bot token by calling Telegram getMe API before storing
- **FR-003**: System MUST store bot token encrypted in database on per-church basis
- **FR-004**: System MUST display bot connection status showing "Bot active: @bot_username" with username from Telegram API
- **FR-005**: System MUST provide "Disconnect" button that deactivates bot and updates status
- **FR-006**: System MUST include link to BotFather instructions for administrators who need to create a bot

#### Query Processing

- **FR-007**: Bot MUST receive user messages via Telegram webhook
- **FR-008**: System MUST generate embedding vector for user query using same model as transcript corpus
- **FR-009**: System MUST perform semantic similarity search in transcript database using pgvector
- **FR-010**: System MUST filter search results to only include videos belonging to the user's church (enforce multi-tenancy)
- **FR-011**: System MUST retrieve top 10 most similar transcript segments based on embedding similarity
- **FR-012**: System MUST re-rank results by: semantic similarity (primary), video recency (secondary), segment length (tertiary)
- **FR-013**: System MUST select top 3-5 segments for answer generation context

#### Answer Generation

- **FR-014**: System MUST construct structured prompt for LLM including user question and retrieved transcript segments
- **FR-015**: System MUST call LLM API to generate concise answer based on provided context
- **FR-016**: System MUST include explicit instruction in prompt: "If no relevant content found, state honestly"
- **FR-017**: System MUST format response with video titles, timestamps, and segment descriptions
- **FR-018**: System MUST generate YouTube timestamp links in format: https://youtu.be/{video_id}?t={seconds}
- **FR-019**: System MUST use Telegram Markdown formatting: bold for video titles, inline links for timestamps
- **FR-020**: System MUST send formatted response back to user via Telegram sendMessage API

#### Conversation Context

- **FR-021**: System MUST store conversation history for each user (last 5 messages)
- **FR-022**: System MUST include conversation history in LLM prompt for follow-up question understanding
- **FR-023**: System MUST clear conversation context after 10 minutes of user inactivity
- **FR-024**: System MUST handle context window by dropping oldest messages when exceeding 5-message limit

#### Error Handling

- **FR-025**: System MUST respond with "Sorry, I couldn't find relevant content..." when similarity score < 0.5
- **FR-026**: System MUST respond with "Processing, please retry shortly." when API timeout occurs
- **FR-027**: System MUST respond with "Please slow down..." when user exceeds rate limit (10 queries/minute)
- **FR-028**: System MUST alert administrator in dashboard when bot token becomes invalid
- **FR-029**: System MUST log all errors with context: user_id, query text, error message, timestamp

#### Analytics & Monitoring

- **FR-030**: System MUST record every bot interaction: query text, answer, timestamp, user_id, response time
- **FR-031**: System MUST display total query count for current month on analytics dashboard
- **FR-032**: System MUST calculate and display most frequently asked questions (top 10)
- **FR-033**: System MUST track average response time and display on dashboard
- **FR-034**: System MUST calculate percentage of users asking follow-up questions (engagement metric)

#### Broadcast Messages

- **FR-035**: System MUST provide text input field on dashboard for administrators to compose broadcast messages
- **FR-036**: System MUST send broadcast message to all users who have previously interacted with the bot
- **FR-037**: System MUST display progress indicator while broadcast is sending
- **FR-038**: System MUST track successful and failed message deliveries
- **FR-039**: System MUST display delivery summary: "Sent to X/Y users (Z failed)"

#### Security & Privacy

- **FR-040**: System MUST enforce rate limiting: maximum 10 queries per user per minute
- **FR-041**: System MUST detect and block spam patterns (e.g., identical message repeated 5+ times)
- **FR-042**: System MUST never log user message content to external services outside of approved systems
- **FR-043**: System MUST verify Telegram webhook signature to prevent unauthorized requests
- **FR-044**: System MUST allow administrators to temporarily disable bot from dashboard

#### Multi-Language Support

- **FR-045**: Bot MUST preserve query language in response (Chinese query → Chinese answer)
- **FR-046**: System MUST handle embedding generation for both Chinese and English text
- **FR-047**: Bot MUST search across all transcript languages but prioritize language match
- **FR-048**: System MUST format responses appropriately for Chinese and English text (no broken characters)

### Key Entities

- **Telegram Bot**: Represents church's bot configuration; attributes include bot_id, church_id (foreign key), bot_token (encrypted), bot_username, webhook_url, active_status, created_date

- **Bot Query**: Represents a user interaction with the bot; attributes include query_id, bot_id (foreign key), user_id (Telegram user ID), query_text, answer_text, response_time_ms, similarity_score, segments_used, timestamp, language_detected

- **Conversation Session**: Represents ongoing conversation context; attributes include session_id, bot_id (foreign key), user_id, message_history (JSON array, last 5 messages), last_activity_timestamp, created_date

- **Broadcast Message**: Represents admin broadcast; attributes include broadcast_id, bot_id (foreign key), message_text, total_recipients, successful_deliveries, failed_deliveries, sent_timestamp, created_by_admin_id

- **Bot User**: Represents congregation member using bot; attributes include user_id (Telegram user ID), bot_id (foreign key), first_name, username, total_queries, last_query_timestamp, joined_date, blocked_bot (boolean)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Church administrators can connect a Telegram bot and see active status with bot username within 10 seconds of entering valid token

- **SC-002**: Users receive bot response within 5 seconds for typical queries (95th percentile)

- **SC-003**: Timestamp links in bot responses open YouTube video at correct moment with accuracy within 3 seconds of referenced timestamp

- **SC-004**: Manual review of 20 random bot answers shows 80% accuracy rate (correct video segments cited for the question asked)

- **SC-005**: Multi-language queries work correctly: Chinese questions receive Chinese answers, English questions receive English answers

- **SC-006**: Follow-up questions maintain context: 90% of follow-up queries correctly reference previous conversation topic

- **SC-007**: Bot gracefully handles "no results" scenario: 100% of queries with no matching content receive clear "no relevant content" message instead of incorrect answers

- **SC-008**: Rate limiting prevents abuse: Users exceeding 10 queries/minute receive rate limit message within 1 second

- **SC-009**: Analytics dashboard accurately reflects bot usage: query counts and response times match logged interactions (verified by database audit)

- **SC-010**: Broadcast messages deliver successfully: 95% delivery rate to active bot users (excluding users who blocked bot)

- **SC-011**: User engagement measured: 30% of users ask at least one follow-up question in a session

- **SC-012**: Bot remains responsive under load: Handles 50 concurrent queries without degradation in response time

## Assumptions

1. **Video Content Prerequisite**: Assuming YouTube videos have already been processed and transcripts with embeddings exist in database. Bot cannot function without indexed content.

2. **Telegram Bot Creation**: Assuming church administrators have or can create Telegram bot via BotFather. System provides documentation links but does not automate bot creation.

3. **OpenAI API Access**: Assuming church has OpenAI API access for embedding generation (text-embedding-3-small) and answer generation (GPT-4 or similar). API keys are configured per church.

4. **Webhook Infrastructure**: Assuming n8n or Vercel can receive Telegram webhooks with HTTPS endpoints. Telegram requires HTTPS for webhook URLs.

5. **User Identity**: Assuming Telegram user_id is sufficient for user identification. System does not require additional authentication beyond Telegram's identity.

6. **Storage Capacity**: Assuming database can store conversation history and query logs. Estimate: 1000 users × 5 messages/session × 500 bytes/message = 2.5MB per active session period.

7. **Similarity Threshold**: Assuming similarity score of 0.5 (cosine similarity) as cutoff for relevant results. Scores below this are treated as "no results found."

8. **Response Time Goals**: Assuming embedding generation (50ms) + pgvector search (100ms) + LLM generation (2-3s) = total <5 seconds is acceptable for users.

9. **Rate Limiting Scope**: Assuming 10 queries per minute per user is sufficient to prevent abuse while allowing legitimate usage. Administrators are exempt from rate limits.

10. **Broadcast Audience**: Assuming broadcast messages target all users who have ever messaged the bot, regardless of activity recency. System does not automatically filter inactive users.

11. **Message Length**: Assuming most answers fit within Telegram's 4096 character limit. Edge case handling exists for longer responses but is not the primary design.

12. **Conversation Timeout**: Assuming 10 minutes of inactivity is appropriate timeout for conversation context clearing. Balances context persistence with memory efficiency.
