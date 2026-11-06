from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


def make_engine(url: str):
    if url.startswith("sqlite"):
        kwargs = {"connect_args": {"check_same_thread": False}}
        if ":memory:" in url or url == "sqlite://":
            kwargs["poolclass"] = StaticPool
        return create_engine(url, **kwargs)
    return create_engine(url, pool_pre_ping=True)


engine = make_engine(get_settings().database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


DEFAULT_PROJECT_NAME = "Default Project"


def init_db() -> None:
    from app.models import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _migrate_projects()


def _migrate_projects() -> None:
    """Add test_packs.project_id to databases created before projects existed and
    move every existing pack into a default project."""
    import uuid

    from sqlalchemy import inspect, select, text, update

    from app.models.models import PackRow, ProjectRow

    if "project_id" not in {c["name"] for c in inspect(engine).get_columns("test_packs")}:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE test_packs ADD COLUMN project_id VARCHAR(36) DEFAULT ''"))
    with SessionLocal() as db:
        default = db.execute(select(ProjectRow).order_by(ProjectRow.created_at)).scalars().first()
        orphans = db.execute(select(PackRow.id).where((PackRow.project_id == "") | (PackRow.project_id.is_(None)))).first()
        if default is None and orphans:
            default = ProjectRow(id=str(uuid.uuid4()), name=DEFAULT_PROJECT_NAME, code="DEFAULT",
                                 description="Created automatically for existing test packs.")
            db.add(default)
            db.flush()
        if default is not None and orphans:
            db.execute(update(PackRow).where((PackRow.project_id == "") | (PackRow.project_id.is_(None))).values(project_id=default.id))
        db.commit()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
