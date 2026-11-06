from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import uuid

from server.app.api.deps import get_db
from server.app.services.excel_service import (
    create_schedule_import_template, import_excel_data
)

router = APIRouter()

@router.get("/template")
def download_excel_template():
    """
    Mengunduh Template Excel (.xlsx) dengan 5 sheet terstandarisasi untuk persiapan data jadwal:
    1. Petunjuk Pengisian
    2. Fakultas & Prodi
    3. Ruangan (Kapasitas & Jenis)
    4. Dosen
    5. Mata Kuliah & Kelas Rombel (termasuk kolom Tim Teaching 2 Dosen)
    """
    stream = create_schedule_import_template()
    filename = "Template_Data_Penjadwalan_Kuliah_UNU.xlsx"
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/upload")
async def upload_excel_data(
    file: UploadFile = File(...),
    semester_periode_id: uuid.UUID = Form(...),
    db: Session = Depends(get_db)
):
    """
    Mengunggah file Excel data perkuliahan untuk diimpor ke database.
    Format file harus mengikuti template yang diunduh dari `/api/v1/excel/template`.
    """
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Format file harus berupa Excel (.xlsx atau .xls).")

    contents = await file.read()
    try:
        result = import_excel_data(db, contents, semester_periode_id)
        return {
            "message": "Impor data berhasil diproses.",
            "report": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal memproses file Excel: {str(e)}")

