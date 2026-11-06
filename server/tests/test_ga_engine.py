import pytest
import uuid
from server.app.engine_ga.chromosome import Chromosome, Gene
from server.app.engine_ga.context import GAContext
from server.app.engine_ga.fitness import evaluate_chromosome
from server.app.engine_ga.operators import mutate, crossover
from server.app.models import SemesterPeriode, Kelas, Ruangan, Dosen, KetersediaanDosen

def test_gene_slot_range():
    gene = Gene(
        kelas_id=uuid.uuid4(),
        ruangan_id=uuid.uuid4(),
        hari_id=1,
        slot_mulai_id=uuid.uuid4(),
        slot_mulai_nomor=3,
        durasi_slot=3
    )
    assert gene.slot_range() == [3, 4, 5]

def test_ga_fitness_no_clashes(db_session):
    periode = db_session.query(SemesterPeriode).first()
    ctx = GAContext(db_session, periode.id)

    kelas = ctx.kelas_list[0]
    ruang = ctx.ruangan_list[0]
    slot = ctx.slot_list[0]

    # Gene with sufficient capacity and no clashes
    gene = Gene(
        kelas_id=kelas.id,
        ruangan_id=ruang.id,
        hari_id=1,
        slot_mulai_id=slot.id,
        slot_mulai_nomor=1,
        durasi_slot=2
    )

    chrom = Chromosome(genes=[gene])
    eval_chrom = evaluate_chromosome(chrom, ctx)

    assert len(eval_chrom.hard_violations) == 0
    assert eval_chrom.hard_penalties == 0.0
    assert eval_chrom.fitness > 0.5

def test_ga_fitness_room_clash(db_session):
    periode = db_session.query(SemesterPeriode).first()
    ctx = GAContext(db_session, periode.id)

    kelas1 = ctx.kelas_list[0]
    ruang = ctx.ruangan_list[0]
    slot1 = ctx.slot_list[0]
    slot2 = ctx.slot_list[1]

    # Two classes scheduled in the EXACT SAME ROOM and TIME
    gene1 = Gene(kelas_id=kelas1.id, ruangan_id=ruang.id, hari_id=1, slot_mulai_id=slot1.id, slot_mulai_nomor=1, durasi_slot=2)
    gene2 = Gene(kelas_id=kelas1.id, ruangan_id=ruang.id, hari_id=1, slot_mulai_id=slot2.id, slot_mulai_nomor=2, durasi_slot=2) # overlaps at slot 2

    chrom = Chromosome(genes=[gene1, gene2])
    eval_chrom = evaluate_chromosome(chrom, ctx)

    # Should detect room clash
    clash_violations = [v for v in eval_chrom.hard_violations if v.aturan_kode == "HARD_NO_ROOM_CLASH"]
    assert len(clash_violations) > 0
    assert eval_chrom.hard_penalties >= 1000.0

def test_ga_fitness_lecturer_unavailability(db_session):
    periode = db_session.query(SemesterPeriode).first()
    kelas = db_session.query(Kelas).first()
    dosen = kelas.pengampu_list[0].dosen

    from server.app.models import SlotWaktu
    slot_waktu_1 = db_session.query(SlotWaktu).filter(SlotWaktu.nomor == 1).first()

    unavail = KetersediaanDosen(
        dosen_id=dosen.id,
        semester_periode_id=periode.id,
        hari_id=1,
        slot_mulai_id=slot_waktu_1.id,
        slot_selesai_id=slot_waktu_1.id,
        tersedia=False,
        keterangan="Rapat Rektorat"
    )
    db_session.add(unavail)
    db_session.commit()

    # Rebuild context to pick up unavailability
    ctx = GAContext(db_session, periode.id)

    # Try to schedule this class exactly at Monday Slot 1
    gene = Gene(
        kelas_id=kelas.id,
        ruangan_id=ctx.ruangan_list[0].id,
        hari_id=1,
        slot_mulai_id=slot_waktu_1.id,
        slot_mulai_nomor=1,
        durasi_slot=2
    )

    chrom = Chromosome(genes=[gene])
    eval_chrom = evaluate_chromosome(chrom, ctx)

    unavail_violations = [v for v in eval_chrom.hard_violations if v.aturan_kode == "HARD_LECTURER_AVAILABILITY"]
    assert len(unavail_violations) > 0
    assert eval_chrom.hard_penalties >= 800.0

def test_ga_operators_crossover_and_mutation(db_session):
    periode = db_session.query(SemesterPeriode).first()
    ctx = GAContext(db_session, periode.id)
    kelas = ctx.kelas_list[0]
    ruang1 = ctx.ruangan_list[0]
    ruang2 = ctx.ruangan_list[1] if len(ctx.ruangan_list) > 1 else ruang1
    slot1 = ctx.slot_list[0]
    slot3 = ctx.slot_list[2]

    gene_p1 = Gene(kelas_id=kelas.id, ruangan_id=ruang1.id, hari_id=1, slot_mulai_id=slot1.id, slot_mulai_nomor=1, durasi_slot=2)
    gene_p2 = Gene(kelas_id=kelas.id, ruangan_id=ruang2.id, hari_id=2, slot_mulai_id=slot3.id, slot_mulai_nomor=3, durasi_slot=2)

    parent1 = Chromosome(genes=[gene_p1])
    parent2 = Chromosome(genes=[gene_p2])

    # Crossover
    child1, child2 = crossover(parent1, parent2)
    assert len(child1.genes) == 1
    assert len(child2.genes) == 1

    # Mutation
    mutated = mutate(child1, ctx, mutation_rate=1.0)
    assert len(mutated.genes) == 1
