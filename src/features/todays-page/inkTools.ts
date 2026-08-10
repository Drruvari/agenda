export type InkTool = 'pen' | 'highlighter' | 'eraser';

export type InkBrush = {
  id: string;
  kind: 'pen' | 'highlighter';
  color: string;
  width: number;
  opacity: number;
  label: string;
};

export const PEN_BRUSHES: InkBrush[] = [
  { id: 'pen-primary', kind: 'pen', color: 'primaryInk', width: 3.2, opacity: 1, label: 'Ink' },
  { id: 'pen-red', kind: 'pen', color: '#FF3B30', width: 3.2, opacity: 1, label: 'Red' },
  { id: 'pen-blue', kind: 'pen', color: '#007AFF', width: 3.2, opacity: 1, label: 'Blue' },
  { id: 'pen-green', kind: 'pen', color: '#34C759', width: 3.2, opacity: 1, label: 'Green' },
];

export const HIGHLIGHT_BRUSHES: InkBrush[] = [
  {
    id: 'hl-yellow',
    kind: 'highlighter',
    color: '#FFD60A',
    width: 16,
    opacity: 0.38,
    label: 'Yellow',
  },
  {
    id: 'hl-pink',
    kind: 'highlighter',
    color: '#FF2D55',
    width: 16,
    opacity: 0.32,
    label: 'Pink',
  },
  {
    id: 'hl-green',
    kind: 'highlighter',
    color: '#30D158',
    width: 16,
    opacity: 0.32,
    label: 'Green',
  },
];

export const DEFAULT_BRUSH = PEN_BRUSHES[0]!;
