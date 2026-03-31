/**
 * ============================================================
 *  SGB II Prüfassistent — Konfigurationsdatei
 *  config.js  |  Fokus: Studierende & EU-Bürger
 *
 *  HINWEIS FÜR FACHKRÄFTE:
 *  Alle anpassbaren Werte sind hier zentral hinterlegt.
 *  Nur diese Datei bearbeiten, wenn sich Grenzwerte oder
 *  Fristen gesetzlich ändern.
 *  Rechtsstand: SGB II / FreizügG/EU, Stand 01.01.2024
 * ============================================================
 */

const CONFIG = {

  // ----------------------------------------------------------
  // § 7 Abs. 1 SGB II — ALTERSVORAUSSETZUNGEN
  // ----------------------------------------------------------
  alter: {
    /** Mindestalter für Leistungsbezug nach SGB II (Jahre) */
    minimum: 15,

    /** Regelaltersgrenze: ab hier greift Rentenrecht (Jahre) */
    regelaltersgrenze: 67,

    /**
     * Maximales Alter für unverheiratete Kinder in der BG
     * ohne eigenes Einkommen (§ 7 Abs. 3 Nr. 4 SGB II).
     */
    kindInBGMaxAlter: 25,
  },

  // ----------------------------------------------------------
  // REGELBEDARFE (§ 20 SGB II) — für BAföG-Delta-Berechnung
  // Stand: 01.01.2025 (Bekanntmachung RBEG)
  // ----------------------------------------------------------
  regelbedarfe: {
    /**
     * Regelbedarf für Personen unter 25 Jahren, die im elterlichen
     * Haushalt leben (Regelbedarfsstufe 3), in Euro/Monat.
     * Relevant für Aufstockungsprüfung nach § 7 Abs. 6 Nr. 2 SGB II.
     */
    stufe3_unter25_beiEltern: 451,

    /**
     * Regelbedarf für Alleinstehende / Alleinerziehende
     * (Regelbedarfsstufe 1), in Euro/Monat.
     */
    stufe1_alleinstehend: 563,

    /**
     * Regelbedarf für Personen in Partnerschaft, je Person
     * (Regelbedarfsstufe 2), in Euro/Monat.
     */
    stufe2_partner: 506,
  },

  // ----------------------------------------------------------
  // BAföG-WOHNKOSTENPAUSCHALE — Betrag bei Wohnen bei Eltern
  // Stand: BAföG-Reform 2022
  // ----------------------------------------------------------
  bafoegWohnkostenpauschale: {
    /**
     * BAföG-Wohnkostenpauschale für Studierende, die bei den Eltern
     * wohnen, in Euro/Monat (§ 13 Abs. 2 Nr. 1 BAföG).
     * Dieser Betrag ist deutlich niedriger als die Pauschale für
     * eigene Wohnung (360 €). Die Differenz kann zu ungedecktem
     * Bedarf führen → Aufstockung nach § 7 Abs. 6 Nr. 2 SGB II.
     */
    beiEltern: 59,

    /**
     * BAföG-Wohnkostenpauschale für eigene Wohnung, in Euro/Monat.
     */
    eigeneMietwohnung: 360,
  },

  // ----------------------------------------------------------
  // § 7 Abs. 5 / Abs. 6 SGB II — BAföG / STUDIERENDEN-AUSSCHLUSS
  // ----------------------------------------------------------
  bafoeg: {
    /**
     * Ausschluss bei BAföG-förderfähiger Ausbildung aktiv?
     * true = Standard nach § 7 Abs. 5 SGB II
     */
    ausschlussAktiv: true,

    /**
     * Maximale Erkrankungs- oder Schwangerschaftsdauer in Monaten,
     * bis zu der die Ausnahme nach § 7 Abs. 6 Nr. 1 SGB II greift.
     */
    erkrankungAusnahmedauerMonate: 3,

    /**
     * Ausbildungsarten, die dem Grunde nach BAföG-förderfähig sind.
     * Grundlage für die automatische Vorauswahl im Formular.
     */
    foerderfaehigeArten: [
      'vollzeitstudium',
      'ausbildung_dual',
      'ausbildung_schulisch',
      'abendgymnasium',
    ],

    /**
     * Ausbildungsarten, die NICHT BAföG-förderfähig sind.
     */
    nichtFoerderfaehigeArten: [
      'teilzeitstudium',
    ],
  },

  // ----------------------------------------------------------
  // § 7 Abs. 1 S. 2 SGB II / FreizügG/EU — EU-BÜRGER
  // ----------------------------------------------------------
  aufenthaltsrecht: {
    /**
     * Sperrfrist in Monaten für den Leistungsbezug:
     * In den ersten X Monaten kein Anspruch ohne Arbeitnehmerstatus.
     */
    sperrfristMonate: 3,

    /**
     * Mindest-Wochenstunden für anerkannten Arbeitnehmerstatus
     * (unterhalb: geringfügig, Arbeitnehmereigenschaft fraglich).
     */
    mindestStundenArbeitnehmer: 10,

    /**
     * Mindest-Bruttoeinkommen in €/Monat für klaren Arbeitnehmerstatus.
     * Orientierung: Minijob-Grenze (538 €) als Untergrenze.
     */
    mindestEinkommenArbeitnehmer: 538,

    /**
     * Aufenthaltsdauer in Monaten, nach der das Daueraufenthaltsrecht
     * nach § 4a FreizügG/EU entsteht (= 5 Jahre).
     */
    daueraufenthaltsrechtMonate: 60,

    /**
     * Frist in Monaten: Nach dieser Zeit ohne Nachweis ernsthafter
     * Arbeitssuche kann das Aufenthaltsrecht als Arbeitsuchender erlöschen.
     */
    arbeitssucheMaxMonate: 6,
  },

  // ----------------------------------------------------------
  // TEXTE — Standardhinweise für die Ergebnisanzeige
  // ----------------------------------------------------------
  hinweise: {
    auslaenderbehoerde:
      'Bitte Aufenthaltsstatus mit der zuständigen Ausländerbehörde abstimmen.',
    bafoegDarlehen:
      'Solange über den BAföG-Antrag nicht entschieden wurde, kann ein Darlehen nach § 27 SGB II in Betracht kommen.',
    sgbXII:
      'Ggf. Prüfung auf Leistungen nach SGB XII (Sozialhilfe / Grundsicherung im Alter) veranlassen.',
    rechtsstand:
      'Dieses Tool ist ein Prüfhilfsmittel und ersetzt keine rechtlich verbindliche Einzelfallentscheidung. Rechtsstand: 01.01.2024.',
  },

};

window.CONFIG = CONFIG;
