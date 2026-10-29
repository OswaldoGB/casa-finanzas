// Formato de los manuales de ayuda. Texto plano; **así** se muestra en negritas.
export type ManualSection = {
  title: string;
  /** Párrafo corto. */
  text?: string;
  /** Pasos numerados. */
  steps?: string[];
  /** Viñetas (consejos, "ten en cuenta"). */
  tips?: string[];
};

export type Manual = {
  title: string;
  /** Una o dos líneas: para qué sirve esta pantalla. */
  summary: string;
  sections: ManualSection[];
};
