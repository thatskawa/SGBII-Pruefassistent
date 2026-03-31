/**
 * ============================================================
 *  SGB II Prüfassistent — Rule Engine
 *  rule-engine.js
 *
 *  Enthält ausschließlich Prüflogik nach § 7 SGB II.
 *  KEINE festen Zahlen, Beträge oder Fristen — alle Werte
 *  kommen aus window.CONFIG (config.js).
 *
 *  Modulstruktur:
 *  - pruefeAlter()
 *  - pruefeErwerbsfaehigkeit()
 *  - pruefeAufenthaltsrecht()
 *  - pruefeBafoegAusschluss()
 *  - pruefeStationaereUnterbringung()
 *  - pruefeBeduerftigkeit()
 *  - pruefeFallGesamt()  ← Hauptfunktion
 * ============================================================
 */

/** Ergebnistypen für einzelne Prüfschritte */
const ERGEBNIS = {
  OK: 'ok',           // Voraussetzung erfüllt
  WARNUNG: 'warnung', // Grauzone, weitere Prüfung nötig
  AUSSCHLUSS: 'ausschluss', // Ausschlussgrund festgestellt
  INFO: 'info',       // Neutrale Information
};

// ============================================================
//  HILFSFUNKTIONEN
// ============================================================

/**
 * Erstellt ein standardisiertes Prüfschritt-Objekt.
 * @param {string} kriterium - Bezeichnung des Prüfpunkts
 * @param {string} ergebnis  - Einer der ERGEBNIS-Werte
 * @param {string} begruendung - Erläuterungstext für die Fachkraft
 * @param {string[]} [nachweise=[]] - Liste benötigter Nachweise
 * @returns {object}
 */
function erstellePruefschritt(kriterium, ergebnis, begruendung, nachweise = []) {
  return { kriterium, ergebnis, begruendung, nachweise };
}

/**
 * Berechnet den Gesamtbedarf (Regelbedarf) der Bedarfsgemeinschaft.
 * @param {object} fall - Falldaten
 * @returns {number} - Gesamtbedarf in Euro
 */
function berechneGesamtbedarf(fall) {
  const rb = CONFIG.regelbedarfe;
  const familienstand = fall.familienstand;
  const anzahlKinder = parseInt(fall.anzahlKinder) || 0;

  let bedarf = 0;

  // Hauptperson
  if (familienstand === 'verheiratet' || familienstand === 'lebenspartnerschaft') {
    // Partnerschaften: Stufe 2 für beide Partner
    bedarf += rb.stufe2 * 2;
  } else {
    // Alleinstehend oder Alleinerziehend: Stufe 1
    bedarf += rb.stufe1;
  }

  // Kinder: vereinfachte Berechnung (Durchschnitt Stufe 4–6)
  // In einem produktiven System würde man das Alter jedes Kindes eingeben
  const kinderRegelbedarf = anzahlKinder * rb.stufe5; // Annahme: mittlere Stufe
  bedarf += kinderRegelbedarf;

  return bedarf;
}

/**
 * Berechnet das anrechenbare Einkommen nach § 11b SGB II.
 * @param {number} nettoEinkommen - monatliches Nettoeinkommen in Euro
 * @param {boolean} hatKinder - ob Kinder im Haushalt vorhanden
 * @returns {number} - anrechenbares Einkommen in Euro
 */
function berechneAnrechenboresEinkommen(nettoEinkommen, hatKinder) {
  const freibetraege = CONFIG.einkommensfreibetraege;
  const einkommen = parseFloat(nettoEinkommen) || 0;

  if (einkommen <= 0) return 0;

  let freibetrag = 0;

  // Grundabsetzungsbetrag
  if (einkommen > freibetraege.einkommensgrenzeUntenStufe1) {
    freibetrag += freibetraege.grundabsetzungsbetrag;

    // Stufe 1: 20 % auf Einkommen zwischen 100 € und 1.000 €
    const stufe1Basis = Math.min(einkommen, freibetraege.einkommensgrenzeObenStufe1)
      - freibetraege.einkommensgrenzeUntenStufe1;
    freibetrag += stufe1Basis * (freibetraege.erwerbstaetigenFreibetragStufe1Prozent / 100);

    // Stufe 2: 10 % auf Einkommen zwischen 1.000 € und 1.200/1.500 €
    const obergrenzeStudfe2 = hatKinder
      ? freibetraege.einkommensgrenzeObenStufe2MitKindern
      : freibetraege.einkommensgrenzeObenStufe2OhneKinder;

    if (einkommen > freibetraege.einkommensgrenzeObenStufe1) {
      const stufe2Basis = Math.min(einkommen, obergrenzeStudfe2)
        - freibetraege.einkommensgrenzeObenStufe1;
      freibetrag += stufe2Basis * (freibetraege.erwerbstaetigenFreibetragStufe2Prozent / 100);
    }
  }

  return Math.max(0, einkommen - freibetrag);
}

