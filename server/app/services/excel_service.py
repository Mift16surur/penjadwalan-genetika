import io
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from typing import Dict, Any, List, Tuple
from sqlalchemy.orm import Session
import uuid

from server.app.models import (
    Fakultas, Prodi, Ruangan, Dosen, MataKuliah, Kelas, PengampuKelas,
    SemesterPeriode, VersiJadwal, Jadwal, Hari, SlotWaktu
)
from server.app.models.enums import (
    JenisRuangan, JenisMataKuliah, StatusKelas, PeranDosen
)

# Styling helpers
HEADER_FILL = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid") # Dark Blue
HEADER_FONT = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
SECTION_FILL = PatternFill(start_color="DBEAFE", end_color="DBEAFE", fill_type="solid") # Light Blue
THIN_BORDER = Border(
    left=Side(style='thin', color='D1D5DB'),
    right=Side(style='thin', color='D1D5DB'),
    top=Side(style='thin', color='D1D5DB'),
    bottom=Side(style='thin', color='D1D5DB')
)

def create_schedule_import_template() -> io.BytesIO:
    """Membuat file template Excel (.xlsx) dengan 5 sheet siap diisi oleh Admin/BAA."""
    wb = openpyxl.Workbook()

    # 1. Sheet Petunjuk
    ws_guide = wb.active
    ws_guide.title = "Petunjuk Pengisian"
    ws_guide.views.sheetView[0].showGridLines = True

    instructions = [
        ("PANDUAN PENGISIAN TEMPLATE DATA PENJADWALAN KULIAH (GA)", True),
        ("", False),
        ("1. Sheet 'Fakultas & Prodi': Masukkan daftar fakultas dan program studi yang aktif.", False),
        ("2. Sheet 'Ruangan': Masukkan daftar ruangan, kapasitas kursi, dan jenis ruang (KELAS, LABORATORIUM, GAZEBO, AULA).", False),
        ("   - Catatan: Mata kuliah praktikum hanya akan dialokasikan pada jenis 'LABORATORIUM'.", False),
        ("3. Sheet 'Dosen': Masukkan data dosen pengampu beserta kode prodi *homebase*.", False),
        ("4. Sheet 'Mata Kuliah & Kelas':", False),
        ("   - Masukkan mata kuliah, SKS, dan kelas rombel (misal: IF-1A, IF-1B).", False),
        ("   - Jenis mata kuliah pilih: TEORI atau PRAKTIK.", False),
        ("   - Untuk Tim Teaching (2 dosen), isi kolom 'Dosen Pengampu 1' dan 'Dosen Pengampu 2'.", False),
        ("5. Jangan mengubah nama sheet dan nama kolom pada baris judul (header).", False),
    ]

    for row_idx, (text, is_bold) in enumerate(instructions, start=1):
        cell = ws_guide.cell(row=row_idx, column=1, value=text)
        if is_bold:
            cell.font = Font(name="Calibri", size=14, bold=True, color="1E3A8A")
        else:
            cell.font = Font(name="Calibri", size=11)
    ws_guide.column_dimensions['A'].width = 80

    # Helper function to style headers
    def apply_header_styles(ws, headers):
        ws.views.sheetView[0].showGridLines = True
        for col_idx, h in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=col_idx, value=h)
            cell.fill = HEADER_FILL
            cell.font = HEADER_FONT
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.border = THIN_BORDER
        ws.row_dimensions[1].height = 28

    # 2. Sheet Fakultas & Prodi
    ws_prodi = wb.create_sheet("Fakultas & Prodi")
    prodi_headers = ["Kode Fakultas", "Nama Fakultas", "Kode Prodi", "Nama Prodi", "Jenjang (S1/D3/S2)"]
    apply_header_styles(ws_prodi, prodi_headers)
    sample_prodis = [
        ("FST", "Fakultas Sains dan Teknologi", "IF", "Informatika", "S1"),
        ("FST", "Fakultas Sains dan Teknologi", "SI", "Sistem Informasi", "S1"),
        ("FSEH", "Fakultas Sosial, Ekonomi, dan Humaniora", "MAN", "Manajemen", "S1"),
        ("FSEH", "Fakultas Sosial, Ekonomi, dan Humaniora", "AKT", "Akuntansi", "S1"),
        ("FAI", "Fakultas Agama Islam", "PAI", "Pendidikan Agama Islam", "S1"),
    ]
    for r_idx, row in enumerate(sample_prodis, start=2):
        for c_idx, val in enumerate(row, start=1):
            cell = ws_prodi.cell(row=r_idx, column=c_idx, value=val)
            cell.border = THIN_BORDER

    # 3. Sheet Ruangan
    ws_room = wb.create_sheet("Ruangan")
    room_headers = ["Kode Ruang", "Nama Ruang", "Gedung", "Lantai", "Kapasitas (Kursi)", "Jenis Ruangan (KELAS/LABORATORIUM/GAZEBO/AULA)"]
    apply_header_styles(ws_room, room_headers)
    sample_rooms = [
        ("R101", "Ruang 101", "Gedung A", 1, 45, "KELAS"),
        ("R102", "Ruang 102", "Gedung A", 1, 45, "KELAS"),
        ("R201", "Ruang 201", "Gedung A", 2, 40, "KELAS"),
        ("LAB-KOM-1", "Laboratorium Komputer 1", "Gedung B", 1, 35, "LABORATORIUM"),
        ("LAB-KOM-2", "Laboratorium Komputer 2", "Gedung B", 1, 35, "LABORATORIUM"),
        ("GAZ-1", "Gazebo 1", "Area Terbuka", 1, 30, "GAZEBO"),
        ("AULA-UTAMA", "Aula Utama", "Gedung Rektorat", 3, 100, "AULA"),
    ]
    for r_idx, row in enumerate(sample_rooms, start=2):
        for c_idx, val in enumerate(row, start=1):
            cell = ws_room.cell(row=r_idx, column=c_idx, value=val)
            cell.border = THIN_BORDER

    # 4. Sheet Dosen
    ws_lecturer = wb.create_sheet("Dosen")
    lec_headers = ["NIDN", "NIP", "Nama Dosen", "Gelar Depan", "Gelar Belakang", "Email", "Kode Prodi Homebase"]
    apply_header_styles(ws_lecturer, lec_headers)
    sample_lecturers = [
        ("0010018501", "", "Ahmad Fauzi", "Dr.", "M.Kom.", "ahmad.fauzi@unu.ac.id", "IF"),
        ("0022039002", "", "Siti Rahmawati", "", "M.Cs.", "siti.rahmawati@unu.ac.id", "IF"),
        ("0015078801", "", "Budi Santoso", "", "M.T.", "budi.santoso@unu.ac.id", "IF"),
        ("0008128902", "", "Nurul Hidayah", "", "M.Kom.", "nurul.hidayah@unu.ac.id", "IF"),
        ("0025068201", "", "Hendra Wijaya", "Dr.", "M.M.", "hendra.wijaya@unu.ac.id", "MAN"),
        ("0019049103", "", "Dewi Lestari", "", "M.S.M.", "dewi.lestari@unu.ac.id", "MAN"),
        ("0011088701", "", "Agus Pratama", "", "M.E.", "agus.pratama@unu.ac.id", "MAN"),
    ]
    for r_idx, row in enumerate(sample_lecturers, start=2):
        for c_idx, val in enumerate(row, start=1):
            cell = ws_lecturer.cell(row=r_idx, column=c_idx, value=val)
            cell.border = THIN_BORDER

    # 5. Sheet Mata Kuliah & Kelas Rombel
    ws_classes = wb.create_sheet("Mata Kuliah & Kelas")
    class_headers = [
        "Kode Matkul", "Nama Mata Kuliah", "Total SKS", "Jenis (TEORI/PRAKTIK)", "Kode Prodi",
        "Kode Kelas Rombel", "Nama Kelas", "Semester Ke", "Jumlah Mahasiswa",
        "Dosen Pengampu 1 (Nama/NIDN)", "Dosen Pengampu 2 (Nama/NIDN - Opsional)"
    ]
    apply_header_styles(ws_classes, class_headers)
    sample_classes = [
        ("IF101", "Algoritma & Pemrograman", 3, "PRAKTIK", "IF", "IF-1A", "Algoritma Pemrograman - Kelas 1A", 1, 32, "Ahmad Fauzi", "Siti Rahmawati"),
        ("IF101", "Algoritma & Pemrograman", 3, "PRAKTIK", "IF", "IF-1B", "Algoritma Pemrograman - Kelas 1B", 1, 30, "Ahmad Fauzi", "Siti Rahmawati"),
        ("IF102", "Basis Data", 3, "PRAKTIK", "IF", "IF-1A", "Basis Data - Kelas 1A", 1, 34, "Budi Santoso", "Nurul Hidayah"),
        ("IF102", "Basis Data", 3, "PRAKTIK", "IF", "IF-1B", "Basis Data - Kelas 1B", 1, 32, "Budi Santoso", "Nurul Hidayah"),
        ("IF104", "Kecerdasan Buatan", 3, "TEORI", "IF", "IF-3A", "Kecerdasan Buatan - Kelas 3A", 3, 38, "Ahmad Fauzi", ""),
        ("MN101", "Pengantar Manajemen", 3, "TEORI", "MAN", "MN-1A", "Pengantar Manajemen - Kelas 1A", 1, 42, "Hendra Wijaya", "Dewi Lestari"),
        ("MN101", "Pengantar Manajemen", 3, "TEORI", "MAN", "MN-1B", "Pengantar Manajemen - Kelas 1B", 1, 40, "Hendra Wijaya", "Dewi Lestari"),
        ("MN102", "Akuntansi Manajemen", 3, "TEORI", "MAN", "MN-1A", "Akuntansi Manajemen - Kelas 1A", 1, 38, "Agus Pratama", ""),
        ("MN103", "Pemasaran Digital", 2, "TEORI", "MAN", "MN-3A", "Pemasaran Digital - Kelas 3A", 3, 35, "Dewi Lestari", ""),
    ]
    for r_idx, row in enumerate(sample_classes, start=2):
        for c_idx, val in enumerate(row, start=1):
            cell = ws_classes.cell(row=r_idx, column=c_idx, value=val)
            cell.border = THIN_BORDER

    # Auto-adjust column widths for all sheets
    for ws in [ws_prodi, ws_room, ws_lecturer, ws_classes]:
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output


