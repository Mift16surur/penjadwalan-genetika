from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from server.app.api.deps import get_db
from server.app.services.seeder import seed_master_data, seed_demo_academic_data

router = APIRouter()

@router.post("/master")
def seed_master(db: Session = Depends(get_db)):
    """Seed data master dasar: Hari, Shift, Slot 50 menit, Aturan GA, Fakultas, Ruang."""
    return seed_master_data(db)

@router.post("/academic-demo")
def seed_academic(db: Session = Depends(get_db)):
    """Seed data simulasi akademik: Dosen, Matkul, Rombel, Tim Pengampu."""
    return seed_demo_academic_data(db)