/**
 * Berechnet den Vermögensfreibetrag für die Bedarfsgemeinschaft.
 * @param {number} anzahlPersonen - Anzahl Personen in der BG
 * @param {number} alter - Alter der antragstellenden Person (Jahre)
 * @returns {number} - Freibetrag in Euro
 */
function berechneVermoegensfreibetrag(anzahlPersonen, alter) {
  const vg = CONFIG.vermoegen;
  const grundfreibetrag = vg.grundfreibetragProPerson * anzahlPersonen;
  const anschaffungsfreibetrag = vg.anschaffungsfreibetrag;

  // Altersvorsorge-Freibetrag: 750 € × vollendete Lebensjahre
  const altersvorsorgeFreibetrag = Math.min(
    vg.altersvorsorgeFreibetragJeLebensjahr * (parseInt(alter) || 0),
    vg.altersvorsorgeFreibetragProPerson * anzahlPersonen
  );

  return grundfreibetrag + anschaffungsfreibetrag + altersvorsorgeFreibetrag;
}

// ============================================================
//  PRÜFMODULE
// ============================================================

/**
 * Prüft das Alter der Person (§ 7 Abs. 1 Nr. 1 SGB II).
 * @param {object} fall - Falldaten
 * @returns {object} - Prüfschritt-Objekt
 */
function pruefeAlter(fall) {
  const alter = parseInt(fall.alter);
  const min = CONFIG.alter.minimum;
  const max = CONFIG.alter.regelaltersgrenze;

  if (isNaN(alter)) {
    return erstellePruefschritt(
      'Altersvoraussetzung (§ 7 Abs. 1 Nr. 1 SGB II)',
      ERGEBNIS.WARNUNG,
      'Kein Alter angegeben. Bitte Alter der Person erfassen.'
    );
  }

  if (alter < min) {
    return erstellePruefschritt(
      'Altersvoraussetzung (§ 7 Abs. 1 Nr. 1 SGB II)',
      ERGEBNIS.AUSSCHLUSS,
      `Person ist ${alter} Jahre alt. Mindestalter für Bürgergeld: ${min} Jahre. Kein Anspruch.`
    );
  }

  if (alter >= max) {
    return erstellePruefschritt(
      'Altersvoraussetzung (§ 7 Abs. 1 Nr. 1 SGB II)',
      ERGEBNIS.AUSSCHLUSS,
      `Person hat die Regelaltersgrenze (${max} Jahre) erreicht oder überschritten. Leistungen nach SGB XII (Grundsicherung im Alter) prüfen.`
    );
  }

  return erstellePruefschritt(
    'Altersvoraussetzung (§ 7 Abs. 1 Nr. 1 SGB II)',
    ERGEBNIS.OK,
    `Alter (${alter} Jahre) liegt im Leistungsbereich (${min}–unter ${max} Jahre).`
  );
}

/**
 * Prüft die Erwerbsfähigkeit (§ 7 Abs. 1 Nr. 2, § 8 SGB II).
 * @param {object} fall - Falldaten
 * @returns {object} - Prüfschritt-Objekt
 */
