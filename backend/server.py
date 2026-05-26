from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from bson import ObjectId

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"

# Password hashing functions
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

# JWT Token functions
def create_access_token(user_id: str, email: str) -> str:
    payload = {
        'sub': user_id,
        'email': email,
        'exp': datetime.now(timezone.utc) + timedelta(hours=24),
        'type': 'access'
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        'sub': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(days=7),
        'type': 'refresh'
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# Get current user dependency
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get('access_token')
    if not token:
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail='Not authenticated')
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get('type') != 'access':
            raise HTTPException(status_code=401, detail='Invalid token type')
        user = await db.users.find_one({'_id': ObjectId(payload['sub'])})
        if not user:
            raise HTTPException(status_code=401, detail='User not found')
        user['id'] = str(user['_id'])
        user.pop('_id', None)
        user.pop('password_hash', None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Token expired')
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail='Invalid token')
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

# Models
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: str

class ProjectCreate(BaseModel):
    name: str
    github_url: str
    branch: str = 'main'
    build_tool: str = 'maven'
    java_version: str = '17'
    auto_deploy: bool = False

class ProjectResponse(BaseModel):
    id: str
    name: str
    github_url: str
    branch: str
    build_tool: str
    java_version: str
    auto_deploy: bool
    status: str
    created_at: str
    last_deployed: Optional[str] = None

class DeploymentCreate(BaseModel):
    project_id: str

class DeploymentResponse(BaseModel):
    id: str
    project_id: str
    status: str
    started_at: str
    completed_at: Optional[str] = None
    logs: List[str] = []

class EnvVariableCreate(BaseModel):
    key: str
    value: str

class EnvVariableResponse(BaseModel):
    id: str
    key: str
    value: str

class DomainCreate(BaseModel):
    domain: str

class DomainResponse(BaseModel):
    id: str
    domain: str
    verified: bool
    created_at: str

