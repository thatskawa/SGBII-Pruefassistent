/**
 * ============================================================
 *  SGB II Prüfassistent — Konfigurationsdatei
 *  config.js
 *
 *  HINWEIS FÜR FACHKRÄFTE:
 *  Alle anpassbaren Werte sind hier zentral hinterlegt.
 *  Bitte nur diese Datei bearbeiten, wenn sich Grenzwerte,
 *  Beträge oder Fristen gesetzlich ändern.
 *  Stand: SGB II, gültig ab 01.01.2024
 * ============================================================
 */

const CONFIG = {

  // ----------------------------------------------------------
  // § 7 Abs. 1 SGB II — GRUNDVORAUSSETZUNGEN
  // ----------------------------------------------------------

  alter: {
    /** Mindestalter für Leistungsbezug (Jahre) */
    minimum: 15,

    /** Regelaltersgrenze: ab diesem Alter greift Rentenrecht (Jahre) */
    regelaltersgrenze: 67,
  },

  // ----------------------------------------------------------
  // REGELBEDARFE (§ 20 SGB II) — Beträge in Euro/Monat
  // Stand: 01.01.2024
  // ----------------------------------------------------------

  regelbedarfe: {
    /** Alleinstehende / Alleinerziehende (Regelbedarfsstufe 1) */
    stufe1: 563,

    /** Personen in Partnerschaften, je Person (Regelbedarfsstufe 2) */
    stufe2: 506,

    /** Jugendliche 14–17 Jahre (Regelbedarfsstufe 4) */
    stufe4: 471,

    /** Kinder 6–13 Jahre (Regelbedarfsstufe 5) */
    stufe5: 390,

    /** Kinder 0–5 Jahre (Regelbedarfsstufe 6) */
    stufe6: 357,
  },

  // ----------------------------------------------------------
  // VERMÖGENSGRENZEN (§ 12 SGB II) — Beträge in Euro
  // ----------------------------------------------------------

  vermoegen: {
    /**
     * Grundfreibetrag je Mitglied der Bedarfsgemeinschaft.
     * Wird mit Anzahl der Personen multipliziert.
     */
    grundfreibetragProPerson: 15000,

    /** Zusätzlicher Freibetrag für notwendige Anschaffungen */
    anschaffungsfreibetrag: 750,

    /** Altersvorsorge-Freibetrag je Person (§ 12 Abs. 2 Nr. 3 SGB II) */
    altersvorsorgeFreibetragProPerson: 750,

    /**
     * Multiplikator für den Altersvorsorge-Freibetrag:
     * 750 € × vollendete Lebensjahre, max. Gesamtbetrag prüfen
     */
    altersvorsorgeFreibetragJeLebensjahr: 750,
  },

  // ----------------------------------------------------------
  // EINKOMMENSFREIBETRÄGE (§ 11b SGB II) — in Euro oder Prozent
  // ----------------------------------------------------------

  einkommensfreibetraege: {
    /** Grundabsetzungsbetrag (§ 11b Abs. 2 SGB II) in Euro/Monat */
    grundabsetzungsbetrag: 100,

    /**
     * Erwerbstätigenfreibetrag (§ 11b Abs. 3 SGB II):
     * Prozentualer Anteil des Einkommens, der anrechnungsfrei bleibt.
     * Stufe 1: Einkommen zwischen 100 € und 1.000 €
     */
    erwerbstaetigenFreibetragStufe1Prozent: 20,

    /**
     * Stufe 2: Einkommen zwischen 1.000 € und 1.200 €
     * (bzw. 1.500 € bei Kindern im Haushalt)
     */
    erwerbstaetigenFreibetragStufe2Prozent: 10,

    /** Einkommensgrenze Stufe 1 in Euro */
    einkommensgrenzeUntenStufe1: 100,

    /** Einkommensgrenze Stufe 1/2 in Euro */
    einkommensgrenzeObenStufe1: 1000,

    /** Einkommensgrenze Stufe 2 ohne Kinder in Euro */
    einkommensgrenzeObenStufe2OhneKinder: 1200,

    /** Einkommensgrenze Stufe 2 mit Kindern in Euro */
    einkommensgrenzeObenStufe2MitKindern: 1500,
  },

  // ----------------------------------------------------------
  // AUFENTHALTSRECHT / EU-BÜRGER (§ 7 Abs. 1 S. 2 SGB II)
  // ----------------------------------------------------------

  aufenthaltsrecht: {
    /**
     * Sperrfrist für arbeitsuchende EU-Bürger ohne Vorerwerbstätigkeit
     * in Deutschland (Monate seit Einreise).
     * Während der ersten 3 Monate: kein Anspruch auf Bürgergeld.
     */
    ersteDreiMonateSperrfristMonate: 3,

    /**
     * Mindestarbeitszeit pro Woche in Stunden, ab der ein EU-Bürger
     * als „Arbeitnehmer" im Sinne des Freizügigkeitsrechts gilt
     * (unterhalb dieser Grenze: geringfügige Beschäftigung prüfen).
     */
    mindestarbeitsstundenArbeitnehmereigenschaft: 10,

    /**
     * Mindest-Bruttoeinkommen in Euro/Monat, ab dem Arbeitnehmerstatus
     * eindeutig anerkannt wird (orientiert sich an Minijob-Grenze + Puffer).
     */
    mindesteinkommenArbeitnehmereigenschaft: 538,

    /**
     * Aufenthaltsdauer in Monaten, nach der ein dauerhaftes
     * Aufenthaltsrecht (§ 4a FreizügG/EU) entsteht.
     */
    daueraufenthaltsrechtNachMonate: 60,

    /**
     * Nachweis-Frist für Arbeitsuche (Monate):
     * Nach dieser Zeit ohne Nachweis ernsthafter Arbeitssuche
     * erlischt das Aufenthaltsrecht als Arbeitsuchender.
     */
    arbeitssucheNachweisfristMonate: 6,
  },

  // ----------------------------------------------------------
  // BAFÖG / AUSBILDUNGSAUSSCHLUSS (§ 7 Abs. 5 SGB II)
  // ----------------------------------------------------------

  bafoeg: {
    /**
     * Ausschluss bei BAföG-förderfähiger Ausbildung / Studium:
     * true = Ausschluss ist aktiv (Standard nach § 7 Abs. 5 SGB II)
     */
    ausschlussAktiv: true,

    /**
     * Maximale Erkrankungs-/Schwangerschaftsdauer in Monaten,
     * bis zu der kein Ausschlussgrund besteht (Ausnahme § 7 Abs. 6 Nr. 1).
     */
    erkrankungAusnahmedauerMonate: 3,

    /**
     * Ausbildungsarten, die dem Grunde nach BAföG-förderfähig sind.
     * Diese Liste ist für die automatische Vorauswahl relevant.
     */
    foerderfaehigeAusbildungsarten: [
      'vollzeitstudium',
      'ausbildung_dual',
      'ausbildung_schulisch',
      'abendgymnasium',
    ],

    /**
     * Ausbildungsarten, die NICHT BAföG-förderfähig sind
     * (z. B. Teilzeitstudium unter bestimmten Bedingungen).
     */
    nichtFoerderfaehigeAusbildungsarten: [
      'teilzeitstudium',
    ],
  },

  // ----------------------------------------------------------
  // STATIONÄRE UNTERBRINGUNG (§ 7 Abs. 4 SGB II)
  // ----------------------------------------------------------

  stationaer: {
    /**
     * Mindest-Unterbringungsdauer in Monaten, nach der der Anspruch
     * auf Bürgergeld entfällt (§ 7 Abs. 4 SGB II).
     * Kürzere Aufenthalte (z. B. kurze Reha) schließen i. d. R. nicht aus.
     */
    ausschlussAbMonate: 6,
  },

  // ----------------------------------------------------------
  // ERWERBSFÄHIGKEIT (§ 8 SGB II)
  // ----------------------------------------------------------

  erwerbsfaehigkeit: {
    /**
     * Mindest-Arbeitsfähigkeit in Stunden pro Tag,
     * ab der eine Person als erwerbsfähig gilt.
     */
    mindestStundenProTag: 3,
  },

  // ----------------------------------------------------------
  // BEDARFSGEMEINSCHAFT (§ 7 Abs. 3 SGB II)
  // ----------------------------------------------------------

  bedarfsgemeinschaft: {
    /**
     * Maximales Alter minderjähriger Kinder (bis unter X Jahre),
     * die zur Bedarfsgemeinschaft zählen.
     */
    minderjährigesKindBisAlter: 18,

    /**
     * Maximales Alter für in der BG lebende unverheiratete Kinder
     * ohne eigenes Einkommen (§ 7 Abs. 3 Nr. 4 SGB II).
     */
    kindInBGBisAlter: 25,
  },

  // ----------------------------------------------------------
  // TEXTE & HINWEISE (für die Ergebnisanzeige)
  // ----------------------------------------------------------

  hinweise: {
    /** Standardhinweis bei unklarer Aufenthaltssituation */
    auslaenderbehoerdeAbstimmung:
      'Bitte stimmen Sie den Aufenthaltsstatus mit der zuständigen Ausländerbehörde ab.',

    /** Hinweis bei laufendem BAföG-Antrag */
    bafoegAntragAusstehend:
      'Solange über den BAföG-Antrag nicht entschieden wurde, kann ein Darlehen nach § 27 SGB II in Betracht kommen.',

    /** Hinweis bei eingeschränkter Erwerbsfähigkeit */
    eingeschraenktErwerbsfaehig:
      'Bei eingeschränkter Erwerbsfähigkeit ggf. Prüfung auf Leistungen nach SGB XII veranlassen.',

    /** Pflichthinweis Rechtsstand */
    rechtsstandHinweis:
      'Dieses Tool ist ein Prüfhilfsmittel und ersetzt keine rechtlich verbindliche Einzelfallprüfung. Rechtsstand: 01.01.2024.',
  },

};

// Export für andere Module (keine ES-Module, daher globale Variable)
// rule-engine.js und main.js greifen über window.CONFIG zu.
window.CONFIG = CONFIG;