function pruefeErwerbsfaehigkeit(fall) {
  const erwerbsfaehig = fall.erwerbsfaehigkeit;
  const minStunden = CONFIG.erwerbsfaehigkeit.mindestStundenProTag;

  if (!erwerbsfaehig) {
    return erstellePruefschritt(
      'Erwerbsfähigkeit (§ 7 Abs. 1 Nr. 2, § 8 SGB II)',
      ERGEBNIS.WARNUNG,
      'Erwerbsfähigkeit nicht angegeben.'
    );
  }

  switch (erwerbsfaehig) {
    case 'ja':
      return erstellePruefschritt(
        'Erwerbsfähigkeit (§ 7 Abs. 1 Nr. 2, § 8 SGB II)',
        ERGEBNIS.OK,
        `Person ist erwerbsfähig (mindestens ${minStunden} Stunden/Tag unter den üblichen Bedingungen des Arbeitsmarkts).`
      );

    case 'nein':
      return erstellePruefschritt(
        'Erwerbsfähigkeit (§ 7 Abs. 1 Nr. 2, § 8 SGB II)',
        ERGEBNIS.AUSSCHLUSS,
        'Person ist nicht erwerbsfähig. Kein Anspruch auf Bürgergeld (SGB II). Prüfung auf Sozialhilfe / Grundsicherung nach SGB XII erforderlich.',
        ['Ärztliches Attest', 'Gutachten der Rentenversicherung oder des ärztlichen Dienstes']
      );

    case 'eingeschraenkt':
      return erstellePruefschritt(
        'Erwerbsfähigkeit (§ 7 Abs. 1 Nr. 2, § 8 SGB II)',
        ERGEBNIS.WARNUNG,
        CONFIG.hinweise.eingeschraenktErwerbsfaehig,
        ['Ärztliches Attest', 'Ggf. Gutachten zum Leistungsvermögen']
      );

    default:
      return erstellePruefschritt(
        'Erwerbsfähigkeit (§ 7 Abs. 1 Nr. 2, § 8 SGB II)',
        ERGEBNIS.WARNUNG,
        'Erwerbsfähigkeitsstatus unklar. Bitte konkretisieren.'
      );
  }
}

/**
 * Prüft das Aufenthaltsrecht für EU-Bürger (§ 7 Abs. 1 S. 2 SGB II).
 * @param {object} fall - Falldaten
 * @returns {object[]} - Array von Prüfschritt-Objekten
 */
