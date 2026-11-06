from typing import List, Dict, Set
from collections import defaultdict
import uuid
from server.app.engine_ga.chromosome import Chromosome, Gene, Violation
from server.app.engine_ga.context import GAContext
from server.app.models.enums import JenisRuangan, JenisMataKuliah, TipePreferensi

def evaluate_chromosome(chromosome: Chromosome, ctx: GAContext) -> Chromosome:
    """
    Mengevaluasi fitness sebuah kromosom.
    Hard constraints memberikan penalti berat.
    Soft constraints memberikan penalti terbobot.
    Fitness score dihitung: 1 / (1 + Total_Penalti)
    """
    hard_violations: List[Violation] = []
    soft_violations: List[Violation] = []
    hard_penalties: float = 0.0
    soft_penalties: float = 0.0

    # Bobot default dari DB
    w_dosen_clash = ctx.aturan_map.get("HARD_NO_LECTURER_CLASH").bobot if "HARD_NO_LECTURER_CLASH" in ctx.aturan_map else 1000.0
    w_room_clash = ctx.aturan_map.get("HARD_NO_ROOM_CLASH").bobot if "HARD_NO_ROOM_CLASH" in ctx.aturan_map else 1000.0
    w_class_clash = ctx.aturan_map.get("HARD_NO_CLASS_CLASH").bobot if "HARD_NO_CLASS_CLASH" in ctx.aturan_map else 1000.0
    w_capacity = ctx.aturan_map.get("HARD_ROOM_CAPACITY").bobot if "HARD_ROOM_CAPACITY" in ctx.aturan_map else 500.0
    w_lab = ctx.aturan_map.get("HARD_LAB_REQUIREMENT").bobot if "HARD_LAB_REQUIREMENT" in ctx.aturan_map else 500.0
    w_avail = ctx.aturan_map.get("HARD_LECTURER_AVAILABILITY").bobot if "HARD_LECTURER_AVAILABILITY" in ctx.aturan_map else 800.0

    w_day_spread = ctx.aturan_map.get("SOFT_DAY_SPREAD").bobot if "SOFT_DAY_SPREAD" in ctx.aturan_map else 10.0
    w_lecturer_gap = ctx.aturan_map.get("SOFT_LECTURER_GAP").bobot if "SOFT_LECTURER_GAP" in ctx.aturan_map else 15.0
    w_student_idle = ctx.aturan_map.get("SOFT_STUDENT_IDLE_GAP").bobot if "SOFT_STUDENT_IDLE_GAP" in ctx.aturan_map else 20.0
    w_preference = ctx.aturan_map.get("SOFT_LECTURER_PREFERENCE").bobot if "SOFT_LECTURER_PREFERENCE" in ctx.aturan_map else 25.0
    w_room_change = ctx.aturan_map.get("SOFT_MINIMIZE_ROOM_CHANGE").bobot if "SOFT_MINIMIZE_ROOM_CHANGE" in ctx.aturan_map else 10.0

    # Struktur pencatatan penggunaan slot:
    # room_occupancy: {(ruangan_id, hari_id, slot_nomor): gene}
    # lecturer_occupancy: {(dosen_id, hari_id, slot_nomor): gene}
    # rombel_occupancy: {(cohort_key, hari_id, slot_nomor): gene}
    room_occupancy: Dict[tuple, Gene] = {}
    lecturer_occupancy: Dict[tuple, Gene] = {}
    rombel_occupancy: Dict[tuple, Gene] = {}

    day_distribution = defaultdict(int) # {hari_id: count}
    lecturer_sessions_per_day = defaultdict(list) # {(dosen_id, hari_id): [slot_numbers]}
    rombel_sessions_per_day = defaultdict(list) # {(rombel_key, hari_id): [(gene)]}

    for gene in chromosome.genes:
        kelas = ctx.kelas_map.get(gene.kelas_id)
        ruang = ctx.ruangan_map.get(gene.ruangan_id)
        if not kelas or not ruang:
            continue

        day_distribution[gene.hari_id] += 1
        dosen_ids = ctx.dosen_per_kelas.get(gene.kelas_id, [])

        # Cohort / Rombel identifier: prodi + semester_ke (misal IF semester 1 rombel A)
        rombel_key = f"{kelas.prodi_id}_{kelas.semester_ke}_{kelas.kode_kelas.split('-')[0]}"
        rombel_sessions_per_day[(rombel_key, gene.hari_id)].append(gene)

        # -------------------------------------------------------------
        # HARD CONSTRAINT 1 & 2 & 3: Clash Dosen, Ruang, dan Rombel
        # -------------------------------------------------------------
        slots = gene.slot_range()
        for s_no in slots:
            # Check Room Clash
            r_key = (gene.ruangan_id, gene.hari_id, s_no)
            if r_key in room_occupancy:
                other_gene = room_occupancy[r_key]
                other_kelas = ctx.kelas_map.get(other_gene.kelas_id)
                v = Violation(
                    aturan_kode="HARD_NO_ROOM_CLASH",
                    severity="HARD",
                    penalti=w_room_clash,
                    pesan=f"Bentrok Ruangan {ruang.nama} pada Hari {gene.hari_id} Slot {s_no} antara '{kelas.nama_kelas}' dan '{other_kelas.nama_kelas if other_kelas else 'Kelas Lain'}'",
                    kelas_id=gene.kelas_id,
                    ruangan_id=gene.ruangan_id,
                    hari_id=gene.hari_id
                )
                hard_violations.append(v)
                hard_penalties += w_room_clash
            else:
                room_occupancy[r_key] = gene

            # Check Lecturer Clash
            for d_id in dosen_ids:
                d_key = (d_id, gene.hari_id, s_no)
                if d_key in lecturer_occupancy:
                    other_gene = lecturer_occupancy[d_key]
                    other_kelas = ctx.kelas_map.get(other_gene.kelas_id)
                    v = Violation(
                        aturan_kode="HARD_NO_LECTURER_CLASH",
                        severity="HARD",
                        penalti=w_dosen_clash,
                        pesan=f"Bentrok Dosen pada Hari {gene.hari_id} Slot {s_no} antara '{kelas.nama_kelas}' dan '{other_kelas.nama_kelas if other_kelas else 'Kelas Lain'}'",
                        kelas_id=gene.kelas_id,
                        ruangan_id=gene.ruangan_id,
                        hari_id=gene.hari_id
                    )
                    hard_violations.append(v)
                    hard_penalties += w_dosen_clash
                else:
                    lecturer_occupancy[d_key] = gene

                # Check Lecturer Availability (Hard Constraint 6)
                if (d_id, gene.hari_id) in ctx.dosen_unavailable:
                    if s_no in ctx.dosen_unavailable[(d_id, gene.hari_id)]:
                        v = Violation(
                            aturan_kode="HARD_LECTURER_AVAILABILITY",
                            severity="HARD",
                            penalti=w_avail,
                            pesan=f"Dosen pengampu '{kelas.nama_kelas}' tidak bersedia mengajar pada Hari {gene.hari_id} Slot {s_no}",
                            kelas_id=gene.kelas_id,
                            hari_id=gene.hari_id
                        )
                        hard_violations.append(v)
                        hard_penalties += w_avail

            # Check Rombel Clash
            rom_key = (rombel_key, gene.hari_id, s_no)
            if rom_key in rombel_occupancy:
                other_gene = rombel_occupancy[rom_key]
                other_kelas = ctx.kelas_map.get(other_gene.kelas_id)
                v = Violation(
                    aturan_kode="HARD_NO_CLASS_CLASH",
                    severity="HARD",
                    penalti=w_class_clash,
                    pesan=f"Bentrok Rombel Mahasiswa ({rombel_key}) pada Hari {gene.hari_id} Slot {s_no} antara '{kelas.nama_kelas}' dan '{other_kelas.nama_kelas if other_kelas else 'Kelas Lain'}'",
                    kelas_id=gene.kelas_id,
                    ruangan_id=gene.ruangan_id,
                    hari_id=gene.hari_id
                )
                hard_violations.append(v)
                hard_penalties += w_class_clash
            else:
                rombel_occupancy[rom_key] = gene

        # -------------------------------------------------------------
        # HARD CONSTRAINT 4: Kapasitas Ruang
        # -------------------------------------------------------------
        if ruang.kapasitas < kelas.jumlah_mahasiswa:
            diff = kelas.jumlah_mahasiswa - ruang.kapasitas
            p = w_capacity + (diff * 10)
            v = Violation(
                aturan_kode="HARD_ROOM_CAPACITY",
                severity="HARD",
                penalti=p,
                pesan=f"Kapasitas {ruang.nama} ({ruang.kapasitas}) tidak cukup untuk {kelas.nama_kelas} ({kelas.jumlah_mahasiswa} mahasiswa)",
                kelas_id=gene.kelas_id,
                ruangan_id=gene.ruangan_id
            )
            hard_violations.append(v)
            hard_penalties += p

        # -------------------------------------------------------------
        # HARD CONSTRAINT 5: Lab Requirement
        # -------------------------------------------------------------
        if kelas.jenis == JenisMataKuliah.PRAKTIK:
            if ruang.jenis != JenisRuangan.LABORATORIUM:
                v = Violation(
                    aturan_kode="HARD_LAB_REQUIREMENT",
                    severity="HARD",
                    penalti=w_lab,
                    pesan=f"Kelas praktikum '{kelas.nama_kelas}' ditempatkan di ruangan non-lab '{ruang.nama}' ({ruang.jenis.value})",
                    kelas_id=gene.kelas_id,
                    ruangan_id=gene.ruangan_id
                )
                hard_violations.append(v)
                hard_penalties += w_lab

        # Track sessions for soft constraint evaluation
        for d_id in dosen_ids:
            lecturer_sessions_per_day[(d_id, gene.hari_id)].extend(slots)

    # -------------------------------------------------------------
    # SOFT CONSTRAINT 1: Sebaran Hari (Day Spread)
    # -------------------------------------------------------------
    # Idealnya sebaran merata di 6 hari kuliah
    total_genes = len(chromosome.genes)
    if total_genes > 0:
        avg_per_day = total_genes / len(ctx.hari_ids)
        for h_id in ctx.hari_ids:
            count = day_distribution[h_id]
            dev = abs(count - avg_per_day)
            if dev > 2.0:
                p = dev * w_day_spread
                soft_penalties += p

    # -------------------------------------------------------------
    # SOFT CONSTRAINT 2: Lecturer Gap / Overload
    # -------------------------------------------------------------
    for (d_id, h_id), slots_list in lecturer_sessions_per_day.items():
        if len(slots_list) > 6:
            p = (len(slots_list) - 6) * w_lecturer_gap
            soft_penalties += p

    # -------------------------------------------------------------
    # SOFT CONSTRAINT 3: Student Idle Gap & Room Change
    # -------------------------------------------------------------
    for (r_key, h_id), genes_in_day in rombel_sessions_per_day.items():
        if len(genes_in_day) > 1:
            sorted_genes = sorted(genes_in_day, key=lambda g: g.slot_mulai_nomor)
            for i in range(len(sorted_genes) - 1):
                cur_end = sorted_genes[i].slot_mulai_nomor + sorted_genes[i].durasi_slot
                next_start = sorted_genes[i+1].slot_mulai_nomor
                gap = next_start - cur_end
                if gap > 2: # Gap kosong lebih dari 2 slot (~100 menit)
                    p = (gap - 2) * w_student_idle
                    soft_penalties += p
                # Perpindahan ruang
                if sorted_genes[i].ruangan_id != sorted_genes[i+1].ruangan_id:
                    soft_penalties += w_room_change

    # Hitung nilai Fitness Normalized (0.0 s/d 1.0)
    # Semakin kecil penalti, semakin mendekati 1.0
    total_penalty = hard_penalties + (soft_penalties * 0.1)
    fitness = 1.0 / (1.0 + total_penalty)

    chromosome.fitness = fitness
    chromosome.hard_penalties = hard_penalties
    chromosome.soft_penalties = soft_penalties
    chromosome.hard_violations = hard_violations
    chromosome.soft_violations = soft_violations

    return chromosome

