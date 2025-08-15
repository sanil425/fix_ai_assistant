# FIX Chat Adapter

Minimal, framework-agnostic chat adapter layer that parses user text and calls the FIX API.

## Prerequisites

1. **Start the FIX API server:**
   ```bash
   cd backend
   uvicorn api:app --reload --port 8000
   ```

2. **Verify the API is running:**
   ```bash
   curl http://127.0.0.1:8000/healthz
   # Should return: {"ok":true}
   ```

## Usage

### Basic Command
```bash
node chat/runner.js [--session <id>] "<utterance>"
```

### Examples

#### Build a NewOrderSingle
```bash
# Complete order (goes to confirmation)
node chat/runner.js "build a limit buy 100 AAPL at 187.5, id TEST1"

# Missing price (will prompt for info)
node chat/runner.js "build a limit buy 100 AAPL"

# Market order
node chat/runner.js "create market sell 50 TSLA"
```

#### Confirmation Loop
```bash
# Start building an order
node chat/runner.js --session x "build a limit buy 100 AAPL at 187.5, id TEST1"
# Returns: { "type": "confirm", "summary": "NewOrderSingle: Buy(1) 100 AAPL, Limit(2) 187.50, ClOrdID=TEST1" }

# Confirm the order
node chat/runner.js --session x "yes"
# Returns: { "type": "built", "raw_fix": "8=FIX.4.4|9=...|35=D|...|10=...", "valid": true }

# Edit fields before confirming
node chat/runner.js --session y "build a limit buy 100 AAPL"
# Returns: { "type": "need_info", "missing": ["44"], "prompt": "Please provide: price (required for limit orders)" }

node chat/runner.js --session y "price 187.5"
# Returns: { "type": "confirm", "summary": "NewOrderSingle: Buy(1) 100 AAPL, Limit(2) 187.50, ClOrdID=AUTO-..." }

node chat/runner.js --session y "id TEST9"
# Returns: { "type": "confirm", "summary": "NewOrderSingle: Buy(1) 100 AAPL, Limit(2) 187.50, ClOrdID=TEST9" }

# Cancel the order
node chat/runner.js --session y "cancel"
# Returns: { "type": "cancelled" }
```

#### Parse FIX Messages
```bash
node chat/runner.js "8=FIX.4.4|9=49|35=D|11=TEST1|55=AAPL|54=1|38=100|40=2|44=187.50|10=133|"
```

#### Explain FIX Messages
```bash
node chat/runner.js "explain 8=FIX.4.4|35=8|39=2|150=F|17=EXEC1|11=TEST1|55=AAPL|54=1|38=100|14=100|6=187.5|10=000"
```

#### Validate FIX Messages
```bash
node chat/runner.js "validate 8=FIX.4.4|35=D|11=TEST1|55=AAPL|54=1|38=100|40=2|10=000"
```

#### Lookup Field Information
```bash
node chat/runner.js "what is tag 11"
node chat/runner.js "tag 38"
```

## Configuration

Set the FIX API base URL via environment variable:
```bash
export FIX_API_BASE_URL="http://localhost:8000"
node chat/runner.js "build a limit buy 100 AAPL at 187.50"
```

## Response Types

### Build Flow
- **Success**: `{ "type": "built", "raw_fix": "...", "valid": true, "errors": [] }`
- **Missing Info**: `{ "type": "need_info", "missing": ["44"], "prompt": "Please provide: price (required for limit orders)" }`

### Parse Flow
- **Success**: `{ "type": "parsed", "fields": {...}, "meta": {...}, "explanation": "..." }`

### Explain Flow
- **Success**: `{ "type": "explanation", "explanation": "..." }`

### Validate Flow
- **Success**: `{ "type": "validation", "valid": true, "errors": [] }`

### Lookup Flow
- **Success**: `{ "type": "lookup", "tag": "11", "name": "ClOrdID", "type": "String", ... }`

### Error
- **Error**: `{ "type": "error", "error": "Error message" }`

## Architecture

- **tools.js**: HTTP wrappers for FIX API endpoints
- **intent.js**: Intent detection from natural language
- **slots.js**: Slot extraction for NewOrderSingle commands
- **flows.js**: Flow orchestration and API coordination
- **runner.js**: CLI interface and main entry point
- **session.js**: Ephemeral session store with 30-minute expiration
- **confirm.js**: Confirmation logic and user edit parsing

## Sessions

The chat adapter uses in-memory sessions to maintain state during order building:

- **Session ID**: Use `--session <id>` to specify a session (default: "local")
- **Expiration**: Sessions automatically expire after 30 minutes of inactivity
- **State**: Sessions store pending order fields and confirmation stage
- **Isolation**: Different session IDs maintain separate order contexts

**Note**: Sessions are in-memory and only persist within a single process. For CLI usage, each `node` command runs in a separate process, so sessions are not shared between different CLI calls. The session management is designed for use within chat frameworks or web applications where the same process handles multiple user interactions.

## Confirmation Flow

1. **Initial Build**: User provides order details → system extracts fields
2. **Confirmation**: System shows summary and waits for user confirmation
3. **Edits**: User can modify fields before confirming
4. **Execution**: User confirms → system builds and validates FIX message
5. **Cleanup**: Session is cleared after successful build or cancellation

## Testing the Confirmation Loop

To test the confirmation loop in a single process, use the test script:

```bash
node chat/test_confirm.js
```

This demonstrates the complete confirmation flow:
1. Build initial order → confirmation prompt
2. Confirm order → FIX message built
3. Start new order → confirmation prompt
4. Edit fields → updated confirmation
5. Confirm edited order → FIX message built

## Dependencies

- Node.js 18+ (uses `globalThis.fetch`)
- No external packages required
- Framework-agnostic design for easy porting

## Running the Chat Service

The chat service provides an HTTP API endpoint for frontend integration.

### Prerequisites

1. **Start FIX API** (backend):
```bash
uvicorn backend.api:app --reload --port 8000
```

2. **Start chat service**:
```bash
npm run chat:dev
```

### Configuration

Set these environment variables in your `.env` file:
- `OPENAI_API_KEY`: Your OpenAI API key
- `FIX_API_BASE_URL`: FIX API endpoint (default: http://127.0.0.1:8000)
- `LLM_MODE`: LLM mode (always/fallback/off)
- `FRONTEND_ORIGIN`: Frontend origin for CORS (default: *)
- `CHAT_PORT`: Chat service port (default: 8787)

### API Endpoints

#### Health Check
```bash
curl http://127.0.0.1:8787/healthz
# Returns: { "ok": true, "mode": "always" }
```

#### Chat Message
```bash
curl -s -X POST http://127.0.0.1:8787/chat \
  -H "content-type: application/json" \
  -d '{"session_id":"local","message":"buy 100 aapl limit at 187.5 id t1"}'
```

#### Confirmation
```bash
curl -s -X POST http://127.0.0.1:8787/chat \
  -H "content-type: application/json" \
  -d '{"session_id":"local","message":"yes"}'
```

#### Field Lookup
```bash
curl -s -X POST http://127.0.0.1:8787/chat \
  -H "content-type: application/json" \
  -d '{"session_id":"local","message":"what is tag 38"}'
```

### Response Format

```json
{
  "session_id": "sess_1234567890_abc123",
  "intent": "build",
  "reply_style": "confirm",
  "result": { /* flow result object */ },
  "narration": { "text": "human summary" },
  "llm_mode": "always"
}
```

### Security Notes

- Set `FRONTEND_ORIGIN` to your dev host (e.g., http://localhost:5173) to tighten CORS
- Optional: Set `FIX_API_TOKEN` for FastAPI bearer token authentication
