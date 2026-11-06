from server.app.core.database import SessionLocal
from server.app.api.v1.endpoints import master, academic, constraints, ga

def test_endpoints():
    db = SessionLocal()
    try:
        print("=== 1. Master Data Endpoints ===")
        faculties = master.get_faculties(db)
        print("Fakultas:", [f.kode for f in faculties])

        rooms = master.get_rooms(db)
        print(f"Total Ruangan: {len(rooms)}")

        shifts = master.get_shifts(db)
        print("Shifts:", [s.nama for s in shifts])

        slots = master.get_time_slots(db)
        print(f"Total Slot Waktu (50m): {len(slots)}")

        print("\n=== 2. Academic Endpoints ===")
        lecturers = academic.get_lecturers(None, db)
        print(f"Total Dosen: {len(lecturers)}")
        for l in lecturers[:3]:
            print(f" - {l.nama_lengkap}")

        classes = academic.get_classes(None, None, db)
        print(f"Total Kelas: {len(classes)}")
        for c in classes[:3]:
            print(f" - {c.nama_kelas} ({c.sks} SKS, {c.jumlah_mahasiswa} Mhs)")

        print("\n=== 3. Constraints & Rules Endpoints ===")
        rules = constraints.get_rules(db)
        print(f"Total Rules: {len(rules)}")
        for r in rules:
            print(f" - [{r.tipe.value}] {r.kode}: Bobot {r.bobot}")

        print("\n=== 4. GA Versions & Schedule Matrix ===")
        versions = ga.list_schedule_versions(None, db)
        print(f"Versi Jadwal Tersimpan: {len(versions)}")
        if versions:
            best_v = versions[0]
            v_detail = ga.get_schedule_version_detail(best_v.id, db)
            print(f"Detail Versi: {v_detail.nama}")
            print(f"Fitness Score: {v_detail.fitness_score}")
            print(f"Jumlah Pelanggaran: {v_detail.jumlah_pelanggaran}")
            print(f"Jumlah Sesi Terjadwal: {len(v_detail.jadwal_list)}")

            print("\nPreview Sesi Terjadwal:")
            for item in v_detail.jadwal_list[:5]:
                print(f" * {item.kelas.nama_kelas} -> {item.ruangan.nama} | Hari {item.hari.nama} Slot {item.slot_mulai.nomor} ({item.durasi_slot} slot)")

        print("\n=== 5. Excel Template & Import / Export ===")
        from server.app.services.excel_service import (
            create_schedule_import_template, import_excel_data, export_schedule_to_excel
        )
        from server.app.models import SemesterPeriode

        template_stream = create_schedule_import_template()
        print(f"Template Excel berhasil di-generate! Ukuran: {len(template_stream.getvalue())} bytes")

        periode = db.query(SemesterPeriode).first()
        report = import_excel_data(db, template_stream.getvalue(), periode.id)
        print("Laporan Impor Excel:", report)

        export_stream = export_schedule_to_excel(db, best_v.id)
        print(f"Ekspor Jadwal Excel berhasil! Ukuran: {len(export_stream.getvalue())} bytes")

        print("\n=== 6. Matrix Grid Visualisasi (Frontend Ready) ===")
        m_room = ga.get_schedule_matrix(best_v.id, "room", None, db)
        print(f"Matriks Ruang: {len(m_room['columns'])} kolom ruangan, {len(m_room['cells'])} sel perkuliahan terisi.")

        m_lec = ga.get_schedule_matrix(best_v.id, "lecturer", None, db)
        print(f"Matriks Dosen: {len(m_lec['columns'])} kolom dosen, {len(m_lec['cells'])} sel perkuliahan terisi.")

        m_cls = ga.get_schedule_matrix(best_v.id, "class", None, db)
        print(f"Matriks Kelas: {len(m_cls['columns'])} kolom kelas rombel, {len(m_cls['cells'])} sel perkuliahan terisi.")

        print("\n>>> ALL DIRECT ENDPOINT & EXCEL TESTS PASSED SUCCESSFULLY! <<<")
    finally:
        db.close()

if __name__ == "__main__":
    test_endpoints()

