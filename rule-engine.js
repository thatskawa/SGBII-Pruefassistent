/**
 * ============================================================
 *  SGB II Prüfassistent — Rule Engine v2
 *  rule-engine.js  |  Fokus: Studierende & EU-Bürger
 *
 *  Alle Grenzwerte ausschließlich aus window.CONFIG.
 *  Keine festen Zahlen im Code.
 *
 *  Exportierte Hauptfunktionen:
 *  - pruefePerson(person)       → Einzelpersonprüfung
 *  - pruefeBedarfsgemeinschaft(bg) → BG-Gesamtprüfung
 * ============================================================
 */

// Ergebnistypen
const ERGEBNIS = {
  OK:          'ok',
  WARNUNG:     'warnung',
  AUSSCHLUSS:  'ausschluss',
  INFO:        'info',
};

// ============================================================
//  HILFSFUNKTION: Prüfschritt-Objekt erstellen
// ============================================================

/**
 * @param {string}   kriterium    - Bezeichnung des Prüfpunkts
 * @param {string}   ergebnis     - ERGEBNIS.*
 * @param {string}   begruendung  - Erläuterung für die Fachkraft
 * @param {string[]} [nachweise]  - Benötigte Dokumente
 * @returns {object}
 */
function schritt(kriterium, ergebnis, begruendung, nachweise = []) {
  return { kriterium, ergebnis, begruendung, nachweise };
}

// ============================================================
//  MODUL 1: ALTERSVORAUSSETZUNG (§ 7 Abs. 1 Nr. 1 SGB II)
// ============================================================

function pruefeAlter(person) {
  const alter = parseInt(person.alter);
  const { minimum, regelaltersgrenze } = CONFIG.alter;

  if (isNaN(alter)) {
    return schritt(
      'Altersvoraussetzung (§ 7 Abs. 1 Nr. 1 SGB II)',
      ERGEBNIS.WARNUNG,
      'Kein Alter angegeben — bitte erfassen.'
    );
  }
  if (alter < minimum) {
    return schritt(
      'Altersvoraussetzung (§ 7 Abs. 1 Nr. 1 SGB II)',
      ERGEBNIS.AUSSCHLUSS,
      `Person ist ${alter} Jahre alt. Mindestalter: ${minimum} Jahre. Kein Anspruch auf Bürgergeld.`
    );
  }
  if (alter >= regelaltersgrenze) {
    return schritt(
      'Altersvoraussetzung (§ 7 Abs. 1 Nr. 1 SGB II)',
      ERGEBNIS.AUSSCHLUSS,
      `Person hat die Regelaltersgrenze (${regelaltersgrenze} Jahre) erreicht. Leistungen nach SGB XII prüfen.`
    );
  }
  return schritt(
    'Altersvoraussetzung (§ 7 Abs. 1 Nr. 1 SGB II)',
    ERGEBNIS.OK,
    `Alter (${alter} Jahre) liegt im Leistungsbereich (${minimum}–unter ${regelaltersgrenze} Jahre).`
  );
}

// ============================================================
//  MODUL 2: ERWERBSFÄHIGKEIT (§ 7 Abs. 1 Nr. 2, § 8 SGB II)
// ============================================================

function pruefeErwerbsfaehigkeit(person) {
  switch (person.erwerbsfaehigkeit) {
    case 'ja':
      return schritt(
        'Erwerbsfähigkeit (§ 8 SGB II)',
        ERGEBNIS.OK,
        'Person ist erwerbsfähig (mind. 3 Stunden täglich unter üblichen Bedingungen).'
      );
    case 'nein':
      return schritt(
        'Erwerbsfähigkeit (§ 8 SGB II)',
        ERGEBNIS.AUSSCHLUSS,
        'Person ist nicht erwerbsfähig. Kein Anspruch auf Bürgergeld (SGB II). Prüfung auf SGB XII erforderlich.',
        ['Ärztliches Attest', 'Ggf. Gutachten ärztlicher Dienst / Rentenversicherung']
      );
    case 'eingeschraenkt':
      return schritt(
        'Erwerbsfähigkeit (§ 8 SGB II)',
        ERGEBNIS.WARNUNG,
        CONFIG.hinweise.sgbXII,
        ['Ärztliches Attest', 'Gutachten zum Leistungsvermögen']
      );
    default:
      return schritt(
        'Erwerbsfähigkeit (§ 8 SGB II)',
        ERGEBNIS.WARNUNG,
        'Erwerbsfähigkeit nicht angegeben — bitte erfassen.'
      );
  }
}