def import_excel_data(db: Session, file_contents: bytes, semester_periode_id: uuid.UUID) -> Dict[str, Any]:
    """Mengimpor data dari file Excel yang diunggah ke database."""
    wb = openpyxl.load_workbook(io.BytesIO(file_contents), data_only=True)
    report = {
        "status": "success",
        "fakultas_count": 0,
        "prodi_count": 0,
        "ruangan_count": 0,
        "dosen_count": 0,
        "mata_kuliah_count": 0,
        "kelas_count": 0,
        "errors": []
    }

    # 1. Impor Fakultas & Prodi
    if "Fakultas & Prodi" in wb.sheetnames:
        ws = wb["Fakultas & Prodi"]
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row or not row[0] or not row[2]:
                continue
            f_kode, f_nama, p_kode, p_nama, jenjang = str(row[0]).strip(), str(row[1] or row[0]).strip(), str(row[2]).strip(), str(row[3] or row[2]).strip(), str(row[4] or "S1").strip()
            
            fak = db.query(Fakultas).filter(Fakultas.kode == f_kode).first()
            if not fak:
                fak = Fakultas(kode=f_kode, nama=f_nama, aktif=True)
                db.add(fak)
                db.flush()
                report["fakultas_count"] += 1

            prodi = db.query(Prodi).filter(Prodi.kode == p_kode).first()
            if not prodi:
                prodi = Prodi(fakultas_id=fak.id, kode=p_kode, nama=p_nama, jenjang=jenjang, aktif=True)
                db.add(prodi)
                db.flush()
                report["prodi_count"] += 1
        db.commit()

    # 2. Impor Ruangan
    if "Ruangan" in wb.sheetnames:
        ws = wb["Ruangan"]
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row or not row[0]:
                continue
            r_kode = str(row[0]).strip()
            r_nama = str(row[1] or r_kode).strip()
            gedung = str(row[2] or "").strip()
            lantai = int(row[3]) if row[3] and str(row[3]).isdigit() else 1
            kapasitas = int(row[4]) if row[4] and str(row[4]).isdigit() else 40
            
            jns_str = str(row[5] or "KELAS").upper().strip()
            try:
                jns = JenisRuangan(jns_str)
            except ValueError:
                jns = JenisRuangan.KELAS

            ruang = db.query(Ruangan).filter(Ruangan.kode == r_kode).first()
            if not ruang:
                ruang = Ruangan(
                    kode=r_kode, nama=r_nama, gedung=gedung, lantai=lantai,
                    kapasitas=kapasitas, jenis=jns, dapat_digunakan_bersama=True, aktif=True
                )
                db.add(ruang)
                report["ruangan_count"] += 1
            else:
                ruang.nama = r_nama
                ruang.kapasitas = kapasitas
                ruang.jenis = jns
        db.commit()

    # 3. Impor Dosen
    dosen_lookup = {}
    if "Dosen" in wb.sheetnames:
        ws = wb["Dosen"]
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row or not row[2]:
                continue
            nidn = str(row[0]).strip() if row[0] else None
            nip = str(row[1]).strip() if row[1] else None
            nama = str(row[2]).strip()
            gelar_dpn = str(row[3]).strip() if row[3] else None
            gelar_blk = str(row[4]).strip() if row[4] else None
            email = str(row[5]).strip() if row[5] else None
            p_kode = str(row[6]).strip() if row[6] else None

            p_id = None
            if p_kode:
                prodi = db.query(Prodi).filter(Prodi.kode == p_kode).first()
                if prodi:
                    p_id = prodi.id

            dosen = None
            if nidn:
                dosen = db.query(Dosen).filter(Dosen.nidn == nidn).first()
            if not dosen:
                dosen = db.query(Dosen).filter(Dosen.nama == nama).first()

            if not dosen:
                dosen = Dosen(
                    nidn=nidn, nip=nip, nama=nama, gelar_depan=gelar_dpn,
                    gelar_belakang=gelar_blk, email=email, prodi_id=p_id, aktif=True
                )
                db.add(dosen)
                db.flush()
                report["dosen_count"] += 1
            dosen_lookup[nama.lower()] = dosen
            if nidn:
                dosen_lookup[nidn] = dosen
        db.commit()

    # 4. Impor Mata Kuliah & Kelas Rombel
    if "Mata Kuliah & Kelas" in wb.sheetnames:
        ws = wb["Mata Kuliah & Kelas"]
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row or not row[0] or not row[5]:
                continue
            mk_kode = str(row[0]).strip()
            mk_nama = str(row[1] or mk_kode).strip()
            sks = int(row[2]) if row[2] and str(row[2]).isdigit() else 2
            jns_str = str(row[3] or "TEORI").upper().strip()
            p_kode = str(row[4]).strip() if row[4] else "IF"
            
            k_kode = str(row[5]).strip()
            k_nama = str(row[6] or f"{mk_nama} - {k_kode}").strip()
            smst = int(row[7]) if row[7] and str(row[7]).isdigit() else 1
            jml_mhs = int(row[8]) if row[8] and str(row[8]).isdigit() else 30

            dosen_1_raw = str(row[9]).strip() if len(row) > 9 and row[9] else None
            dosen_2_raw = str(row[10]).strip() if len(row) > 10 and row[10] else None

            jns_mk = JenisMataKuliah.PRAKTIK if "PRAKTIK" in jns_str else JenisMataKuliah.TEORI
            prodi = db.query(Prodi).filter(Prodi.kode == p_kode).first()
            prodi_id = prodi.id if prodi else db.query(Prodi).first().id

            mk = db.query(MataKuliah).filter(MataKuliah.kode == mk_kode).first()
            if not mk:
                mk = MataKuliah(
                    kode=mk_kode, nama=mk_nama, sks=sks,
                    teori_sks=sks if jns_mk == JenisMataKuliah.TEORI else 0,
                    praktik_sks=sks if jns_mk == JenisMataKuliah.PRAKTIK else 0,
                    jenis=jns_mk, prodi_id=prodi_id, aktif=True
                )
                db.add(mk)
                db.flush()
                report["mata_kuliah_count"] += 1

            # Kelas
            kelas = db.query(Kelas).filter(
                Kelas.kode_kelas == k_kode,
                Kelas.semester_periode_id == semester_periode_id,
                Kelas.mata_kuliah_id == mk.id
            ).first()

            if not kelas:
                kelas = Kelas(
                    kode_kelas=k_kode,
                    nama_kelas=k_nama,
                    mata_kuliah_id=mk.id,
                    prodi_id=prodi_id,
                    semester_periode_id=semester_periode_id,
                    semester_ke=smst,
                    jumlah_mahasiswa=jml_mhs,
                    sks=sks,
                    jenis=jns_mk,
                    status=StatusKelas.ACTIVE
                )
                db.add(kelas)
                db.flush()
                report["kelas_count"] += 1

                # Link pengampu dosen 1 & 2
                pengampus = []
                for p_raw, peran in [(dosen_1_raw, PeranDosen.UTAMA), (dosen_2_raw, PeranDosen.ANGGOTA)]:
                    if p_raw:
                        d_obj = dosen_lookup.get(p_raw) or dosen_lookup.get(p_raw.lower())
                        if not d_obj:
                            # Cari via partial match nama
                            d_obj = db.query(Dosen).filter(Dosen.nama.ilike(f"%{p_raw}%")).first()
                        if d_obj:
                            pengampus.append((d_obj, peran))

                for idx, (d_obj, peran) in enumerate(pengampus, start=1):
                    pengampu = PengampuKelas(
                        kelas_id=kelas.id,
                        dosen_id=d_obj.id,
                        peran=peran,
                        prioritas=idx
                    )
                    db.add(pengampu)
        db.commit()

    return report


