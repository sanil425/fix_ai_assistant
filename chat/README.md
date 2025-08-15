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
node chat/runner.js "<utterance>"
```

### Examples

#### Build a NewOrderSingle
```bash
# Complete order
node chat/runner.js "build a limit buy 100 AAPL at 187.5, id TEST1"

# Missing price (will prompt for info)
node chat/runner.js "build a limit buy 100 AAPL"

# Market order
node chat/runner.js "create market sell 50 TSLA"
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

## Dependencies

- Node.js 18+ (uses `globalThis.fetch`)
- No external packages required
- Framework-agnostic design for easy porting