// ============================================================
//  MODUL 3: BAföG / STUDIERENDEN-AUSSCHLUSS (§ 7 Abs. 5/6 SGB II)
// ============================================================

function pruefeBafoeg(person) {
  // Keine Ausbildung → kein Ausschluss
  if (!person.inAusbildung || person.inAusbildung === 'nein') {
    return [schritt(
      'Ausbildungs-/BAföG-Ausschluss (§ 7 Abs. 5 SGB II)',
      ERGEBNIS.OK,
      'Keine Ausbildung oder Studium angegeben. Ausschlussgrund liegt nicht vor.'
    )];
  }

  const schritte = [];
  const cfg = CONFIG.bafoeg;
  const art = person.ausbildungsart;

  // ---- Förderfähigkeit ermitteln ----
  let foerderfaehig = person.bafoegFoerderfaehig; // 'ja' | 'nein' | 'auto'

  if (foerderfaehig === 'auto' || !foerderfaehig) {
    if (cfg.foerderfaehigeArten.includes(art))       foerderfaehig = 'ja';
    else if (cfg.nichtFoerderfaehigeArten.includes(art)) foerderfaehig = 'nein';
    else                                              foerderfaehig = 'unklar';
  }

  // Nicht förderfähig → kein Ausschluss
  if (foerderfaehig === 'nein') {
    schritte.push(schritt(
      'BAföG-Förderfähigkeit (§ 7 Abs. 5 SGB II)',
      ERGEBNIS.OK,
      'Ausbildung ist dem Grunde nach nicht BAföG-förderfähig. Kein Ausschluss nach § 7 Abs. 5 SGB II.'
    ));
    return schritte;
  }

  if (foerderfaehig === 'unklar') {
    schritte.push(schritt(
      'BAföG-Förderfähigkeit (§ 7 Abs. 5 SGB II)',
      ERGEBNIS.WARNUNG,
      'BAföG-Förderfähigkeit nicht eindeutig ermittelbar. Bitte manuell prüfen und ggf. BAföG-Amt konsultieren.',
      ['Immatrikulationsbescheinigung', 'Ggf. Auskunft BAföG-Amt']
    ));
    return schritte;
  }

  // ---- Ausbildung ist BAföG-förderfähig → Ausnahmen prüfen ----
  schritte.push(schritt(
    'BAföG-Förderfähigkeit (§ 7 Abs. 5 SGB II)',
    ERGEBNIS.INFO,
    `Ausbildungsart "${person.ausbildungsartLabel || art}" ist dem Grunde nach BAföG-förderfähig. Ausnahmen nach § 7 Abs. 6 SGB II werden geprüft.`
  ));

  const status = person.ausbildungsStatus;

  if (status === 'beurlaubt') {
    schritte.push(schritt(
      'Ausnahme: Beurlaubung (§ 7 Abs. 6 Nr. 2 SGB II)',
      ERGEBNIS.WARNUNG,
      'Person ist beurlaubt. Ausschluss nach § 7 Abs. 5 SGB II kann entfallen — Einzelfallprüfung erforderlich.',
      ['Beurlaubungsbescheid der Hochschule / Berufsschule']
    ));
    return schritte;
  }

  if (status === 'krank_schwanger') {
    schritte.push(schritt(
      'Ausnahme: Krankheit / Schwangerschaft (§ 7 Abs. 6 Nr. 1 SGB II)',
      ERGEBNIS.WARNUNG,
      `Ausnahme möglich, wenn Erkrankung oder Schwangerschaft voraussichtlich nicht länger als ${cfg.erkrankungAusnahmedauerMonate} Monate andauert. Einzelfallprüfung erforderlich.`,
      ['Ärztliches Attest mit Prognose', 'Voraussichtliches Ende der Erkrankung']
    ));
    return schritte;
  }

  if (status === 'bafoeg_ausstehend') {
    schritte.push(schritt(
      'BAföG-Antrag gestellt, noch nicht entschieden',
      ERGEBNIS.WARNUNG,
      CONFIG.hinweise.bafoegDarlehen,
      ['Eingangsbestätigung BAföG-Antrag', 'Ggf. Darlehen nach § 27 SGB II prüfen']
    ));
    return schritte;
  }

  if (status === 'immatrikuliert') {
    // Sonderfall § 7 Abs. 6 Nr. 2: Wohnen bei Eltern → Aufstockung möglich?
    if (person.wohntBeiEltern === true) {
      schritte.push(...pruefeAufstockungBeiEltern(person));
      return schritte;
    }

    schritte.push(schritt(
      'Ausschluss: Studium / Ausbildung (§ 7 Abs. 5 SGB II)',
      ERGEBNIS.AUSSCHLUSS,
      'Person ist immatrikuliert / in förderfähiger Ausbildung. Anspruch auf Bürgergeld ist nach § 7 Abs. 5 SGB II ausgeschlossen. Keine Ausnahme nach § 7 Abs. 6 SGB II erkennbar.',
      ['Immatrikulationsbescheinigung', 'BAföG-Bescheid oder Ablehnungsbescheid']
    ));
    return schritte;
  }

  // Ausbildungsstatus unklar
  schritte.push(schritt(
    'Ausbildungs-/BAföG-Ausschluss (§ 7 Abs. 5 SGB II)',
    ERGEBNIS.WARNUNG,
    'Ausbildungsstatus nicht angegeben. Bitte § 7 Abs. 5 SGB II manuell prüfen.',
    ['Immatrikulationsbescheinigung', 'Ausbildungsvertrag']
  ));
  return schritte;
}