function pruefeAufenthaltsrecht(fall) {
  const schritte = [];
  const staatsangehoerigkeit = fall.staatsangehoerigkeit;

  // Prüfung nur bei EU-Bürgern relevant
  if (staatsangehoerigkeit === 'deutschland') {
    schritte.push(erstellePruefschritt(
      'Aufenthaltsrecht (§ 7 Abs. 1 S. 2 SGB II)',
      ERGEBNIS.OK,
      'Deutsche Staatsangehörige unterliegen keinen freizügigkeitsrechtlichen Einschränkungen.'
    ));
    return schritte;
  }

  if (staatsangehoerigkeit === 'drittstaat') {
    schritte.push(erstellePruefschritt(
      'Aufenthaltsrecht / Drittstaatangehörige',
      ERGEBNIS.WARNUNG,
      'Bei Drittstaatangehörigen ist der konkrete Aufenthaltstitel maßgeblich. Ausschlüsse gem. § 7 Abs. 1 S. 2 Nr. 3, § 8 Abs. 2 AufenthG prüfen.',
      ['Aufenthaltstitel / Niederlassungserlaubnis', 'Ggf. Abstimmung mit Ausländerbehörde']
    ));
    return schritte;
  }

  // ---- AB HIER: EU-Bürger ----
  const cfg = CONFIG.aufenthaltsrecht;
  const aufenthaltsdauerMonate = parseInt(fall.aufenthaltsdauerMonate) || 0;
  const aufenthaltsStatus = fall.aufenthaltsStatus;
  const wochenstunden = parseFloat(fall.wochenstunden) || 0;
  const bruttoEinkommen = parseFloat(fall.bruttoEinkommen) || 0;
  const istUnbefristet = fall.istUnbefristet === true;

  // Prüfe: Daueraufenthaltsrecht nach 5 Jahren?
  if (aufenthaltsdauerMonate >= cfg.daueraufenthaltsrechtNachMonate) {
    schritte.push(erstellePruefschritt(
      'Daueraufenthaltsrecht (§ 4a FreizügG/EU)',
      ERGEBNIS.OK,
      `Aufenthaltsdauer (${aufenthaltsdauerMonate} Monate) überschreitet die Grenze für das Daueraufenthaltsrecht (${cfg.daueraufenthaltsrechtNachMonate} Monate = 5 Jahre). Freizügigkeitsrechtliche Einschränkungen entfallen.`,
      ['Nachweis der 5-jährigen rechtmäßigen Aufenthaltsdauer (z. B. Bescheinigung gem. § 5 FreizügG/EU)']
    ));
    return schritte;
  }

  // Prüfe: Erste 3 Monate
  if (aufenthaltsdauerMonate < cfg.ersteDreiMonateSperrfristMonate) {
    if (aufenthaltsStatus !== 'arbeitnehmer' && aufenthaltsStatus !== 'selbststaendig') {
      schritte.push(erstellePruefschritt(
        'Sperrfrist erste 3 Monate (§ 7 Abs. 1 S. 2 Nr. 1 SGB II)',
        ERGEBNIS.AUSSCHLUSS,
        `Person hält sich erst seit ${aufenthaltsdauerMonate} Monat(en) in Deutschland auf. In den ersten ${cfg.ersteDreiMonateSperrfristMonate} Monaten besteht ohne Arbeitnehmerstatus kein Anspruch auf Bürgergeld.`
      ));
      return schritte;
    }
  }

  // Status: Arbeitnehmer
  if (aufenthaltsStatus === 'arbeitnehmer') {
    const hatAusreichendeStunden = wochenstunden >= cfg.mindestarbeitsstundenArbeitnehmereigenschaft;
    const hatAusreichendesEinkommen = bruttoEinkommen >= cfg.mindesteinkommenArbeitnehmereigenschaft;

    if (hatAusreichendeStunden && hatAusreichendesEinkommen) {
      schritte.push(erstellePruefschritt(
        'Arbeitnehmerstatus (§ 2 Abs. 2 Nr. 1 FreizügG/EU)',
        ERGEBNIS.OK,
        `Arbeitnehmerstatus plausibel: ${wochenstunden} Std./Woche, ${bruttoEinkommen} € Brutto/Monat (Mindestgrenzen: ${cfg.mindestarbeitsstundenArbeitnehmereigenschaft} Std. / ${cfg.mindesteinkommenArbeitnehmereigenschaft} €).`,
        ['Arbeitsvertrag', 'Aktuelle Gehaltsabrechnungen (letzten 3 Monate)', 'Kontoauszüge']
      ));
    } else if (!hatAusreichendeStunden || !hatAusreichendesEinkommen) {
      schritte.push(erstellePruefschritt(
        'Arbeitnehmerstatus (§ 2 Abs. 2 Nr. 1 FreizügG/EU)',
        ERGEBNIS.WARNUNG,
        `Arbeitnehmerstatus fraglich: Nur ${wochenstunden} Std./Woche und/oder ${bruttoEinkommen} € Brutto/Monat. Prüfung, ob die Tätigkeit "tatsächlich und echt" ist (EuGH-Rechtsprechung). Ggf. geringfügige Beschäftigung ohne qualifizierten Arbeitnehmerstatus.`,
        ['Arbeitsvertrag', 'Gehaltsabrechnungen', 'Kontoauszüge', 'Ggf. Stellungnahme Arbeitgeber']
      ));
    }

    // Nachwirkender Arbeitnehmerstatus (§ 2 Abs. 3 FreizügG/EU)
    if (!istUnbefristet) {
      schritte.push(erstellePruefschritt(
        'Nachwirkender Arbeitnehmerstatus bei befristeter Beschäftigung',
        ERGEBNIS.INFO,
        'Bei befristeter Beschäftigung: Nach Beschäftigungsende bleibt Arbeitnehmerstatus für weitere 6 Monate erhalten, wenn Arbeit unfreiwillig aufgegeben wurde (§ 2 Abs. 3 Nr. 2 FreizügG/EU).'
      ));
    }
    return schritte;
  }

  // Status: Selbstständig
  if (aufenthaltsStatus === 'selbststaendig') {
    schritte.push(erstellePruefschritt(
      'Selbstständigkeit (§ 2 Abs. 2 Nr. 2 FreizügG/EU)',
      ERGEBNIS.WARNUNG,
      'Selbstständige EU-Bürger haben grundsätzlich Freizügigkeit. Die Tatsächlichkeit der selbstständigen Tätigkeit ist zu belegen. Prüfen, ob Einkommen tatsächlich erzielt wird.',
      ['Gewerbeanmeldung oder Handelsregistereintrag', 'Steuerbescheid / Einnahmen-Ausgaben-Rechnung', 'Kontoauszüge']
    ));
    return schritte;
  }

  // Status: Arbeitsuchend
  if (aufenthaltsStatus === 'arbeitsuchend') {
    if (aufenthaltsdauerMonate < cfg.ersteDreiMonateSperrfristMonate) {
      schritte.push(erstellePruefschritt(
        'Aufenthaltsrecht als Arbeitsuchender (§ 7 Abs. 1 S. 2 Nr. 2 SGB II)',
        ERGEBNIS.AUSSCHLUSS,
        `Aufenthalt als Arbeitsuchender: Kein Anspruch in den ersten ${cfg.ersteDreiMonateSperrfristMonate} Monaten.`
      ));
    } else if (aufenthaltsdauerMonate > cfg.arbeitssucheNachweisfristMonate) {
      schritte.push(erstellePruefschritt(
        'Aufenthaltsrecht als Arbeitsuchender — Nachweisfrist',
        ERGEBNIS.WARNUNG,
        `Aufenthalt als Arbeitsuchender dauert bereits ${aufenthaltsdauerMonate} Monate. Nach ${cfg.arbeitssucheNachweisfristMonate} Monaten ohne ernsthafte Bemühungen kann das Aufenthaltsrecht erlöschen. Bitte Nachweise zur Arbeitssuche prüfen.`,
        ['Bewerbungsunterlagen', 'Nachweise über Arbeitssuchend-Meldung', CONFIG.hinweise.auslaenderbehoerdeAbstimmung]
      ));
    } else {
      schritte.push(erstellePruefschritt(
        'Aufenthaltsrecht als Arbeitsuchender',
        ERGEBNIS.WARNUNG,
        `Aufenthaltsrecht als Arbeitsuchender (§ 2 Abs. 2 Nr. 1a FreizügG/EU): Kein Anspruch auf Bürgergeld nach § 7 Abs. 1 S. 2 Nr. 2 SGB II, sofern keine Vorerwerbstätigkeit in Deutschland nachgewiesen. Ausschluss prüfen.`,
        [CONFIG.hinweise.auslaenderbehoerdeAbstimmung, 'Nachweis über Arbeitssuche']
      ));
    }
    return schritte;
  }

  // Status: Familienangehöriger
  if (aufenthaltsStatus === 'familienangehoerig') {
    schritte.push(erstellePruefschritt(
      'Aufenthaltsrecht als Familienangehöriger (§ 3 FreizügG/EU)',
      ERGEBNIS.WARNUNG,
      'Familienangehörige leiten ihr Aufenthaltsrecht vom freizügigkeitsberechtigten EU-Bürger ab. Prüfen: Besteht das Aufenthaltsrecht des stammberechtigten EU-Bürgers fort? Ggf. Ausschluss nach § 7 Abs. 1 S. 2 Nr. 2 SGB II.',
      ['Nachweis der Familienbeziehung (Heiratsurkunde, Geburtsurkunde)', 'Aufenthaltsstatus des stammberechtigten EU-Bürgers klären', CONFIG.hinweise.auslaenderbehoerdeAbstimmung]
    ));
    return schritte;
  }

  // Sonstiges / unklar
  schritte.push(erstellePruefschritt(
    'Aufenthaltsrecht (Status unklar)',
    ERGEBNIS.WARNUNG,
    'Aufenthaltsstatus nicht eindeutig zuzuordnen. Einzelfallprüfung erforderlich.',
    [CONFIG.hinweise.auslaenderbehoerdeAbstimmung]
  ));
  return schritte;
}

