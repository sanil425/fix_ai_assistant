"""
FastAPI application exposing FIX engine functionality.
"""

import time
import logging
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .fix_engine import build_fix, parse_fix, validate_fix, explain_exec_report, lookup_tag, normalize_delims
from .settings import APP_NAME, DEFAULT_FIX_VERSION, LOG_LEVEL, FixVersion, Delimiter

# Configure logging
logging.basicConfig(level=getattr(logging, LOG_LEVEL))
logger = logging.getLogger(__name__)

# Pydantic models
class BuildRequest(BaseModel):
    fix_version: FixVersion = Field(default=DEFAULT_FIX_VERSION, description="FIX protocol version")
    fields: Dict[str, Any] = Field(description="Tag-value pairs for the FIX message")
    delimiter: Delimiter = Field(default="|", description="Delimiter for FIX fields")

class BuildResponse(BaseModel):
    raw_fix: str = Field(description="FIX message with | delimiters")

class ParseRequest(BaseModel):
    fix_version: FixVersion = Field(default=DEFAULT_FIX_VERSION, description="FIX protocol version")
    raw_fix: str = Field(description="Raw FIX message to parse")
    delimiter: Delimiter = Field(default="|", description="Delimiter for FIX fields")

class ParseResponse(BaseModel):
    fields: Dict[str, Any] = Field(description="Parsed tag-value pairs")
    meta: Dict[str, Any] = Field(description="Metadata including BodyLength and CheckSum")

class ValidateRequest(BaseModel):
    fix_version: FixVersion = Field(default=DEFAULT_FIX_VERSION, description="FIX protocol version")
    raw_fix: str = Field(description="Raw FIX message to validate")
    delimiter: Delimiter = Field(default="|", description="Delimiter for FIX fields")

class ValidateResponse(BaseModel):
    ok: bool = Field(description="Whether validation passed")
    errors: Optional[List[Dict[str, Any]]] = Field(default=None, description="Validation errors if any")

class ExplainRequest(BaseModel):
    fix_version: FixVersion = Field(default=DEFAULT_FIX_VERSION, description="FIX protocol version")
    raw_fix: str = Field(description="Raw FIX message to explain")
    delimiter: Delimiter = Field(default="|", description="Delimiter for FIX fields")

class ExplainResponse(BaseModel):
    explanation: str = Field(description="Human-readable explanation of the message")

class LookupResponse(BaseModel):
    tag: str = Field(description="FIX tag number")
    name: str = Field(description="Field name")
    type: str = Field(description="Field data type")
    requiredFor: List[str] = Field(description="Message types that require this field")
    description: str = Field(description="Field description")

class ErrorResponse(BaseModel):
    error: Dict[str, Any] = Field(description="Error details")

# Create FastAPI app
app = FastAPI(
    title=APP_NAME,
    description="FIX protocol API for building, parsing, validating, and explaining FIX messages",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle uncaught exceptions and return structured error responses."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "details": {}
            }
        }
    )

# Request/response logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log request/response details."""
    start_time = time.time()
    
    response = await call_next(request)
    
    duration_ms = int((time.time() - start_time) * 1000)
    logger.info(f"{request.method} {request.url.path} {response.status_code} {duration_ms}ms")
    
    return response

# Health check endpoint
@app.get("/healthz")
async def health():
    """Health check endpoint."""
    return {"ok": True}

# FIX build endpoint
@app.post("/fix/build", response_model=BuildResponse)
async def build_fix_message(request: BuildRequest):
    """Build a FIX message from tag-value pairs."""
    try:
        # Convert | to SOH for internal processing
        fields_soh = {k: normalize_delims(v, to_soh=True) if isinstance(v, str) else v 
                      for k, v in request.fields.items()}
        
        # Build FIX message
        result = build_fix("D", fields_soh, f"FIX.{request.fix_version}")
        
        # Convert SOH back to | for response
        return BuildResponse(raw_fix=normalize_delims(result["raw"], to_soh=False))
    
    except Exception as e:
        logger.error(f"Error building FIX message: {e}")
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": f"Failed to build FIX message: {str(e)}",
                    "details": {}
                }
            }
        )

# FIX parse endpoint
@app.post("/fix/parse", response_model=ParseResponse)
async def parse_fix_message(request: ParseRequest):
    """Parse a FIX message into tag-value pairs."""
    try:
        # Convert | to SOH for internal processing
        fix_soh = normalize_delims(request.raw_fix, to_soh=True)
        
        # Parse FIX message
        fields = parse_fix(fix_soh)
        
        # Extract metadata
        meta = {
            "bodyLength": fields.get("9"),
            "checkSum": fields.get("10"),
            "msgType": fields.get("35"),
            "beginString": fields.get("8")
        }
        
        return ParseResponse(fields=fields, meta=meta)
    
    except Exception as e:
        logger.error(f"Error parsing FIX message: {e}")
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": f"Failed to parse FIX message: {str(e)}",
                    "details": {}
                }
            }
        )

# FIX validate endpoint
@app.post("/fix/validate", response_model=ValidateResponse)
async def validate_fix_message(request: ValidateRequest):
    """Validate a FIX message against specifications."""
    try:
        # Convert | to SOH for internal processing
        fix_soh = normalize_delims(request.raw_fix, to_soh=True)
        
        # Parse first to get message type
        fields = parse_fix(fix_soh)
        msg_type = fields.get("35")
        
        if not msg_type:
            return ValidateResponse(
                ok=False,
                errors=[{"field": "35", "message": "Missing MsgType"}]
            )
        
        # Validate message
        result = validate_fix(msg_type, fields)
        
        # Convert errors to structured format
        errors = None
        if not result["ok"]:
            errors = [{"message": error} for error in result["errors"]]
        
        return ValidateResponse(ok=result["ok"], errors=errors)
    
    except Exception as e:
        logger.error(f"Error validating FIX message: {e}")
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": f"Failed to validate FIX message: {str(e)}",
                    "details": {}
                }
            }
        )

# FIX explain endpoint
@app.post("/fix/explain", response_model=ExplainResponse)
async def explain_fix_message(request: ExplainRequest):
    """Explain a FIX message in human-readable terms."""
    try:
        # Convert | to SOH for internal processing
        fix_soh = normalize_delims(request.raw_fix, to_soh=True)
        
        # Parse and explain message
        fields = parse_fix(fix_soh)
        result = explain_exec_report(fields)
        
        return ExplainResponse(explanation=result["summary"])
    
    except Exception as e:
        logger.error(f"Error explaining FIX message: {e}")
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": f"Failed to explain FIX message: {str(e)}",
                    "details": {}
                }
            }
        )

# FIX lookup endpoint
@app.get("/fix/lookup", response_model=LookupResponse)
async def lookup_fix_field(tag: str, fix_version: FixVersion = DEFAULT_FIX_VERSION):
    """Look up FIX field information by tag."""
    try:
        # Look up field
        field_info = lookup_tag(tag)
        
        if not field_info:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": f"Field with tag {tag} not found",
                        "details": {}
                    }
                }
            )
        
        # Extract required information
        return LookupResponse(
            tag=tag,
            name=field_info.get("name", "Unknown"),
            type=field_info.get("type", "Unknown"),
            requiredFor=field_info.get("requiredFor", []),
            description=field_info.get("description", "No description available")
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error looking up FIX field: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": f"Failed to lookup FIX field: {str(e)}",
                    "details": {}
                }
            }
        )
