import random
import copy
from typing import List, Tuple
from server.app.engine_ga.chromosome import Chromosome, Gene
from server.app.engine_ga.context import GAContext
from server.app.models.enums import JenisRuangan, JenisMataKuliah

def create_random_chromosome(ctx: GAContext) -> Chromosome:
    """Membuat 1 kromosom acak awal dengan penempatan gen yang valid secara struktural."""
    genes: List[Gene] = []

    for kelas in ctx.kelas_list:
        # Tentukan durasi slot berdasarkan SKS (2 atau 3 slot)
        durasi = 3 if kelas.sks >= 3 else 2

        # Filter ruangan yang cocok
        if kelas.jenis == JenisMataKuliah.PRAKTIK:
            eligible_rooms = [r for r in ctx.ruangan_list if r.jenis == JenisRuangan.LABORATORIUM]
            if not eligible_rooms:
                eligible_rooms = ctx.ruangan_list
        else:
            eligible_rooms = [r for r in ctx.ruangan_list if r.jenis != JenisRuangan.LABORATORIUM]
            if not eligible_rooms:
                eligible_rooms = ctx.ruangan_list

        selected_room = random.choice(eligible_rooms)
        selected_hari = random.choice(ctx.hari_ids)

        # Pilih shift (default PAGI, atau MALAM jika kelas malam)
        shift_target = "PAGI"
        available_slots = ctx.slots_by_shift.get(shift_target, ctx.slot_list)

        # Pastikan slot_mulai + durasi tidak melebihi jumlah slot dalam shift
        # Slot pagi: 1 s/d 9 (hindari slot yang melewati break atau batas shift)
        valid_start_slots = [
            s for s in available_slots 
            if (s.nomor + durasi - 1) <= available_slots[-1].nomor
            and not (s.nomor <= 5 and s.nomor + durasi - 1 >= 6) # Hindari break sholat dhuhur 11.40-13.00
        ]
        if not valid_start_slots:
            valid_start_slots = available_slots[:len(available_slots) - durasi + 1]

        start_slot = random.choice(valid_start_slots)

        gene = Gene(
            kelas_id=kelas.id,
            ruangan_id=selected_room.id,
            hari_id=selected_hari,
            slot_mulai_id=start_slot.id,
            slot_mulai_nomor=start_slot.nomor,
            durasi_slot=durasi,
            shift_kode=shift_target
        )
        genes.append(gene)

    return Chromosome(genes=genes)


def tournament_selection(population: List[Chromosome], tournament_size: int = 4) -> Chromosome:
    """Memilih kromosom terbaik dari subset acak populasi."""
    competitors = random.sample(population, tournament_size)
    best = max(competitors, key=lambda c: c.fitness)
    return best


def crossover(parent1: Chromosome, parent2: Chromosome) -> Tuple[Chromosome, Chromosome]:
    """Uniform Crossover per gen antara 2 parent."""
    genes1: List[Gene] = []
    genes2: List[Gene] = []

    for g1, g2 in zip(parent1.genes, parent2.genes):
        if random.random() < 0.5:
            genes1.append(copy.deepcopy(g1))
            genes2.append(copy.deepcopy(g2))
        else:
            genes1.append(copy.deepcopy(g2))
            genes2.append(copy.deepcopy(g1))

    return Chromosome(genes=genes1), Chromosome(genes=genes2)


def mutate(chromosome: Chromosome, ctx: GAContext, mutation_rate: float = 0.05) -> Chromosome:
    """Mutasi kromosom: mengubah ruang atau menggeser slot/hari untuk gen tertentu."""
    for gene in chromosome.genes:
        if random.random() < mutation_rate:
            kelas = ctx.kelas_map.get(gene.kelas_id)
            if not kelas:
                continue

            mutation_type = random.choice(["room", "time", "both"])

            if mutation_type in ["room", "both"]:
                if kelas.jenis == JenisMataKuliah.PRAKTIK:
                    eligible_rooms = [r for r in ctx.ruangan_list if r.jenis == JenisRuangan.LABORATORIUM]
                else:
                    eligible_rooms = [r for r in ctx.ruangan_list if r.jenis != JenisRuangan.LABORATORIUM]
                if eligible_rooms:
                    gene.ruangan_id = random.choice(eligible_rooms).id

            if mutation_type in ["time", "both"]:
                gene.hari_id = random.choice(ctx.hari_ids)
                available_slots = ctx.slots_by_shift.get(gene.shift_kode, ctx.slot_list)
                valid_start_slots = [
                    s for s in available_slots 
                    if (s.nomor + gene.durasi_slot - 1) <= available_slots[-1].nomor
                    and not (s.nomor <= 5 and s.nomor + gene.durasi_slot - 1 >= 6)
                ]
                if valid_start_slots:
                    slot = random.choice(valid_start_slots)
                    gene.slot_mulai_id = slot.id
                    gene.slot_mulai_nomor = slot.nomor

    return chromosome


