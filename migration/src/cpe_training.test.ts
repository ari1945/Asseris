import { describe, it, expect } from 'vitest';
import { cpeFromTraining, trainingSkpFor, type TrainingCourse, type TrainingAttendance } from './cpe_training';

const CATALOG: TrainingCourse[] = [
  { id: 'TR-01', title: 'Update SA Terkini', mode: 'Terstruktur', skp: 8, date: '2026-04-10' },
  { id: 'TR-02', title: 'PSAK Deep Dive', mode: 'Terstruktur', skp: 6, date: '2026-04-24' },
  { id: 'TR-06', title: 'Coaching', mode: 'Tidak Terstruktur', skp: 4, date: '2026-06-05' },
];

describe('cpeFromTraining — kredit SKP dari kehadiran terkonfirmasi', () => {
  it('mengabaikan kehadiran yang belum dikonfirmasi & yang tak ada di katalog', () => {
    const att: TrainingAttendance = {
      'TR-01': { 'EMP-001': { confirmed: true, by: 'Anindya', at: '2026-04-11' }, 'EMP-002': { confirmed: false } },
      'TR-99': { 'EMP-001': { confirmed: true } }, // tak ada di katalog → diabaikan
    };
    const byEmp = cpeFromTraining(CATALOG, att);
    expect(byEmp['EMP-001']).toHaveLength(1);
    expect(byEmp['EMP-001'][0]).toMatchObject({ t: 'Update SA Terkini', type: 'Terstruktur', skp: 8, src: 'training', trainingId: 'TR-01' });
    expect(byEmp['EMP-002']).toBeUndefined(); // confirmed:false tak dikreditkan
  });

  it('mengakumulasi beberapa pelatihan per pegawai (terstruktur + tidak)', () => {
    const att: TrainingAttendance = {
      'TR-01': { 'EMP-007': { confirmed: true } },
      'TR-02': { 'EMP-007': { confirmed: true } },
      'TR-06': { 'EMP-007': { confirmed: true } },
    };
    const byEmp = cpeFromTraining(CATALOG, att);
    expect(byEmp['EMP-007']).toHaveLength(3);
    expect(trainingSkpFor(byEmp, 'EMP-007')).toBe(18); // 8+6+4
  });

  it('tahan input kosong/undefined', () => {
    expect(cpeFromTraining(undefined, undefined)).toEqual({});
    expect(cpeFromTraining(CATALOG, {})).toEqual({});
    expect(trainingSkpFor({}, 'EMP-001')).toBe(0);
  });
});