def export_schedule_to_excel(db: Session, versi_id: uuid.UUID) -> io.BytesIO:
    """Mengekspor jadwal perkuliahan versi terpilih ke format Excel (.xlsx) dengan multi-sheet."""
    versi = db.query(VersiJadwal).filter(VersiJadwal.id == versi_id).first()
    if not versi:
        raise ValueError("Versi jadwal tidak ditemukan.")

    wb = openpyxl.Workbook()

    # 1. Sheet Matriks Per Ruangan
    ws_matrix = wb.active
    ws_matrix.title = "Matriks Ruangan"
    ws_matrix.views.sheetView[0].showGridLines = True

    # Header title
    title_cell = ws_matrix.cell(row=1, column=1, value=f"JADWAL PERKULIAHAN UNIVERSITAS NAHDLATUL ULAMA - {versi.nama}")
    title_cell.font = Font(name="Calibri", size=14, bold=True, color="1E3A8A")

    hari_list = db.query(Hari).order_by(Hari.id).all()
    slot_list = db.query(SlotWaktu).order_by(SlotWaktu.nomor).all()
    ruangan_list = db.query(Ruangan).filter(Ruangan.aktif == True).order_by(Ruangan.kode).all()

    # Headers: Hari, Slot, Ruang 1, Ruang 2, ...
    headers = ["Hari", "Slot", "Waktu"] + [f"{r.kode}\n({r.kapasitas} krs)" for r in ruangan_list]
    for c_idx, h in enumerate(headers, start=1):
        cell = ws_matrix.cell(row=3, column=c_idx, value=h)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = THIN_BORDER
    ws_matrix.row_dimensions[3].height = 32

    # Map jadwal: {(ruangan_id, hari_id, slot_nomor): text}
    jadwal_map = {}
    for item in versi.jadwal_list:
        kls_name = item.kelas.nama_kelas if item.kelas else "Kelas"
        dosen_names = ", ".join([p.dosen.nama for p in item.kelas.pengampu_list if p.dosen]) if item.kelas else ""
        desc = f"{kls_name}\n({dosen_names})"
        for s_no in range(item.slot_mulai.nomor, item.slot_mulai.nomor + item.durasi_slot):
            jadwal_map[(item.ruangan_id, item.hari_id, s_no)] = desc

    cur_row = 4
    for h in hari_list:
        for s in slot_list:
            waktu_str = f"{s.jam_mulai.strftime('%H:%M')}-{s.jam_selesai.strftime('%H:%M')}"
            ws_matrix.cell(row=cur_row, column=1, value=h.nama).border = THIN_BORDER
            ws_matrix.cell(row=cur_row, column=2, value=s.nomor).border = THIN_BORDER
            ws_matrix.cell(row=cur_row, column=3, value=waktu_str).border = THIN_BORDER

            for r_idx, r in enumerate(ruangan_list, start=4):
                val = jadwal_map.get((r.id, h.id, s.nomor), "")
                cell = ws_matrix.cell(row=cur_row, column=r_idx, value=val)
                cell.border = THIN_BORDER
                cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
                if val:
                    cell.fill = SECTION_FILL
            cur_row += 1

    # 2. Sheet Detail Penjadwalan
    ws_detail = wb.create_sheet("Daftar Kelas Terjadwal")
    detail_headers = ["No", "Hari", "Jam Mulai", "Jam Selesai", "Ruangan", "Gedung", "Kode Kelas", "Nama Mata Kuliah", "SKS", "Dosen Pengampu", "Jumlah Peserta"]
    for c_idx, h in enumerate(detail_headers, start=1):
        cell = ws_detail.cell(row=1, column=c_idx, value=h)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.border = THIN_BORDER
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for idx, item in enumerate(versi.jadwal_list, start=1):
        row_num = idx + 1
        dosen_names = ", ".join([p.dosen.nama_lengkap for p in item.kelas.pengampu_list if p.dosen]) if item.kelas else ""
        end_slot_nomor = item.slot_mulai.nomor + item.durasi_slot - 1
        end_slot = db.query(SlotWaktu).filter(SlotWaktu.nomor == end_slot_nomor).first()
        jam_selesai_str = end_slot.jam_selesai.strftime('%H:%M') if end_slot else "-"

        row_vals = [
            idx,
            item.hari.nama if item.hari else "-",
            item.slot_mulai.jam_mulai.strftime('%H:%M') if item.slot_mulai else "-",
            jam_selesai_str,
            item.ruangan.nama if item.ruangan else "-",
            item.ruangan.gedung if item.ruangan else "-",
            item.kelas.kode_kelas if item.kelas else "-",
            item.kelas.mata_kuliah.nama if item.kelas and item.kelas.mata_kuliah else "-",
            item.kelas.sks if item.kelas else "-",
            dosen_names,
            item.kelas.jumlah_mahasiswa if item.kelas else "-"
        ]
        for c_idx, val in enumerate(row_vals, start=1):
            c = ws_detail.cell(row=row_num, column=c_idx, value=val)
            c.border = THIN_BORDER

    # Auto adjust column widths
    for ws in [ws_matrix, ws_detail]:
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = min(max(max_len + 4, 12), 35)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output