def local_repair(chromosome: Chromosome, ctx: GAContext) -> Chromosome:
    """
    Hybrid GA Local Search:
    Mengidentifikasi gen-gen yang menyebabkan bentrok hard constraint,
    kemudian mencoba mencarikan ruang atau slot yang belum terpakai pada hari yang sama atau hari lain.
    """
    if chromosome.is_feasible:
        return chromosome

    clashing_kelas_ids = {v.kelas_id for v in chromosome.hard_violations if v.kelas_id}
    if not clashing_kelas_ids:
        return chromosome

    # Build currently used slots per room and lecturer
    occupied_rooms = set()
    occupied_lecturers = set()

    for g in chromosome.genes:
        if g.kelas_id not in clashing_kelas_ids:
            for s_no in g.slot_range():
                occupied_rooms.add((g.ruangan_id, g.hari_id, s_no))
                for d_id in ctx.dosen_per_kelas.get(g.kelas_id, []):
                    occupied_lecturers.add((d_id, g.hari_id, s_no))

    # Try to relocate clashing genes
    for g in chromosome.genes:
        if g.kelas_id in clashing_kelas_ids:
            kelas = ctx.kelas_map.get(g.kelas_id)
            dosen_ids = ctx.dosen_per_kelas.get(g.kelas_id, [])

            if kelas.jenis == JenisMataKuliah.PRAKTIK:
                eligible_rooms = [r for r in ctx.ruangan_list if r.jenis == JenisRuangan.LABORATORIUM and r.kapasitas >= kelas.jumlah_mahasiswa]
            else:
                eligible_rooms = [r for r in ctx.ruangan_list if r.kapasitas >= kelas.jumlah_mahasiswa]
            if not eligible_rooms:
                eligible_rooms = ctx.ruangan_list

            found = False
            # Cari slot dan ruangan kosong
            shuffled_days = list(ctx.hari_ids)
            random.shuffle(shuffled_days)

            for h_id in shuffled_days:
                available_slots = ctx.slots_by_shift.get(g.shift_kode, ctx.slot_list)
                valid_slots = [
                    s for s in available_slots 
                    if (s.nomor + g.durasi_slot - 1) <= available_slots[-1].nomor
                    and not (s.nomor <= 5 and s.nomor + g.durasi_slot - 1 >= 6)
                ]
                random.shuffle(valid_slots)

                for start_slot in valid_slots:
                    req_slots = range(start_slot.nomor, start_slot.nomor + g.durasi_slot)

                    # Check lecturer availability
                    lec_busy = False
                    for d_id in dosen_ids:
                        for s_no in req_slots:
                            if (d_id, h_id, s_no) in occupied_lecturers:
                                lec_busy = True
                                break
                            if (d_id, h_id) in ctx.dosen_unavailable and s_no in ctx.dosen_unavailable[(d_id, h_id)]:
                                lec_busy = True
                                break
                        if lec_busy:
                            break
                    if lec_busy:
                        continue

                    # Check room availability
                    for r in eligible_rooms:
                        room_busy = any((r.id, h_id, s_no) in occupied_rooms for s_no in req_slots)
                        if not room_busy:
                            # Found clash-free placement!
                            g.ruangan_id = r.id
                            g.hari_id = h_id
                            g.slot_mulai_id = start_slot.id
                            g.slot_mulai_nomor = start_slot.nomor
                            # Mark newly occupied
                            for s_no in req_slots:
                                occupied_rooms.add((r.id, h_id, s_no))
                                for d_id in dosen_ids:
                                    occupied_lecturers.add((d_id, h_id, s_no))
                            found = True
                            break
                    if found:
                        break
                if found:
                    break

    return chromosome

