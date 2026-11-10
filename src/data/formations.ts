import type { FormationId, FormationSlot } from '../types';

export const FORMATIONS: Record<FormationId, FormationSlot[]> = {
  '4-3-3': [
    { id: 'gk', label: 'GK', role: 'GK', x: 50, y: 92 },
    { id: 'lb', label: 'LB', role: 'DF', x: 14, y: 72 },
    { id: 'lcb', label: 'CB', role: 'DF', x: 37, y: 77 },
    { id: 'rcb', label: 'CB', role: 'DF', x: 63, y: 77 },
    { id: 'rb', label: 'RB', role: 'DF', x: 86, y: 72 },
    { id: 'lcm', label: 'CM', role: 'MF', x: 28, y: 52 },
    { id: 'cdm', label: 'DM', role: 'MF', x: 50, y: 60 },
    { id: 'rcm', label: 'CM', role: 'MF', x: 72, y: 52 },
    { id: 'lw', label: 'LW', role: 'FW', x: 18, y: 24 },
    { id: 'st', label: 'ST', role: 'FW', x: 50, y: 16 },
    { id: 'rw', label: 'RW', role: 'FW', x: 82, y: 24 },
  ],
  '4-4-2': [
    { id: 'gk', label: 'GK', role: 'GK', x: 50, y: 92 },
    { id: 'lb', label: 'LB', role: 'DF', x: 14, y: 72 },
    { id: 'lcb', label: 'CB', role: 'DF', x: 37, y: 77 },
    { id: 'rcb', label: 'CB', role: 'DF', x: 63, y: 77 },
    { id: 'rb', label: 'RB', role: 'DF', x: 86, y: 72 },
    { id: 'lm', label: 'LM', role: 'MF', x: 14, y: 46 },
    { id: 'lcm', label: 'CM', role: 'MF', x: 38, y: 52 },
    { id: 'rcm', label: 'CM', role: 'MF', x: 62, y: 52 },
    { id: 'rm', label: 'RM', role: 'MF', x: 86, y: 46 },
    { id: 'lst', label: 'ST', role: 'FW', x: 37, y: 18 },
    { id: 'rst', label: 'ST', role: 'FW', x: 63, y: 18 },
  ],
  '3-5-2': [
    { id: 'gk', label: 'GK', role: 'GK', x: 50, y: 92 },
    { id: 'lcb', label: 'CB', role: 'DF', x: 26, y: 76 },
    { id: 'cb', label: 'CB', role: 'DF', x: 50, y: 79 },
    { id: 'rcb', label: 'CB', role: 'DF', x: 74, y: 76 },
    { id: 'lwb', label: 'LWB', role: 'MF', x: 10, y: 48 },
    { id: 'lcm', label: 'CM', role: 'MF', x: 33, y: 54 },
    { id: 'cdm', label: 'DM', role: 'MF', x: 50, y: 60 },
    { id: 'rcm', label: 'CM', role: 'MF', x: 67, y: 54 },
    { id: 'rwb', label: 'RWB', role: 'MF', x: 90, y: 48 },
    { id: 'lst', label: 'ST', role: 'FW', x: 38, y: 18 },
    { id: 'rst', label: 'ST', role: 'FW', x: 62, y: 18 },
  ],
  '4-2-3-1': [
    { id: 'gk', label: 'GK', role: 'GK', x: 50, y: 92 },
    { id: 'lb', label: 'LB', role: 'DF', x: 14, y: 72 },
    { id: 'lcb', label: 'CB', role: 'DF', x: 37, y: 77 },
    { id: 'rcb', label: 'CB', role: 'DF', x: 63, y: 77 },
    { id: 'rb', label: 'RB', role: 'DF', x: 86, y: 72 },
    { id: 'ldm', label: 'DM', role: 'MF', x: 37, y: 58 },
    { id: 'rdm', label: 'DM', role: 'MF', x: 63, y: 58 },
    { id: 'lam', label: 'LAM', role: 'MF', x: 18, y: 34 },
    { id: 'cam', label: 'CAM', role: 'MF', x: 50, y: 38 },
    { id: 'ram', label: 'RAM', role: 'MF', x: 82, y: 34 },
    { id: 'st', label: 'ST', role: 'FW', x: 50, y: 14 },
  ],
};

export const FORMATION_IDS = Object.keys(FORMATIONS) as FormationId[];

export const FORMATION_NOTES: Record<FormationId, string> = {
  '4-3-3': '측면 공격과 전방 압박에 강한 밸런스형',
  '4-4-2': '두 줄 수비로 안정적, 투톱의 직선적인 공격',
  '3-5-2': '중원 숫자 우위로 점유율 확보, 측면 수비는 약점',
  '4-2-3-1': '더블 볼란치로 수비 안정 + 2선 창의성',
};