/**
 * Prüft den BAföG-Ausschluss (§ 7 Abs. 5 SGB II).
 * @param {object} fall - Falldaten
 * @returns {object} - Prüfschritt-Objekt
 */
function pruefeBafoegAusschluss(fall) {
  const inAusbildung = fall.inAusbildung;

  if (!inAusbildung || inAusbildung === 'nein') {
    return erstellePruefschritt(
      'Ausbildungs-/BAföG-Ausschluss (§ 7 Abs. 5 SGB II)',
      ERGEBNIS.OK,
      'Keine Ausbildung oder Studium angegeben. Ausschlussgrund nach § 7 Abs. 5 SGB II liegt nicht vor.'
    );
  }

  const ausbildungsart = fall.ausbildungsart;
  const bafoegFoerderfaehig = fall.bafoegFoerderfaehig;
  const ausbildungsStatus = fall.ausbildungsStatus;
  const cfg = CONFIG.bafoeg;

  // Automatische Ermittlung der BAföG-Förderfähigkeit
  let istFoerderfaehig = bafoegFoerderfaehig; // kann manuell überschrieben sein

  if (istFoerderfaehig === null || istFoerderfaehig === undefined || istFoerderfaehig === 'auto') {
    // Automatisch ermitteln
    if (cfg.foerderfaehigeAusbildungsarten.includes(ausbildungsart)) {
      istFoerderfaehig = true;
    } else if (cfg.nichtFoerderfaehigeAusbildungsarten.includes(ausbildungsart)) {
      istFoerderfaehig = false;
    } else {
      istFoerderfaehig = 'unklar';
    }
  }

  if (istFoerderfaehig === false) {
    return erstellePruefschritt(
      'Ausbildungs-/BAföG-Ausschluss (§ 7 Abs. 5 SGB II)',
      ERGEBNIS.OK,
      'Ausbildung/Studium ist dem Grunde nach nicht BAföG-förderfähig. Kein Ausschluss nach § 7 Abs. 5 SGB II.'
    );
  }

  if (istFoerderfaehig === 'unklar') {
    return erstellePruefschritt(
      'Ausbildungs-/BAföG-Ausschluss (§ 7 Abs. 5 SGB II)',
      ERGEBNIS.WARNUNG,
      'BAföG-Förderfähigkeit nicht eindeutig. Bitte manuell prüfen und ggf. BAföG-Amt konsultieren.',
      ['Immatrikulationsbescheinigung', 'Ausbildungsvertrag', 'Ggf. Auskunft BAföG-Amt']
    );
  }

  // Ausbildung ist BAföG-förderfähig — Ausnahmen prüfen
  if (!cfg.ausschlussAktiv) {
    return erstellePruefschritt(
      'Ausbildungs-/BAföG-Ausschluss (§ 7 Abs. 5 SGB II)',
      ERGEBNIS.WARNUNG,
      'Ausschlussregel nach § 7 Abs. 5 SGB II ist in der Konfiguration deaktiviert. Bitte manuell prüfen.'
    );
  }

  // Ausnahmen nach § 7 Abs. 6 SGB II prüfen
  if (ausbildungsStatus === 'beurlaubt') {
    return erstellePruefschritt(
      'Ausnahme: Beurlaubung (§ 7 Abs. 6 Nr. 2 SGB II)',
      ERGEBNIS.WARNUNG,
      'Person ist beurlaubt. Ausschluss nach § 7 Abs. 5 SGB II entfällt ggf. bei Beurlaubung — Einzelfallprüfung erforderlich.',
      ['Beurlaubungsbescheid der Hochschule/Berufsschule']
    );
  }

  if (ausbildungsStatus === 'krank_schwanger') {
    return erstellePruefschritt(
      'Ausnahme: Krankheit / Schwangerschaft (§ 7 Abs. 6 Nr. 1 SGB II)',
      ERGEBNIS.WARNUNG,
      `Ausnahme bei Krankheit oder Schwangerschaft möglich, wenn Dauer voraussichtlich nicht mehr als ${cfg.erkrankungAusnahmedauerMonate} Monate überschreitet. Prüfung im Einzelfall.`,
      ['Ärztliches Attest', 'Voraussichtliches Ende der Erkrankung/Schwangerschaft']
    );
  }

  if (ausbildungsStatus === 'bafoeg_ausstehend') {
    return erstellePruefschritt(
      'BAföG-Antrag gestellt, noch nicht entschieden',
      ERGEBNIS.WARNUNG,
      CONFIG.hinweise.bafoegAntragAusstehend,
      ['BAföG-Antragsbescheid (Eingangsbestätigung)', 'Ggf. Darlehen nach § 27 SGB II prüfen']
    );
  }

  // Normaler Ausschluss
  if (ausbildungsStatus === 'immatrikuliert') {
    return erstellePruefschritt(
      'Ausschluss wegen Ausbildung/Studium (§ 7 Abs. 5 SGB II)',
      ERGEBNIS.AUSSCHLUSS,
      `Person ist immatrikuliert/in Ausbildung und die Ausbildung ist dem Grunde nach BAföG-förderfähig. Anspruch auf Bürgergeld ist nach § 7 Abs. 5 SGB II ausgeschlossen. Ausnahmen nach § 7 Abs. 6 SGB II liegen nicht vor.`,
      ['Immatrikulationsbescheinigung', 'Ausbildungsvertrag', 'BAföG-Bescheid']
    );
  }

  return erstellePruefschritt(
    'Ausbildungs-/BAföG-Ausschluss (§ 7 Abs. 5 SGB II)',
    ERGEBNIS.WARNUNG,
    'Ausbildungsstatus nicht eindeutig. Bitte Ausschluss nach § 7 Abs. 5 SGB II manuell prüfen.',
    ['Immatrikulationsbescheinigung', 'Ausbildungsvertrag']
  );
}