// ============================================================
//  MODUL 3b: AUFSTOCKUNG BEI ELTERN (§ 7 Abs. 6 Nr. 2 SGB II)
//
//  Greift nur wenn:
//  - Vollzeitstudium, BAföG-förderfähig, immatrikuliert
//  - UND Person wohnt im elterlichen Haushalt
//
//  Logik: BAföG deckt bei Eltern-Wohnung nur 59 € Wohnkosten
//  → Regelbedarf (451 €) oft nicht vollständig gedeckt
//  → Aufstockung nach § 7 Abs. 6 Nr. 2 möglich
// ============================================================

function pruefeAufstockungBeiEltern(person) {
  const schritte = [];
  const rb      = CONFIG.regelbedarfe;
  const wkp     = CONFIG.bafoegWohnkostenpauschale;

  // Regelbedarf für unter-25-Jährige bei Eltern
  const regelbedarf = rb.stufe3_unter25_beiEltern;

  // Tatsächlich erhaltenes BAföG (Eingabe)
  const bafoegBetrag = parseFloat(person.bafoegBetrag) || 0;

  // Grundsatz: § 7 Abs. 6 Nr. 2 — Ausnahme vom Ausschluss
  schritte.push(schritt(
    'Ausnahme: Wohnen im Elternhaushalt (§ 7 Abs. 6 Nr. 2 SGB II)',
    ERGEBNIS.INFO,
    `Person wohnt im Haushalt der Eltern. § 7 Abs. 6 Nr. 2 SGB II kann den Ausschluss nach § 7 Abs. 5 aufheben, wenn BAföG und eigenes Einkommen den Bedarf nicht vollständig decken.`
  ));

  // BAföG-Höhe bekannt?
  if (bafoegBetrag <= 0) {
    schritte.push(schritt(
      'BAföG-Betrag nicht angegeben',
      ERGEBNIS.WARNUNG,
      `Ohne Kenntnis des tatsächlichen BAföG-Betrags kann keine Aussage zur Aufstockungsmöglichkeit getroffen werden. Bitte BAföG-Bescheid anfordern.`,
      ['BAföG-Bescheid (aktuell)', 'Nachweis über tatsächlich ausgezahltes BAföG']
    ));
    return schritte;
  }

  // Wohnkosten-Hinweis
  schritte.push(schritt(
    'BAföG-Wohnkostenpauschale bei Elternwohnung',
    ERGEBNIS.INFO,
    `BAföG enthält bei Wohnen im Elternhaushalt nur ${wkp.beiEltern} €/Monat Wohnkostenpauschale (§ 13 Abs. 2 Nr. 1 BAföG), statt ${wkp.eigeneMietwohnung} € bei eigener Wohnung. Dies führt häufig zu ungedecktem Bedarf.`
  ));

  // Delta berechnen
  const delta = regelbedarf - bafoegBetrag;

  if (delta <= 0) {
    // BAföG deckt Regelbedarf vollständig
    schritte.push(schritt(
      'BAföG-Delta: Kein Aufstockungsbedarf',
      ERGEBNIS.AUSSCHLUSS,
      `BAföG (${bafoegBetrag.toFixed(2)} €) deckt den Regelbedarf (${regelbedarf} €, Stufe 3) vollständig. Kein Aufstockungsbedarf nach § 7 Abs. 6 Nr. 2 SGB II. Ausschluss nach § 7 Abs. 5 bleibt bestehen.`,
      ['BAföG-Bescheid zum Nachweis']
    ));
    return schritte;
  }

  // Aufstockungslücke vorhanden
  schritte.push(schritt(
    `BAföG-Delta: Aufstockungsbedarf ${delta.toFixed(2)} €/Monat`,
    ERGEBNIS.WARNUNG,
    `Regelbedarf (Stufe 3): ${regelbedarf} €/Monat. BAföG tatsächlich: ${bafoegBetrag.toFixed(2)} €/Monat. ` +
    `Ungedeckter Bedarf: ${delta.toFixed(2)} €/Monat. ` +
    `→ Aufstockung nach § 7 Abs. 6 Nr. 2 SGB II dem Grunde nach möglich. Einzelfallprüfung und Abstimmung mit BAföG-Amt erforderlich.`,
    [
      'BAföG-Bescheid (aktuell, mit ausgewiesenem Wohnkostenanteil)',
      'Meldebescheinigung (Nachweis Wohnen bei Eltern)',
      'Ggf. Abstimmung mit BAföG-Amt zur Anrechnung',
      'Prüfung Kindergeld-Zuordnung (§ 11 SGB II)',
    ]
  ));

  // Hinweis auf Darlehensform (§ 27 SGB II)
  schritte.push(schritt(
    'Form der Leistung: Darlehen oder Zuschuss (§ 27 SGB II)',
    ERGEBNIS.INFO,
    'Ergänzende Leistungen für Studierende nach § 7 Abs. 6 Nr. 2 SGB II werden in der Regel als Darlehen nach § 27 Abs. 3 SGB II gewährt, nicht als Zuschuss. Ausnahme: Härtefall nach § 27 Abs. 4 SGB II.'
  ));

  return schritte;
}