# Auth Routes
@api_router.post('/auth/register', response_model=UserResponse)
async def register(data: RegisterRequest, response: Response):
    email = data.email.lower()
    existing = await db.users.find_one({'email': email})
    if existing:
        raise HTTPException(status_code=400, detail='Email already registered')
    
    password_hash = hash_password(data.password)
    user_doc = {
        'email': email,
        'name': data.name,
        'password_hash': password_hash,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(
        key='access_token',
        value=access_token,
        httponly=True,
        secure=False,
        samesite='lax',
        max_age=86400,
        path='/'
    )
    response.set_cookie(
        key='refresh_token',
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite='lax',
        max_age=604800,
        path='/'
    )
    
    return UserResponse(
        id=user_id,
        email=email,
        name=data.name,
        created_at=user_doc['created_at']
    )

@api_router.post('/auth/login', response_model=UserResponse)
async def login(data: LoginRequest, response: Response):
    email = data.email.lower()
    user = await db.users.find_one({'email': email})
    if not user or not verify_password(data.password, user['password_hash']):
        raise HTTPException(status_code=401, detail='Invalid credentials')
    
    user_id = str(user['_id'])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(
        key='access_token',
        value=access_token,
        httponly=True,
        secure=False,
        samesite='lax',
        max_age=86400,
        path='/'
    )
    response.set_cookie(
        key='refresh_token',
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite='lax',
        max_age=604800,
        path='/'
    )
    
    return UserResponse(
        id=user_id,
        email=user['email'],
        name=user['name'],
        created_at=user['created_at']
    )

@api_router.post('/auth/logout')
async def logout(response: Response):
    response.delete_cookie('access_token')
    response.delete_cookie('refresh_token')
    return {'message': 'Logged out successfully'}

@api_router.get('/auth/me', response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user['id'],
        email=current_user['email'],
        name=current_user['name'],
        created_at=current_user['created_at']
    )

# Project Routes
@api_router.post('/projects', response_model=ProjectResponse)
async def create_project(data: ProjectCreate, current_user: dict = Depends(get_current_user)):
    project_doc = {
        'user_id': current_user['id'],
        'name': data.name,
        'github_url': data.github_url,
        'branch': data.branch,
        'build_tool': data.build_tool,
        'java_version': data.java_version,
        'auto_deploy': data.auto_deploy,
        'status': 'idle',
        'created_at': datetime.now(timezone.utc).isoformat(),
        'last_deployed': None
    }
    result = await db.projects.insert_one(project_doc)
    project_id = str(result.inserted_id)
    
    return ProjectResponse(
        id=project_id,
        name=data.name,
        github_url=data.github_url,
        branch=data.branch,
        build_tool=data.build_tool,
        java_version=data.java_version,
        auto_deploy=data.auto_deploy,
        status='idle',
        created_at=project_doc['created_at']
    )

@api_router.get('/projects', response_model=List[ProjectResponse])
async def get_projects(current_user: dict = Depends(get_current_user)):
    projects = await db.projects.find({'user_id': current_user['id']}).to_list(100)
    result = []
    for p in projects:
        result.append(ProjectResponse(
            id=str(p['_id']),
            name=p['name'],
            github_url=p['github_url'],
            branch=p['branch'],
            build_tool=p['build_tool'],
            java_version=p['java_version'],
            auto_deploy=p['auto_deploy'],
            status=p['status'],
            created_at=p['created_at'],
            last_deployed=p.get('last_deployed')
        ))
    return result

@api_router.get('/projects/{project_id}', response_model=ProjectResponse)
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    try:
        project = await db.projects.find_one({'_id': ObjectId(project_id), 'user_id': current_user['id']})
    except:
        raise HTTPException(status_code=404, detail='Project not found')
    
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    
    return ProjectResponse(
        id=str(project['_id']),
        name=project['name'],
        github_url=project['github_url'],
        branch=project['branch'],
        build_tool=project['build_tool'],
        java_version=project['java_version'],
        auto_deploy=project['auto_deploy'],
        status=project['status'],
        created_at=project['created_at'],
        last_deployed=project.get('last_deployed')
    )

@api_router.delete('/projects/{project_id}')
async def delete_project(project_id: str, current_user: dict = Depends(get_current_user)):
    try:
        result = await db.projects.delete_one({'_id': ObjectId(project_id), 'user_id': current_user['id']})
    except:
        raise HTTPException(status_code=404, detail='Project not found')
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Project not found')
    
    # Also delete related data
    await db.deployments.delete_many({'project_id': project_id})
    await db.env_variables.delete_many({'project_id': project_id})
    await db.domains.delete_many({'project_id': project_id})
    
    return {'message': 'Project deleted successfully'}

# Deployment Routes
@api_router.post('/deployments', response_model=DeploymentResponse)
async def create_deployment(data: DeploymentCreate, current_user: dict = Depends(get_current_user)):
    # Verify project ownership
    try:
        project = await db.projects.find_one({'_id': ObjectId(data.project_id), 'user_id': current_user['id']})
    except:
        raise HTTPException(status_code=404, detail='Project not found')
    
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    
    # Create deployment
    deployment_doc = {
        'project_id': data.project_id,
        'status': 'building',
        'started_at': datetime.now(timezone.utc).isoformat(),
        'completed_at': None,
        'logs': [
            f"[{datetime.now(timezone.utc).strftime('%H:%M:%S')}] Starting deployment...",
            f"[{datetime.now(timezone.utc).strftime('%H:%M:%S')}] Cloning repository from {project['github_url']}",
            f"[{datetime.now(timezone.utc).strftime('%H:%M:%S')}] Branch: {project['branch']}",
            f"[{datetime.now(timezone.utc).strftime('%H:%M:%S')}] Detected {project['build_tool'].upper()} project",
            f"[{datetime.now(timezone.utc).strftime('%H:%M:%S')}] Using Java {project['java_version']}",
            f"[{datetime.now(timezone.utc).strftime('%H:%M:%S')}] Running build command...",
            f"[{datetime.now(timezone.utc).strftime('%H:%M:%S')}] Build in progress..."
        ]
    }
    result = await db.deployments.insert_one(deployment_doc)
    deployment_id = str(result.inserted_id)
    
    # Update project status
    await db.projects.update_one(
        {'_id': ObjectId(data.project_id)},
        {'$set': {'status': 'building'}}
    )
    
    return DeploymentResponse(
        id=deployment_id,
        project_id=data.project_id,
        status='building',
        started_at=deployment_doc['started_at'],
        logs=deployment_doc['logs']
    )

@api_router.get('/deployments/{deployment_id}', response_model=DeploymentResponse)
async def get_deployment(deployment_id: str, current_user: dict = Depends(get_current_user)):
    try:
        deployment = await db.deployments.find_one({'_id': ObjectId(deployment_id)})
    except:
        raise HTTPException(status_code=404, detail='Deployment not found')
    
    if not deployment:
        raise HTTPException(status_code=404, detail='Deployment not found')
    
    # Verify project ownership
    try:
        project = await db.projects.find_one({'_id': ObjectId(deployment['project_id']), 'user_id': current_user['id']})
    except:
        raise HTTPException(status_code=404, detail='Access denied')
    
    if not project:
        raise HTTPException(status_code=404, detail='Access denied')
    
    return DeploymentResponse(
        id=str(deployment['_id']),
        project_id=deployment['project_id'],
        status=deployment['status'],
        started_at=deployment['started_at'],
        completed_at=deployment.get('completed_at'),
        logs=deployment.get('logs', [])
    )

@api_router.get('/projects/{project_id}/deployments', response_model=List[DeploymentResponse])
async def get_project_deployments(project_id: str, current_user: dict = Depends(get_current_user)):
    # Verify project ownership
    try:
        project = await db.projects.find_one({'_id': ObjectId(project_id), 'user_id': current_user['id']})
    except:
        raise HTTPException(status_code=404, detail='Project not found')
    
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    
    deployments = await db.deployments.find({'project_id': project_id}).sort('started_at', -1).to_list(50)
    result = []
    for d in deployments:
        result.append(DeploymentResponse(
            id=str(d['_id']),
            project_id=d['project_id'],
            status=d['status'],
            started_at=d['started_at'],
            completed_at=d.get('completed_at'),
            logs=d.get('logs', [])
        ))
    return result

@api_router.post('/deployments/{deployment_id}/complete')
async def complete_deployment(deployment_id: str, current_user: dict = Depends(get_current_user)):
    try:
        deployment = await db.deployments.find_one({'_id': ObjectId(deployment_id)})
    except:
        raise HTTPException(status_code=404, detail='Deployment not found')
    
    if not deployment:
        raise HTTPException(status_code=404, detail='Deployment not found')
    
    # Verify project ownership
    try:
        project = await db.projects.find_one({'_id': ObjectId(deployment['project_id']), 'user_id': current_user['id']})
    except:
        raise HTTPException(status_code=404, detail='Access denied')
    
    if not project:
        raise HTTPException(status_code=404, detail='Access denied')
    
    # Simulate completion
    now = datetime.now(timezone.utc)
    new_logs = deployment['logs'] + [
        f"[{now.strftime('%H:%M:%S')}] Build completed successfully",
        f"[{now.strftime('%H:%M:%S')}] Starting application...",
        f"[{now.strftime('%H:%M:%S')}] Application deployed successfully",
        f"[{now.strftime('%H:%M:%S')}] Deployment URL: https://{project['name']}.yourplatform.com"
    ]
    
    await db.deployments.update_one(
        {'_id': ObjectId(deployment_id)},
        {'$set': {
            'status': 'success',
            'completed_at': now.isoformat(),
            'logs': new_logs
        }}
    )
    
    await db.projects.update_one(
        {'_id': ObjectId(deployment['project_id'])},
        {'$set': {
            'status': 'deployed',
            'last_deployed': now.isoformat()
        }}
    )
    
    return {'message': 'Deployment completed'}

# Environment Variables Routes
@api_router.get('/projects/{project_id}/env', response_model=List[EnvVariableResponse])
async def get_env_variables(project_id: str, current_user: dict = Depends(get_current_user)):
    # Verify project ownership
    try:
        project = await db.projects.find_one({'_id': ObjectId(project_id), 'user_id': current_user['id']})
    except:
        raise HTTPException(status_code=404, detail='Project not found')
    
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    
    env_vars = await db.env_variables.find({'project_id': project_id}).to_list(100)
    result = []
    for env in env_vars:
        result.append(EnvVariableResponse(
            id=str(env['_id']),
            key=env['key'],
            value=env['value']
        ))
    return result

@api_router.post('/projects/{project_id}/env', response_model=EnvVariableResponse)
async def create_env_variable(project_id: str, data: EnvVariableCreate, current_user: dict = Depends(get_current_user)):
    # Verify project ownership
    try:
        project = await db.projects.find_one({'_id': ObjectId(project_id), 'user_id': current_user['id']})
    except:
        raise HTTPException(status_code=404, detail='Project not found')
    
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    
    env_doc = {
        'project_id': project_id,
        'key': data.key,
        'value': data.value
    }
    result = await db.env_variables.insert_one(env_doc)
    
    return EnvVariableResponse(
        id=str(result.inserted_id),
        key=data.key,
        value=data.value
    )

@api_router.delete('/projects/{project_id}/env/{env_id}')
async def delete_env_variable(project_id: str, env_id: str, current_user: dict = Depends(get_current_user)):
    # Verify project ownership
    try:
        project = await db.projects.find_one({'_id': ObjectId(project_id), 'user_id': current_user['id']})
    except:
        raise HTTPException(status_code=404, detail='Project not found')
    
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    
    try:
        result = await db.env_variables.delete_one({'_id': ObjectId(env_id), 'project_id': project_id})
    except:
        raise HTTPException(status_code=404, detail='Environment variable not found')
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Environment variable not found')
    
    return {'message': 'Environment variable deleted'}

# Domain Routes
@api_router.get('/projects/{project_id}/domains', response_model=List[DomainResponse])
async def get_domains(project_id: str, current_user: dict = Depends(get_current_user)):
    # Verify project ownership
    try:
        project = await db.projects.find_one({'_id': ObjectId(project_id), 'user_id': current_user['id']})
    except:
        raise HTTPException(status_code=404, detail='Project not found')
    
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    
    domains = await db.domains.find({'project_id': project_id}).to_list(50)
    result = []
    for domain in domains:
        result.append(DomainResponse(
            id=str(domain['_id']),
            domain=domain['domain'],
            verified=domain['verified'],
            created_at=domain['created_at']
        ))
    return result

@api_router.post('/projects/{project_id}/domains', response_model=DomainResponse)
async def create_domain(project_id: str, data: DomainCreate, current_user: dict = Depends(get_current_user)):
    # Verify project ownership
    try:
        project = await db.projects.find_one({'_id': ObjectId(project_id), 'user_id': current_user['id']})
    except:
        raise HTTPException(status_code=404, detail='Project not found')
    
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    
    domain_doc = {
        'project_id': project_id,
        'domain': data.domain,
        'verified': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    result = await db.domains.insert_one(domain_doc)
    
    return DomainResponse(
        id=str(result.inserted_id),
        domain=data.domain,
        verified=False,
        created_at=domain_doc['created_at']
    )

@api_router.delete('/projects/{project_id}/domains/{domain_id}')
async def delete_domain(project_id: str, domain_id: str, current_user: dict = Depends(get_current_user)):
    # Verify project ownership
    try:
        project = await db.projects.find_one({'_id': ObjectId(project_id), 'user_id': current_user['id']})
    except:
        raise HTTPException(status_code=404, detail='Project not found')
    
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    
    try:
        result = await db.domains.delete_one({'_id': ObjectId(domain_id), 'project_id': project_id})
    except:
        raise HTTPException(status_code=404, detail='Domain not found')
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Domain not found')
    
    return {'message': 'Domain deleted'}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=['*'],
    allow_headers=['*'],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Startup event - seed admin user
@app.on_event('startup')
async def startup_event():
    # Create indexes
    await db.users.create_index('email', unique=True)
    
    # Seed admin
    admin_email = os.environ.get('ADMIN_EMAIL', 'admin@javahost.com')
    admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
    
    existing = await db.users.find_one({'email': admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            'email': admin_email,
            'name': 'Admin',
            'password_hash': hashed,
            'created_at': datetime.now(timezone.utc).isoformat()
        })
        logger.info(f'Admin user created: {admin_email}')
    elif not verify_password(admin_password, existing['password_hash']):
        await db.users.update_one(
            {'email': admin_email},
            {'$set': {'password_hash': hash_password(admin_password)}}
        )
        logger.info('Admin password updated')
    
    # Write test credentials
    with open('/app/memory/test_credentials.md', 'w') as f:
        f.write('# Test Credentials\n\n')
        f.write('## Admin Account\n')
        f.write(f'Email: {admin_email}\n')
        f.write(f'Password: {admin_password}\n\n')
        f.write('## Auth Endpoints\n')
        f.write('- POST /api/auth/register\n')
        f.write('- POST /api/auth/login\n')
        f.write('- POST /api/auth/logout\n')
        f.write('- GET /api/auth/me\n')

@app.on_event('shutdown')
async def shutdown_db_client():
    client.close()
