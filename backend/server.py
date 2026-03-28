from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import io
import base64
import uuid
import logging
import secrets
import bcrypt
import jwt
import numpy as np
import cv2
import tensorflow as tf
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, APIRouter, Request, UploadFile, File, HTTPException, Depends
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from bson import ObjectId
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as RLImage, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_ALGORITHM = "HS256"

def get_jwt_secret():
    return os.environ["JWT_SECRET"]

# Load TF model
MODEL_PATH = ROOT_DIR / "model.keras"
model = None
try:
    model = tf.keras.models.load_model(str(MODEL_PATH))
    logging.info("TensorFlow model loaded successfully")
except Exception as e:
    logging.error(f"Failed to load model: {e}")

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ─── Auth Helpers ───
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=120), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ─── Auth Models ───
class RegisterInput(BaseModel):
    name: str
    email: str
    password: str

class LoginInput(BaseModel):
    email: str
    password: str

# ─── Auth Routes ───
@api_router.post("/auth/register")
async def register(input_data: RegisterInput, request: Request):
    from fastapi.responses import JSONResponse
    email = input_data.email.strip().lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = hash_password(input_data.password)
    user_doc = {
        "name": input_data.name,
        "email": email,
        "password_hash": hashed,
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response = JSONResponse(content={"id": user_id, "name": input_data.name, "email": email, "role": "user"})
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=7200, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return response

@api_router.post("/auth/login")
async def login(input_data: LoginInput, request: Request):
    from fastapi.responses import JSONResponse
    email = input_data.email.strip().lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    # Brute force check
    attempt = await db.login_attempts.find_one({"identifier": identifier}, {"_id": 0})
    if attempt and attempt.get("count", 0) >= 5:
        locked_until = attempt.get("locked_until")
        if locked_until and datetime.now(timezone.utc).isoformat() < locked_until:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")
        else:
            await db.login_attempts.delete_one({"identifier": identifier})
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(input_data.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}},
            upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await db.login_attempts.delete_one({"identifier": identifier})
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response = JSONResponse(content={"id": user_id, "name": user.get("name", ""), "email": email, "role": user.get("role", "user")})
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=7200, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return response

@api_router.post("/auth/logout")
async def logout():
    from fastapi.responses import JSONResponse
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return response

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@api_router.post("/auth/refresh")
async def refresh_token(request: Request):
    from fastapi.responses import JSONResponse
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user_id = str(user["_id"])
        access_token = create_access_token(user_id, user["email"])
        response = JSONResponse(content={"message": "Token refreshed"})
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=7200, path="/")
        return response
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ─── Grad-CAM ───
def generate_gradcam(img_array, model_ref):
    last_conv_layer = model_ref.get_layer("conv2d_2")
    grad_model = tf.keras.Model(
        inputs=model_ref.input,
        outputs=[last_conv_layer.output, model_ref.output]
    )
    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(img_array)
        loss = predictions[:, 0]
    grads = tape.gradient(loss, conv_outputs)
    if grads is None:
        return None
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    conv_outputs = conv_outputs[0]
    heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)
    heatmap = tf.maximum(heatmap, 0) / (tf.math.reduce_max(heatmap) + 1e-8)
    return heatmap.numpy()

def overlay_heatmap(original_img, heatmap, alpha=0.4):
    heatmap_resized = cv2.resize(heatmap, (original_img.shape[1], original_img.shape[0]))
    heatmap_colored = cv2.applyColorMap(np.uint8(255 * heatmap_resized), cv2.COLORMAP_JET)
    heatmap_colored = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)
    overlay = np.uint8(alpha * heatmap_colored + (1 - alpha) * original_img)
    return overlay

