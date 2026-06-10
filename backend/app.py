from datetime import datetime
from typing import List, Optional, Dict
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Field, SQLModel, create_engine, Session, select, func
import asyncio
import json
import os

# Настройка БД (читаем переменные окружения)
MYSQL_USER = os.environ.get("MYSQL_USER", "root")
MYSQL_PASSWORD = os.environ.get("MYSQL_PASSWORD", "AVNS_BxymJJVL0CcLv9tk4sy")
MYSQL_HOST = os.environ.get("MYSQL_HOST", "localhost")
MYSQL_PORT = os.environ.get("MYSQL_PORT", "3306")
MYSQL_DB = os.environ.get("MYSQL_DB", "task_manager_db")

mysql_url = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"

# Создаем engine
engine = create_engine(
    mysql_url, 
    echo=True,
    connect_args={"ssl": {"ca": None}}
)

# ===== ФУНКЦИЯ get_session - ДОБАВЛЕНА =====
def get_session():
    with Session(engine) as session:
        yield session

# ===== Таблицы =====
class TaskBase(SQLModel):
    title: str = Field(index=True)
    description: Optional[str] = None
    status: str = Field(default="Новая")


class Task(TaskBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.now)


# ===== WebSocket Менеджер =====
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.connection_count = 0

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.connection_count += 1
        print(f"🔌 Новое WebSocket подключение. Всего: {self.connection_count}")
        
        await websocket.send_json({
            "type": "welcome",
            "message": "Connected to TaskFlow WebSocket",
            "connection_id": self.connection_count
        })

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            self.connection_count -= 1
            print(f"🔌 WebSocket отключен. Осталось: {self.connection_count}")

    async def broadcast(self, message: dict):
        if not self.active_connections:
            return
        
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                disconnected.append(connection)
        
        for conn in disconnected:
            self.disconnect(conn)

    async def broadcast_task_update(self, action: str, task_data: dict = None, task_id: int = None):
        message = {
            "type": "task_update",
            "action": action,
            "timestamp": datetime.now().isoformat()
        }
        
        if task_data:
            message["task"] = task_data
        if task_id:
            message["task_id"] = task_id
            
        await self.broadcast(message)


manager = ConnectionManager()


# ===== FastAPI =====
@asynccontextmanager
async def lifespan(app: FastAPI):
    SQLModel.metadata.create_all(engine)
    print("✅ База данных инициализирована")
    yield
    for connection in manager.active_connections:
        await connection.close()
    print("👋 Сервер остановлен")


app = FastAPI(title='Task Manager API', lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===== WebSocket Эндпоинт =====
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                message_type = message.get("type", "unknown")
                
                if message_type == "ping":
                    await websocket.send_json({"type": "pong", "timestamp": datetime.now().isoformat()})
                elif message_type == "get_stats":
                    with Session(engine) as session:
                        statement = select(Task.status, func.count(Task.id)).group_by(Task.status)
                        results = session.exec(statement).all()
                        stats = {status: int(count) for status, count in results}
                        await websocket.send_json({"type": "stats", "data": stats})
                else:
                    print(f"📨 Получено сообщение: {message_type}")
                    
            except json.JSONDecodeError:
                print(f"📨 Получен текст: {data}")
                await websocket.send_json({"type": "echo", "message": data})
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast({
            "type": "user_event",
            "event": "disconnected",
            "timestamp": datetime.now().isoformat()
        })


# ===== REST API Эндпоинты =====

@app.get("/tasks", response_model=List[Task])
def get_all_tasks(session: Session = Depends(get_session)):
    statement = select(Task)
    tasks = session.exec(statement).all()
    return tasks


@app.post("/task", response_model=Task, status_code=201)
async def create_task(task: TaskBase, session: Session = Depends(get_session)):
    db_task = Task.model_validate(task)
    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    
    await manager.broadcast_task_update(
        action="created",
        task_data={
            "id": db_task.id,
            "title": db_task.title,
            "description": db_task.description,
            "status": db_task.status,
            "created_at": db_task.created_at.isoformat() if db_task.created_at else None
        }
    )
    print(f"📨 Создана задача #{db_task.id} - {db_task.title}")
    
    return db_task


@app.put("/task/{task_id}", response_model=Task)
async def update_task(task_id: int, updated_data: TaskBase, session: Session = Depends(get_session)):
    db_task = session.get(Task, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    
    old_status = db_task.status
    data = updated_data.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(db_task, key, value)

    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    
    await manager.broadcast_task_update(
        action="updated",
        task_data={
            "id": db_task.id,
            "title": db_task.title,
            "description": db_task.description,
            "status": db_task.status,
            "old_status": old_status,
            "updated_at": datetime.now().isoformat()
        }
    )
    print(f"📨 Обновлена задача #{db_task.id} - {db_task.title}")
    
    return db_task


@app.delete("/task/{task_id}")
async def delete_task(task_id: int, session: Session = Depends(get_session)):
    db_task = session.get(Task, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    
    task_title = db_task.title
    
    session.delete(db_task)
    session.commit()
    
    await manager.broadcast_task_update(
        action="deleted",
        task_data={
            "id": task_id,
            "title": task_title
        },
        task_id=task_id
    )
    print(f"📨 Удалена задача #{task_id} - {task_title}")
    
    return {"message": f"Задача с id {task_id} удалена"}


@app.get("/tasks/stats", response_model=Dict[str, int])
def get_task_stats(session: Session = Depends(get_session)):
    statement = select(Task.status, func.count(Task.id)).group_by(Task.status)
    results = session.exec(statement).all()
    stats = {status: int(count) for status, count in results}
    return stats


@app.get("/ws/stats")
async def get_websocket_stats():
    return {
        "active_connections": len(manager.active_connections),
        "total_connections_served": manager.connection_count
    }


@app.post("/notify/all")
async def notify_all_clients(message: str = "Test notification"):
    await manager.broadcast({
        "type": "notification",
        "message": message,
        "timestamp": datetime.now().isoformat()
    })
    return {"message": f"Уведомление отправлено {len(manager.active_connections)} клиентам"}


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(websocket_heartbeat())

async def websocket_heartbeat():
    while True:
        await asyncio.sleep(30)
        if manager.active_connections:
            await manager.broadcast({
                "type": "heartbeat",
                "timestamp": datetime.now().isoformat()
            })
            print(f"💓 Heartbeat отправлен {len(manager.active_connections)} клиентам")