// ============================================================
//  MODUL 4: AUFENTHALTSRECHT EU-BÜRGER (§ 7 Abs. 1 S. 2 SGB II)
// ============================================================

function pruefeAufenthaltsrecht(person) {
  const schritte = [];
  const staatsangehoerigkeit = person.staatsangehoerigkeit;

  // Deutsche → keine freizügigkeitsrechtliche Prüfung
  if (staatsangehoerigkeit === 'deutschland') {
    schritte.push(schritt(
      'Aufenthaltsrecht (§ 7 Abs. 1 S. 2 SGB II)',
      ERGEBNIS.OK,
      'Deutsche Staatsangehörige unterliegen keinen aufenthaltsrechtlichen Einschränkungen.'
    ));
    return schritte;
  }

  // Drittstaatangehörige
  if (staatsangehoerigkeit === 'drittstaat') {
    schritte.push(schritt(
      'Aufenthaltsrecht — Drittstaatangehöriger',
      ERGEBNIS.WARNUNG,
      'Bei Drittstaatangehörigen ist der konkrete Aufenthaltstitel maßgeblich. Ausschlüsse nach § 7 Abs. 1 S. 2 Nr. 3 SGB II i. V. m. § 8 Abs. 2 AufenthG prüfen.',
      ['Aufenthaltstitel / Niederlassungserlaubnis', CONFIG.hinweise.auslaenderbehoerde]
    ));
    return schritte;
  }

  // ---- EU-Bürger ----
  const cfg = CONFIG.aufenthaltsrecht;
  const aufenthaltMonate  = parseInt(person.aufenthaltsdauerMonate) || 0;
  const status            = person.aufenthaltsStatus;
  const wochenstunden     = parseFloat(person.wochenstunden) || 0;
  const bruttoEinkommen   = parseFloat(person.bruttoEinkommen) || 0;
  const istUnbefristet    = person.istUnbefristet === true;

  // Daueraufenthaltsrecht nach 5 Jahren?
  if (aufenthaltMonate >= cfg.daueraufenthaltsrechtMonate) {
    schritte.push(schritt(
      'Daueraufenthaltsrecht (§ 4a FreizügG/EU)',
      ERGEBNIS.OK,
      `Aufenthaltsdauer (${aufenthaltMonate} Monate) überschreitet die 5-Jahres-Grenze (${cfg.daueraufenthaltsrechtMonate} Monate). Freizügigkeitsrechtliche Einschränkungen entfallen.`,
      ['Nachweis der 5-jährigen rechtmäßigen Aufenthaltsdauer (z. B. § 5-Bescheinigung FreizügG/EU)']
    ));
    return schritte;
  }

  // Erste 3 Monate ohne Arbeitnehmerstatus
  if (aufenthaltMonate < cfg.sperrfristMonate &&
      status !== 'arbeitnehmer' && status !== 'selbststaendig') {
    schritte.push(schritt(
      `Sperrfrist erste ${cfg.sperrfristMonate} Monate (§ 7 Abs. 1 S. 2 Nr. 1 SGB II)`,
      ERGEBNIS.AUSSCHLUSS,
      `Person hält sich erst ${aufenthaltMonate} Monat(e) in Deutschland auf. In den ersten ${cfg.sperrfristMonate} Monaten besteht ohne Arbeitnehmerstatus kein Anspruch auf Bürgergeld.`
    ));
    return schritte;
  }

  // ---- Status: Arbeitnehmer ----
  if (status === 'arbeitnehmer') {
    const ausreichendStunden   = wochenstunden >= cfg.mindestStundenArbeitnehmer;
    const ausreichendEinkommen = bruttoEinkommen >= cfg.mindestEinkommenArbeitnehmer;

    if (ausreichendStunden && ausreichendEinkommen) {
      schritte.push(schritt(
        'Arbeitnehmerstatus (§ 2 Abs. 2 Nr. 1 FreizügG/EU)',
        ERGEBNIS.OK,
        `Arbeitnehmerstatus plausibel: ${wochenstunden} Std./Woche, ${bruttoEinkommen} € brutto/Monat (Mindestgrenzen: ${cfg.mindestStundenArbeitnehmer} Std. / ${cfg.mindestEinkommenArbeitnehmer} €).`,
        ['Arbeitsvertrag', 'Gehaltsabrechnungen (letzte 3 Monate)', 'Kontoauszüge']
      ));
    } else {
      schritte.push(schritt(
        'Arbeitnehmerstatus fraglich (§ 2 Abs. 2 Nr. 1 FreizügG/EU)',
        ERGEBNIS.WARNUNG,
        `Nur ${wochenstunden} Std./Woche und/oder ${bruttoEinkommen} € brutto/Monat. Prüfen ob Tätigkeit "tatsächlich und echt" ist (EuGH-Rs. Levin). Ggf. kein qualifizierter Arbeitnehmerstatus.`,
        ['Arbeitsvertrag', 'Gehaltsabrechnungen', 'Kontoauszüge', 'Ggf. Stellungnahme Arbeitgeber']
      ));
    }

    if (!istUnbefristet) {
      schritte.push(schritt(
        'Nachwirkender Arbeitnehmerstatus bei Befristung',
        ERGEBNIS.INFO,
        'Bei befristeter Tätigkeit: Nach Ende bleibt Arbeitnehmerstatus für 6 weitere Monate erhalten, wenn Arbeit unfreiwillig aufgegeben wurde (§ 2 Abs. 3 Nr. 2 FreizügG/EU).'
      ));
    }
    return schritte;
  }

  // ---- Status: Selbstständig ----
  if (status === 'selbststaendig') {
    schritte.push(schritt(
      'Selbstständigkeit (§ 2 Abs. 2 Nr. 2 FreizügG/EU)',
      ERGEBNIS.WARNUNG,
      'Selbstständige EU-Bürger sind grundsätzlich freizügigkeitsberechtigt. Tatsächliche Ausübung ist zu belegen.',
      ['Gewerbeanmeldung oder Handelsregistereintrag', 'Steuerbescheid / EÜR', 'Kontoauszüge']
    ));
    return schritte;
  }

  // ---- Status: Arbeitsuchend ----
  if (status === 'arbeitsuchend') {
    if (aufenthaltMonate > cfg.arbeitssucheMaxMonate) {
      schritte.push(schritt(
        'Aufenthaltsrecht als Arbeitsuchender — Nachweisfrist überschritten',
        ERGEBNIS.WARNUNG,
        `Aufenthalt als Arbeitsuchender dauert bereits ${aufenthaltMonate} Monate (Grenze: ${cfg.arbeitssucheMaxMonate} Monate). Ohne Nachweis ernsthafter Bemühungen kann das Aufenthaltsrecht erlöschen.`,
        ['Bewerbungsunterlagen', 'Nachweise Arbeitssuchend-Meldung', CONFIG.hinweise.auslaenderbehoerde]
      ));
    } else {
      schritte.push(schritt(
        'Aufenthaltsrecht als Arbeitsuchender (§ 2 Abs. 2 Nr. 1a FreizügG/EU)',
        ERGEBNIS.AUSSCHLUSS,
        `Kein Anspruch auf Bürgergeld nach § 7 Abs. 1 S. 2 Nr. 2 SGB II für Arbeitsuchende ohne Vorerwerbstätigkeit in Deutschland.`,
        [CONFIG.hinweise.auslaenderbehoerde, 'Nachweis über Vorerwerbstätigkeit in Deutschland']
      ));
    }
    return schritte;
  }

  // ---- Status: Familienangehöriger ----
  if (status === 'familienangehoerig') {
    schritte.push(schritt(
      'Aufenthaltsrecht als Familienangehöriger (§ 3 FreizügG/EU)',
      ERGEBNIS.WARNUNG,
      'Aufenthaltsrecht leitet sich vom stammberechtigten EU-Bürger ab. Prüfen: Besteht dessen Freizügigkeitsrecht fort? Ggf. Ausschluss nach § 7 Abs. 1 S. 2 Nr. 2 SGB II.',
      ['Nachweis Familienbeziehung (Heiratsurkunde, Geburtsurkunde)', 'Aufenthaltsstatus des stammberechtigten EU-Bürgers', CONFIG.hinweise.auslaenderbehoerde]
    ));
    return schritte;
  }

  // Unklar
  schritte.push(schritt(
    'Aufenthaltsrecht (Status nicht zuordenbar)',
    ERGEBNIS.WARNUNG,
    'Aufenthaltsstatus nicht eindeutig. Einzelfallprüfung erforderlich.',
    [CONFIG.hinweise.auslaenderbehoerde]
  ));
  return schritte;
}

