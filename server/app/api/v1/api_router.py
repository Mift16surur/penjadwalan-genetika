from fastapi import APIRouter
from server.app.api.v1.endpoints import (
    master, academic, constraints, ga, seed, excel_io,
    auth, public, reschedule
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Autentikasi Admin"])
api_router.include_router(public.router, prefix="/public", tags=["Portal Publik & QR Code"])
api_router.include_router(reschedule.router, prefix="/reschedule", tags=["Permohonan Ganti Jadwal"])
api_router.include_router(master.router, prefix="/master", tags=["Master Data"])
api_router.include_router(academic.router, prefix="/academic", tags=["Akademik & Kelas"])
api_router.include_router(constraints.router, prefix="/constraints", tags=["Constraints & Aturan"])
api_router.include_router(ga.router, prefix="/ga", tags=["Algoritma Genetika"])
api_router.include_router(excel_io.router, prefix="/excel", tags=["Import & Export Excel"])
api_router.include_router(seed.router, prefix="/seed", tags=["Seeding Data"])



