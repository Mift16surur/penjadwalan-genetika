import time
import uuid
import copy
from typing import List, Callable, Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime

from server.app.engine_ga.chromosome import Chromosome
from server.app.engine_ga.context import GAContext
from server.app.engine_ga.fitness import evaluate_chromosome
from server.app.engine_ga.operators import (
    create_random_chromosome, tournament_selection,
    crossover, mutate, local_repair
)
from server.app.models import JobGA, VersiJadwal, Jadwal, PelanggaranJadwal
from server.app.models.enums import StatusJobGA, StatusVersiJadwal, StatusJadwal, SeverityPelanggaran

class GASolver:
    """Mesin solver penjadwalan kuliah berbasis Algoritma Genetika."""

    def __init__(
        self,
        ctx: GAContext,
        population_size: int = 60,
        generations: int = 150,
        crossover_rate: float = 0.85,
        mutation_rate: float = 0.08,
        elite_count: int = 4,
        progress_callback: Optional[Callable[[int, float, int], None]] = None
    ):
        self.ctx = ctx
        self.pop_size = population_size
        self.generations = generations
        self.crossover_rate = crossover_rate
        self.mutation_rate = mutation_rate
        self.elite_count = elite_count
        self.progress_callback = progress_callback

    def run(self) -> List[Chromosome]:
        """Menjalankan loop Algoritma Genetika."""
        if not self.ctx.kelas_list:
            raise ValueError("Tidak ada kelas aktif yang ditemukan untuk dijadwalkan pada periode ini.")

        # 1. Inisialisasi Populasi
        population: List[Chromosome] = []
        for _ in range(self.pop_size):
            chrom = create_random_chromosome(self.ctx)
            evaluate_chromosome(chrom, self.ctx)
            population.append(chrom)

        population.sort(key=lambda c: c.fitness, reverse=True)
        best_overall = copy.deepcopy(population[0])

        # 2. Loop Generasi
        for gen in range(1, self.generations + 1):
            new_population: List[Chromosome] = []

            # A. Elitisme: simpan k individu terbaik tanpa modifikasi
            for i in range(self.elite_count):
                new_population.append(copy.deepcopy(population[i]))

            # B. Seleksi, Crossover, dan Mutasi
            while len(new_population) < self.pop_size:
                p1 = tournament_selection(population)
                p2 = tournament_selection(population)

                if time.time() and (random_val := copy.copy(self.crossover_rate)):
                    c1, c2 = crossover(p1, p2)
                else:
                    c1, c2 = copy.deepcopy(p1), copy.deepcopy(p2)

                c1 = mutate(c1, self.ctx, self.mutation_rate)
                c2 = mutate(c2, self.ctx, self.mutation_rate)

                # C. Hybrid Local Repair pada generasi-generasi tertentu atau individu yang mendekati feasible
                if gen % 5 == 0 or gen > (self.generations * 0.6):
                    c1 = local_repair(c1, self.ctx)
                    c2 = local_repair(c2, self.ctx)

                evaluate_chromosome(c1, self.ctx)
                evaluate_chromosome(c2, self.ctx)

                new_population.append(c1)
                if len(new_population) < self.pop_size:
                    new_population.append(c2)

            population = new_population
            population.sort(key=lambda c: c.fitness, reverse=True)

            if population[0].fitness > best_overall.fitness:
                best_overall = copy.deepcopy(population[0])

            # Update progress
            progress_pct = int((gen / self.generations) * 100)
            if self.progress_callback:
                self.progress_callback(progress_pct, best_overall.fitness, len(best_overall.hard_violations))

            # Early stopping jika sudah sempurna (fitness 1.0 dan tidak ada hard violation)
            if best_overall.is_feasible and best_overall.soft_penalties == 0.0:
                break

        # Kembalikan 3 kandidat terbaik yang unik
        top_candidates = []
        seen_fitness = set()
        for ch in population:
            rounded_fit = round(ch.fitness, 4)
            if rounded_fit not in seen_fitness:
                seen_fitness.add(rounded_fit)
                top_candidates.append(ch)
            if len(top_candidates) >= 3:
                break

        if not top_candidates:
            top_candidates = [best_overall]

        return top_candidates


def execute_ga_job(db: Session, job_id: uuid.UUID):
    """Fungsi pembungkus eksekusi background job untuk GA."""
    job = db.query(JobGA).filter(JobGA.id == job_id).first()
    if not job:
        return

    job.status = StatusJobGA.RUNNING
    job.started_at = datetime.utcnow()
    job.progress = 5
    db.commit()

    try:
        ctx = GAContext(db, job.semester_periode_id, job.prodi_id)

        def on_progress(pct: int, best_fit: float, hard_viols: int):
            job.progress = pct
            job.fitness_terbaik = best_fit
            db.commit()

        solver = GASolver(
            ctx=ctx,
            population_size=job.populasi,
            generations=job.generasi,
            crossover_rate=job.crossover_rate,
            mutation_rate=job.mutation_rate,
            progress_callback=on_progress
        )

        candidates = solver.run()

        # Simpan setiap kandidat ke database
        for idx, candidate in enumerate(candidates, start=1):
            versi = VersiJadwal(
                job_ga_id=job.id,
                semester_periode_id=job.semester_periode_id,
                nomor_versi=idx,
                nama=f"Kandidat {idx} (Fit: {round(candidate.fitness, 3)}, Viol: {candidate.total_violations})",
                fitness_score=candidate.fitness,
                jumlah_pelanggaran=candidate.total_violations,
                status=StatusVersiJadwal.GENERATED if idx == 1 else StatusVersiJadwal.DRAFT
            )
            db.add(versi)
            db.flush()

            # Simpan jadwal gen
            for g in candidate.genes:
                item = Jadwal(
                    versi_jadwal_id=versi.id,
                    kelas_id=g.kelas_id,
                    ruangan_id=g.ruangan_id,
                    hari_id=g.hari_id,
                    slot_mulai_id=g.slot_mulai_id,
                    durasi_slot=g.durasi_slot,
                    status=StatusJadwal.ACTIVE
                )
                db.add(item)
                db.flush()

            # Simpan pelanggaran
            for v in candidate.hard_violations + candidate.soft_violations:
                aturan = ctx.aturan_map.get(v.aturan_kode)
                if aturan:
                    pel = PelanggaranJadwal(
                        versi_jadwal_id=versi.id,
                        aturan_id=aturan.id,
                        severity=SeverityPelanggaran.HARD if v.severity == "HARD" else SeverityPelanggaran.SOFT,
                        penalti=v.penalti,
                        pesan=v.pesan,
                        detail=v.detail
                    )
                    db.add(pel)

        job.status = StatusJobGA.COMPLETED
        job.progress = 100
        job.finished_at = datetime.utcnow()
        db.commit()

    except Exception as e:
        job.status = StatusJobGA.FAILED
        job.finished_at = datetime.utcnow()
        job.parameter = {"error": str(e)}
        db.commit()
        raise e