/**
 * Prüft den Ausschluss bei stationärer Unterbringung (§ 7 Abs. 4 SGB II).
 * @param {object} fall - Falldaten
 * @returns {object} - Prüfschritt-Objekt
 */
function pruefeStationaereUnterbringung(fall) {
  const stationaer = fall.stationaereUnterbringung;
  const cfg = CONFIG.stationaer;

  if (!stationaer || stationaer === 'nein') {
    return erstellePruefschritt(
      'Stationäre Unterbringung (§ 7 Abs. 4 SGB II)',
      ERGEBNIS.OK,
      'Keine stationäre Unterbringung angegeben. Ausschlussgrund nach § 7 Abs. 4 SGB II liegt nicht vor.'
    );
  }

  const dauerMonate = parseInt(fall.stationaerDauerMonate) || 0;

  if (dauerMonate >= cfg.ausschlussAbMonate) {
    return erstellePruefschritt(
      'Stationäre Unterbringung (§ 7 Abs. 4 SGB II)',
      ERGEBNIS.AUSSCHLUSS,
      `Stationäre Unterbringung seit ${dauerMonate} Monaten (Ausschluss ab ${cfg.ausschlussAbMonate} Monaten). Kein Anspruch auf Bürgergeld nach § 7 Abs. 4 SGB II.`,
      ['Nachweis über stationäre Unterbringung', 'Einweisungsbescheid / Krankenhausbestätigung']
    );
  }

  return erstellePruefschritt(
    'Stationäre Unterbringung (§ 7 Abs. 4 SGB II)',
    ERGEBNIS.WARNUNG,
    `Stationäre Unterbringung angegeben (${dauerMonate} Monate). Ausschluss erst ab ${cfg.ausschlussAbMonate} Monaten. Einzelfallprüfung empfohlen.`,
    ['Nachweis über Art und Dauer der Unterbringung']
  );
}

