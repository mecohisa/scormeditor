/**
 * Marcos de color predefinidos (screen.frame): mismos colores, icono y rótulo en todos los
 * cursos. Única fuente para los atajos del editor (ScreenFrameEditor); la marca de autoría
 * `{{marco: <clave>}}` usa las mismas claves (docs/gpt/marcas-autoria.md §3 ter — mantener
 * la tabla de allí sincronizada si se añade o cambia uno).
 */
export type FramePreset = { key: string; color: string; icon: string; label: string }

export const FRAME_PRESETS: FramePreset[] = [
  { key: 'actividad_practica', color: '#F4C910', icon: '🧪', label: 'Actividad práctica' },
  { key: 'sintesis', color: '#6DC3C0', icon: '📝', label: 'Síntesis' },
  { key: 'reflexiona', color: '#F4C910', icon: '💭', label: 'Reflexiona' },
]