# ─── Predict Endpoint ───
@api_router.post("/predict")
async def predict(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a JPEG, PNG, or WebP image.")
    
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image")
    
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img_resized = cv2.resize(img_rgb, (224, 224))
    img_array = np.expand_dims(img_resized / 255.0, axis=0).astype(np.float32)
    
    prediction = model.predict(img_array, verbose=0)
    probability = float(prediction[0][0])
    
    # Generate heatmap
    heatmap_data = None
    try:
        heatmap = generate_gradcam(img_array, model)
        if heatmap is not None:
            overlay = overlay_heatmap(img_resized, heatmap)
            _, buffer = cv2.imencode('.png', cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))
            heatmap_data = base64.b64encode(buffer).decode('utf-8')
    except Exception as e:
        logging.error(f"Grad-CAM error: {e}")
    
    # Encode original image
    _, orig_buffer = cv2.imencode('.png', cv2.cvtColor(img_resized, cv2.COLOR_RGB2BGR))
    original_b64 = base64.b64encode(orig_buffer).decode('utf-8')
    
    # Determine result
    if probability >= 0.7:
        result = "Positive for Tuberculosis"
        severity = "high"
    elif probability >= 0.4:
        result = "Possible TB"
        severity = "medium"
    else:
        result = "Normal"
        severity = "low"
    
    # Save scan to DB
    scan_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["_id"],
        "filename": file.filename,
        "probability": probability,
        "result": result,
        "severity": severity,
        "original_image": original_b64,
        "heatmap_image": heatmap_data,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.scans.insert_one(scan_doc)
    
    return {
        "id": scan_doc["id"],
        "probability": probability,
        "result": result,
        "severity": severity,
        "original_image": original_b64,
        "heatmap_image": heatmap_data,
        "filename": file.filename,
        "created_at": scan_doc["created_at"]
    }

# ─── Stats ───
@api_router.get("/stats")
async def get_stats(user: dict = Depends(get_current_user)):
    user_id = user["_id"]
    total = await db.scans.count_documents({"user_id": user_id})
    tb_detected = await db.scans.count_documents({"user_id": user_id, "severity": "high"})
    normal = await db.scans.count_documents({"user_id": user_id, "severity": "low"})
    possible = await db.scans.count_documents({"user_id": user_id, "severity": "medium"})
    return {"total_scans": total, "tb_detected": tb_detected, "normal_cases": normal, "possible_tb": possible}

# ─── Scan History ───
@api_router.get("/scans")
async def get_scans(user: dict = Depends(get_current_user)):
    scans = await db.scans.find(
        {"user_id": user["_id"]},
        {"_id": 0, "original_image": 0, "heatmap_image": 0}
    ).sort("created_at", -1).to_list(100)
    return scans

@api_router.get("/scans/{scan_id}")
async def get_scan(scan_id: str, user: dict = Depends(get_current_user)):
    scan = await db.scans.find_one({"id": scan_id, "user_id": user["_id"]}, {"_id": 0})
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan

# ─── PDF Report ───
@api_router.get("/report/{scan_id}")
async def generate_report(scan_id: str, patient_name: str = "Patient", patient_age: str = "N/A", patient_gender: str = "N/A", user: dict = Depends(get_current_user)):
    scan = await db.scans.find_one({"id": scan_id, "user_id": user["_id"]}, {"_id": 0})
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm, leftMargin=20*mm, rightMargin=20*mm)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('Title2', parent=styles['Title'], fontSize=20, textColor=colors.HexColor('#1a365d'), spaceAfter=10)
    subtitle_style = ParagraphStyle('Sub', parent=styles['Normal'], fontSize=11, textColor=colors.HexColor('#4a5568'), spaceAfter=6)
    heading_style = ParagraphStyle('Head', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#2d3748'), spaceBefore=14, spaceAfter=8)
    normal_style = ParagraphStyle('Norm', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#2d3748'), spaceAfter=4)
    
    elements = []
    elements.append(Paragraph("AI Tuberculosis Detection Report", title_style))
    elements.append(Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%B %d, %Y at %H:%M UTC')}", subtitle_style))
    elements.append(Spacer(1, 10))
    
    # Patient info table
    patient_data = [
        ["Patient Name:", patient_name, "Date of Scan:", scan.get("created_at", "N/A")[:10]],
        ["Age:", patient_age, "Gender:", patient_gender],
        ["Report ID:", scan.get("id", "N/A")[:8], "File:", scan.get("filename", "N/A")],
    ]
    t = Table(patient_data, colWidths=[80, 140, 80, 140])
    t.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#2d3748')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, -1), (-1, -1), 1, colors.HexColor('#e2e8f0')),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 14))
    
    # Results section
    elements.append(Paragraph("Analysis Results", heading_style))
    prob = scan.get("probability", 0)
    result_text = scan.get("result", "Unknown")
    severity = scan.get("severity", "low")
    color_map = {"high": "#e53e3e", "medium": "#dd6b20", "low": "#38a169"}
    result_color = color_map.get(severity, "#2d3748")
    
    elements.append(Paragraph(f"<b>Diagnosis:</b> <font color='{result_color}'>{result_text}</font>", normal_style))
    elements.append(Paragraph(f"<b>TB Probability:</b> {prob*100:.1f}%", normal_style))
    elements.append(Spacer(1, 10))
    
    # Images
    if scan.get("original_image"):
        elements.append(Paragraph("Chest X-Ray Image", heading_style))
        img_data = base64.b64decode(scan["original_image"])
        img_io = io.BytesIO(img_data)
        elements.append(RLImage(img_io, width=200, height=200))
        elements.append(Spacer(1, 10))
    
    if scan.get("heatmap_image"):
        elements.append(Paragraph("Grad-CAM Heatmap Visualization", heading_style))
        hm_data = base64.b64decode(scan["heatmap_image"])
        hm_io = io.BytesIO(hm_data)
        elements.append(RLImage(hm_io, width=200, height=200))
        elements.append(Spacer(1, 10))
    
    # Interpretation
    elements.append(Paragraph("Clinical Interpretation", heading_style))
    if severity == "high":
        interp = "The AI model has detected patterns strongly indicative of tuberculosis in the chest X-ray. The Grad-CAM heatmap highlights regions of concern, primarily in the lung fields. Immediate clinical correlation and further diagnostic workup (sputum test, CT scan) is recommended."
    elif severity == "medium":
        interp = "The AI model has identified some patterns that may be suggestive of tuberculosis. The confidence level is moderate. Clinical correlation is advised, and follow-up imaging or sputum testing may be warranted."
    else:
        interp = "The AI model has not detected significant patterns associated with tuberculosis in this chest X-ray. The lung fields appear within normal limits based on AI analysis. Routine follow-up is recommended as clinically indicated."
    elements.append(Paragraph(interp, normal_style))
    elements.append(Spacer(1, 14))
    elements.append(Paragraph("<i>Disclaimer: This report is generated by an AI system and should not be used as a sole diagnostic tool. Always consult a qualified medical professional for clinical decisions.</i>", ParagraphStyle('Disc', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#718096'))))
    
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=TB_Report_{scan_id[:8]}.pdf"}
    )

# ─── Admin Seeding ───
async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logging.info(f"Admin user seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logging.info("Admin password updated")

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.scans.create_index("user_id")
    await seed_admin()
    # Write test credentials
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n")
        f.write(f"## Admin\n- Email: {os.environ.get('ADMIN_EMAIL', 'admin@example.com')}\n- Password: {os.environ.get('ADMIN_PASSWORD', 'admin123')}\n- Role: admin\n\n")
        f.write("## Auth Endpoints\n- POST /api/auth/register\n- POST /api/auth/login\n- POST /api/auth/logout\n- GET /api/auth/me\n- POST /api/auth/refresh\n\n")
        f.write("## App Endpoints\n- POST /api/predict\n- GET /api/stats\n- GET /api/scans\n- GET /api/scans/{scan_id}\n- GET /api/report/{scan_id}\n")

app.include_router(api_router)

# CORS - must be after router inclusion
frontend_url = os.environ.get("FRONTEND_URL", os.environ.get("CORS_ORIGINS", "*"))
origins = [o.strip() for o in frontend_url.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