/**
 * Prüft die Hilfebedürftigkeit (§§ 9, 11, 12 SGB II).
 * @param {object} fall - Falldaten
 * @returns {object[]} - Array von Prüfschritt-Objekten
 */
function pruefeBeduerftigkeit(fall) {
  const schritte = [];
  const nettoEinkommen = parseFloat(fall.nettoEinkommen) || 0;
  const vermoegen = parseFloat(fall.vermoegen) || 0;
  const alter = parseInt(fall.alter) || 30;
  const hatKinder = (parseInt(fall.anzahlKinder) || 0) > 0;

  // Anzahl Personen in der BG ermitteln (vereinfacht)
  let anzahlPersonenBG = 1;
  if (fall.familienstand === 'verheiratet' || fall.familienstand === 'lebenspartnerschaft') {
    anzahlPersonenBG = 2;
  }
  anzahlPersonenBG += parseInt(fall.anzahlKinder) || 0;

  // Bedarf berechnen
  const gesamtbedarf = berechneGesamtbedarf(fall);

  // Anrechenbares Einkommen berechnen
  const anrechenbaresEinkommen = berechneAnrechenboresEinkommen(nettoEinkommen, hatKinder);

  // Einkommens-Prüfung
  if (anrechenbaresEinkommen >= gesamtbedarf) {
    schritte.push(erstellePruefschritt(
      'Hilfebedürftigkeit: Einkommen (§ 9 Abs. 1 SGB II)',
      ERGEBNIS.AUSSCHLUSS,
      `Anrechenbares Einkommen (${anrechenbaresEinkommen.toFixed(2)} €) deckt den Gesamtbedarf (${gesamtbedarf.toFixed(2)} €) vollständig. Keine Hilfebedürftigkeit. (Nettoeinkommen: ${nettoEinkommen} €, Freibetrag berücksichtigt)`
    ));
  } else {
    const luecke = gesamtbedarf - anrechenbaresEinkommen;
    schritte.push(erstellePruefschritt(
      'Hilfebedürftigkeit: Einkommen (§ 9 Abs. 1 SGB II)',
      ERGEBNIS.OK,
      `Hilfebedürftigkeit durch Einkommen gegeben: Bedarf (${gesamtbedarf.toFixed(2)} €) übersteigt anrechenbares Einkommen (${anrechenbaresEinkommen.toFixed(2)} €). Unterdeckung: ca. ${luecke.toFixed(2)} €/Monat.`
    ));
  }

  // Vermögens-Prüfung
  const vermoegensFreibetrag = berechneVermoegensfreibetrag(anzahlPersonenBG, alter);

  if (vermoegen > vermoegensFreibetrag) {
    schritte.push(erstellePruefschritt(
      'Hilfebedürftigkeit: Vermögen (§ 12 SGB II)',
      ERGEBNIS.AUSSCHLUSS,
      `Verwertbares Vermögen (${vermoegen.toFixed(2)} €) überschreitet den Freibetrag (${vermoegensFreibetrag.toFixed(2)} €). Vorrangige Vermögensverwertung erforderlich.`,
      ['Vermögensnachweise (Kontoauszüge, Sparbücher, Depotauszüge)', 'Nachweise über geschütztes Vermögen (Altersvorsorge etc.)']
    ));
  } else {
    schritte.push(erstellePruefschritt(
      'Hilfebedürftigkeit: Vermögen (§ 12 SGB II)',
      ERGEBNIS.OK,
      `Vermögen (${vermoegen.toFixed(2)} €) liegt unterhalb des Freibetrags (${vermoegensFreibetrag.toFixed(2)} €) für ${anzahlPersonenBG} Person(en).`,
      ['Vermögensnachweise zum Nachweis der Hilfebedürftigkeit vorlegen']
    ));
  }

  return schritte;
}