// ============================================================
//  HAUPTFUNKTION: Einzelperson prüfen
// ============================================================

/**
 * Prüft eine einzelne Person der BG.
 * @param {object} person - Personendaten aus dem Formular
 * @returns {object} - { pruefschritte, ampelStatus, ampelText, alleNachweise }
 */
function pruefePerson(person) {
  const pruefschritte = [];

  // 1. Alter
  pruefschritte.push(pruefeAlter(person));

  // 2. Erwerbsfähigkeit
  pruefschritte.push(pruefeErwerbsfaehigkeit(person));

  // 3. EU-Bürger-Prüfung (wenn aktiviert)
  if (person.pruefungEU) {
    pruefschritte.push(...pruefeAufenthaltsrecht(person));
  }

  // 4. BAföG-Prüfung (wenn aktiviert)
  if (person.pruefungBafoeg) {
    pruefschritte.push(...pruefeBafoeg(person));
  }

  // Ampelstatus ermitteln
  const hatAusschluss = pruefschritte.some(s => s.ergebnis === ERGEBNIS.AUSSCHLUSS);
  const hatWarnung    = pruefschritte.some(s => s.ergebnis === ERGEBNIS.WARNUNG);

  let ampelStatus, ampelText;
  if (hatAusschluss) {
    ampelStatus = 'rot';
    ampelText   = 'Ausschluss wahrscheinlich';
  } else if (hatWarnung) {
    ampelStatus = 'gelb';
    ampelText   = 'Weitere Prüfung erforderlich';
  } else {
    ampelStatus = 'gruen';
    ampelText   = 'Kein Ausschlussgrund festgestellt';
  }

  const alleNachweise = [...new Set(pruefschritte.flatMap(s => s.nachweise || []))];

  return { pruefschritte, ampelStatus, ampelText, alleNachweise };
}

/**
 * Prüft alle Personen der Bedarfsgemeinschaft.
 * @param {object[]} personen - Array von Personendaten
 * @returns {object[]} - Array von Einzelergebnissen
 */
function pruefeBedarfsgemeinschaft(personen) {
  return personen.map(person => ({
    person,
    ergebnis: pruefePerson(person),
  }));
}

// Globale Verfügbarkeit
window.pruefePerson            = pruefePerson;
window.pruefeBedarfsgemeinschaft = pruefeBedarfsgemeinschaft;
window.ERGEBNIS                = ERGEBNIS;