// ============================================================
//  HAUPTFUNKTION
// ============================================================

/**
 * Führt die vollständige Prüfung nach § 7 SGB II durch.
 * @param {object} fall - Alle Eingabedaten aus dem Formular
 * @returns {object} - Gesamtergebnis mit allen Prüfschritten und Ampelstatus
 */
function pruefeFallGesamt(fall) {
  const allePruefschritte = [];

  // 1. Altersvoraussetzung
  allePruefschritte.push(pruefeAlter(fall));

  // 2. Erwerbsfähigkeit
  allePruefschritte.push(pruefeErwerbsfaehigkeit(fall));

  // 3. Aufenthaltsrecht (nur bei EU- oder Drittstaatler relevant)
  if (fall.staatsangehoerigkeit && fall.staatsangehoerigkeit !== 'deutschland') {
    const aufenthaltsschritte = pruefeAufenthaltsrecht(fall);
    allePruefschritte.push(...aufenthaltsschritte);
  } else if (fall.staatsangehoerigkeit === 'deutschland') {
    allePruefschritte.push(...pruefeAufenthaltsrecht(fall));
  }

  // 4. BAföG-Ausschluss (nur wenn Ausbildung angegeben)
  if (fall.inAusbildung === 'ja') {
    allePruefschritte.push(pruefeBafoegAusschluss(fall));
  }

  // 5. Stationäre Unterbringung
  allePruefschritte.push(pruefeStationaereUnterbringung(fall));

  // 6. Hilfebedürftigkeit
  const beduerftigkeitsschritte = pruefeBeduerftigkeit(fall);
  allePruefschritte.push(...beduerftigkeitsschritte);

  // Gesamtergebnis ermitteln (Ampel)
  const hatAusschluss = allePruefschritte.some(s => s.ergebnis === ERGEBNIS.AUSSCHLUSS);
  const hatWarnung = allePruefschritte.some(s => s.ergebnis === ERGEBNIS.WARNUNG);

  let ampelStatus;
  let ampelText;
  let ampelBeschreibung;

  if (hatAusschluss) {
    ampelStatus = 'rot';
    ampelText = 'Ausschluss wahrscheinlich';
    ampelBeschreibung = 'Es wurden ein oder mehrere Ausschlussgründe nach § 7 SGB II festgestellt. Ein Leistungsanspruch besteht voraussichtlich nicht. Bitte alle Punkte sorgfältig prüfen.';
  } else if (hatWarnung) {
    ampelStatus = 'gelb';
    ampelText = 'Weitere Prüfung erforderlich';
    ampelBeschreibung = 'Es bestehen ungeklärte Punkte oder Graubereiche. Eine abschließende Entscheidung ist erst nach vollständiger Sachverhaltsaufklärung möglich.';
  } else {
    ampelStatus = 'gruen';
    ampelText = 'Anspruch wahrscheinlich';
    ampelBeschreibung = 'Die geprüften Voraussetzungen nach § 7 SGB II sind voraussichtlich erfüllt. Bitte alle erforderlichen Nachweise anfordern und die formelle Antragsprüfung abschließen.';
  }

  // Alle benötigten Nachweise zusammenstellen (dedupliziert)
  const alleNachweise = [...new Set(
    allePruefschritte.flatMap(s => s.nachweise || [])
  )];

  return {
    ampelStatus,
    ampelText,
    ampelBeschreibung,
    pruefschritte: allePruefschritte,
    alleNachweise,
    rechtsstandHinweis: CONFIG.hinweise.rechtsstandHinweis,
    pruefzeitpunkt: new Date().toLocaleString('de-DE'),
  };
}

// Globale Verfügbarkeit für main.js
window.pruefeFallGesamt = pruefeFallGesamt;
window.ERGEBNIS = ERGEBNIS;
