/**
 * ============================================================
 *  SGB II Prüfassistent — Haupt-UI-Logik
 *  main.js
 *
 *  Zuständig für:
 *  - Falltyp-Auswahl und dynamisches Einblenden von Feldern
 *  - Formulardaten lesen und aufbereiten
 *  - Prüfung anstoßen (via rule-engine.js)
 *  - Ergebnis rendern (Ampel, Prüfschritte, Vermerk)
 *  - Prüfvermerk-Text generieren und kopieren
 * ============================================================
 */

// Warte bis DOM vollständig geladen
document.addEventListener('DOMContentLoaded', () => {

  // ----------------------------------------------------------
  // FALLTYP-KONFIGURATION
  // ----------------------------------------------------------

  /** Definiert, welche Sektionen bei welchem Falltyp sichtbar sind */
  const FALLTYPEN = {
    allgemein: {
      label: 'Allgemein',
      icon: '📋',
      sektionen: ['s-allgemein', 's-einkommen-vermoegen'],
    },
    eu_buerger: {
      label: 'EU-Bürger',
      icon: '🇪🇺',
      sektionen: ['s-allgemein', 's-eu', 's-einkommen-vermoegen'],
    },
    studierender: {
      label: 'Studierender',
      icon: '🎓',
      sektionen: ['s-allgemein', 's-bafoeg', 's-einkommen-vermoegen'],
    },
    gemischt: {
      label: 'Gemischt',
      icon: '👨‍👩‍👧',
      sektionen: ['s-allgemein', 's-eu', 's-bafoeg', 's-einkommen-vermoegen'],
    },
  };

  // Aktueller Falltyp
  let aktiverFalltyp = null;

  // ----------------------------------------------------------
  // DOM-REFERENZEN
  // ----------------------------------------------------------

  const falltypBtns     = document.querySelectorAll('.falltyp-btn');
  const sektionenAlle   = document.querySelectorAll('.sektion[data-sektion]');
  const eingabeBereich  = document.getElementById('eingabe-bereich');
  const btnPruefen      = document.getElementById('btn-pruefen');
  const ergebnisBereich = document.getElementById('ergebnis-bereich');
  const toast           = document.getElementById('toast');

  // EU-bedingte Felder
  const statusFeld           = document.getElementById('aufenthalts-status');
  const erwerbsFelder        = document.getElementById('erwerbs-felder');
  const staatsangehoerigkeitFeld = document.getElementById('staatsangehoerigkeit');

  // BAföG-bedingte Felder
  const ausbildungJaNein     = document.querySelectorAll('input[name="inAusbildung"]');
  const bafoegDetails        = document.getElementById('bafoeg-details');
  const ausbildungsartFeld   = document.getElementById('ausbildungsart');
  const bafoegFoerderfaehigFeld = document.getElementById('bafoegFoerderfaehig');
  const bafoegAutoHinweis    = document.getElementById('bafoeg-auto-hinweis');

  // ----------------------------------------------------------
  // FALLTYP-AUSWAHL
  // ----------------------------------------------------------

  falltypBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const typ = btn.dataset.typ;
      aktiverFalltyp = typ;

      // Buttons aktualisieren
      falltypBtns.forEach(b => b.classList.toggle('aktiv', b.dataset.typ === typ));

      // Sektionen anzeigen/verstecken
      const sichtbareSektionen = FALLTYPEN[typ].sektionen;
      sektionenAlle.forEach(s => {
        s.classList.toggle('versteckt', !sichtbareSektionen.includes(s.dataset.sektion));
      });

      // Eingabebereich einblenden
      eingabeBereich.classList.remove('versteckt');

      // Vorheriges Ergebnis ausblenden
      ergebnisBereich.classList.remove('sichtbar');

      // Smooth scroll zum Formular
      eingabeBereich.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // ----------------------------------------------------------
  // DYNAMISCHE FELDER: EU-Bürger
  // ----------------------------------------------------------

  if (statusFeld) {
    statusFeld.addEventListener('change', () => {
      const wert = statusFeld.value;
      const zeigeErwerb = (wert === 'arbeitnehmer' || wert === 'selbststaendig');
      erwerbsFelder.classList.toggle('versteckt', !zeigeErwerb);
    });
  }

  if (staatsangehoerigkeitFeld) {
    staatsangehoerigkeitFeld.addEventListener('change', () => {
      const wert = staatsangehoerigkeitFeld.value;
      const euSektion = document.getElementById('eu-details');
      if (euSektion) {
        euSektion.classList.toggle('versteckt', wert === 'deutschland');
      }
    });
  }

  // ----------------------------------------------------------
  // DYNAMISCHE FELDER: BAföG
  // ----------------------------------------------------------

  ausbildungJaNein.forEach(radio => {
    radio.addEventListener('change', () => {
      const istJa = document.querySelector('input[name="inAusbildung"]:checked')?.value === 'ja';
      if (bafoegDetails) bafoegDetails.classList.toggle('versteckt', !istJa);
    });
  });

  // Automatische BAföG-Förderfähigkeit ermitteln
  if (ausbildungsartFeld) {
    ausbildungsartFeld.addEventListener('change', () => {
      const art = ausbildungsartFeld.value;
      const cfg = window.CONFIG?.bafoeg;
      if (!cfg) return;

      let empfehlung = '';
      if (cfg.foerderfaehigeAusbildungsarten.includes(art)) {
        empfehlung = 'ja';
        if (bafoegAutoHinweis) bafoegAutoHinweis.textContent = '✓ Automatisch: BAföG-förderfähig';
      } else if (cfg.nichtFoerderfaehigeAusbildungsarten.includes(art)) {
        empfehlung = 'nein';
        if (bafoegAutoHinweis) bafoegAutoHinweis.textContent = '✗ Automatisch: Nicht BAföG-förderfähig';
      } else {
        empfehlung = 'unklar';
        if (bafoegAutoHinweis) bafoegAutoHinweis.textContent = '? Bitte manuell prüfen';
      }

      // Automatisch vorauswählen, wenn noch nicht manuell geändert
      if (bafoegFoerderfaehigFeld && bafoegFoerderfaehigFeld.dataset.manuell !== 'ja') {
        bafoegFoerderfaehigFeld.value = empfehlung;
      }
    });

    // Manuelle Änderung merken
    if (bafoegFoerderfaehigFeld) {
      bafoegFoerderfaehigFeld.addEventListener('change', () => {
        bafoegFoerderfaehigFeld.dataset.manuell = 'ja';
      });
    }
  }

  // ----------------------------------------------------------
  // FORMULARDATEN LESEN
  // ----------------------------------------------------------

  /**
   * Liest alle Formularwerte und gibt ein strukturiertes Falldaten-Objekt zurück.
   * @returns {object}
   */
  function leseFalldaten() {
    const val = (id) => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : '';
    };

    const checked = (id) => {
      const el = document.getElementById(id);
      return el ? el.checked : false;
    };

    const radioVal = (name) => {
      const el = document.querySelector(`input[name="${name}"]:checked`);
      return el ? el.value : null;
    };

    // BAföG-Förderfähigkeit
    let bafoegFoerderfaehig = val('bafoegFoerderfaehig');
    if (bafoegFoerderfaehig === 'ja') bafoegFoerderfaehig = true;
    else if (bafoegFoerderfaehig === 'nein') bafoegFoerderfaehig = false;
    else bafoegFoerderfaehig = 'unklar';

    return {
      // Allgemein
      alter:              val('alter'),
      familienstand:      val('familienstand'),
      anzahlKinder:       val('anzahlKinder'),
      erwerbsfaehigkeit:  val('erwerbsfaehigkeit'),

      // EU-Bürger
      staatsangehoerigkeit:   val('staatsangehoerigkeit'),
      aufenthaltsdauerMonate: val('aufenthaltsdauerMonate'),
      aufenthaltsStatus:      val('aufenthalts-status'),
      wochenstunden:          val('wochenstunden'),
      bruttoEinkommen:        val('bruttoEinkommen'),
      istUnbefristet:         checked('istUnbefristet'),

      // Nachweise EU
      nachweis_arbeitsvertrag:  checked('nachweis-arbeitsvertrag'),
      nachweis_kontoauszuege:   checked('nachweis-kontoauszuege'),
      nachweis_meldung:         checked('nachweis-meldung'),

      // BAföG
      inAusbildung:       radioVal('inAusbildung'),
      ausbildungsart:     val('ausbildungsart'),
      bafoegFoerderfaehig,
      ausbildungsStatus:  val('ausbildungsStatus'),

      // Einkommen & Vermögen
      nettoEinkommen:             val('nettoEinkommen'),
      vermoegen:                  val('vermoegen'),
      stationaereUnterbringung:   radioVal('stationaer'),
    };
  }

  // ----------------------------------------------------------
  // PRÜFUNG STARTEN
  // ----------------------------------------------------------

  if (btnPruefen) {
    btnPruefen.addEventListener('click', () => {
      if (!aktiverFalltyp) {
        zeigeToast('Bitte zuerst einen Falltyp auswählen.');
        return;
      }

      const fall = leseFalldaten();
      const ergebnis = window.pruefeFallGesamt(fall);

      rendereErgebnis(ergebnis, fall);
      ergebnisBereich.classList.add('sichtbar');

      // Zum Ergebnis scrollen
      setTimeout(() => {
        ergebnisBereich.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    });
  }

  // ----------------------------------------------------------
  // ERGEBNIS RENDERN
  // ----------------------------------------------------------

  /**
   * Gibt das Icon für einen Prüfschritt-Status zurück.
   * @param {string} ergebnis
   * @returns {string}
   */
  function statusIcon(ergebnis) {
    switch (ergebnis) {
      case 'ok':          return '✓';
      case 'warnung':     return '!';
      case 'ausschluss':  return '✕';
      case 'info':        return 'i';
      default:            return '?';
    }
  }

  /**
   * Gibt das Ampel-Emoji zurück.
   * @param {string} status
   * @returns {string}
   */
  function ampelEmoji(status) {
    switch (status) {
      case 'gruen': return '✅';
      case 'gelb':  return '⚠️';
      case 'rot':   return '🚫';
      default:      return '❓';
    }
  }

  /**
   * Rendert das Gesamtergebnis in den DOM.
   * @param {object} ergebnis - von pruefeFallGesamt()
   * @param {object} fall     - Falldaten
   */
  function rendereErgebnis(ergebnis, fall) {
    // Ampel-Karte
    const ampelKarte = document.getElementById('ampel-karte');
    ampelKarte.className = `ampel-karte ${ergebnis.ampelStatus}`;
    ampelKarte.innerHTML = `
      <div class="ampel-symbol">${ampelEmoji(ergebnis.ampelStatus)}</div>
      <div class="ampel-text">
        <h2>${ergebnis.ampelText}</h2>
        <p>${ergebnis.ampelBeschreibung}</p>
        <p style="margin-top:8px;font-size:0.78rem;color:var(--grau-500);">
          Geprüft am: ${ergebnis.pruefzeitpunkt}
        </p>
      </div>
    `;

    // Prüfschritte
    const schritteListe = document.getElementById('pruefschritte-liste');
    schritteListe.innerHTML = '';

    ergebnis.pruefschritte.forEach(schritt => {
      const div = document.createElement('div');
      div.className = `pruefschritt ${schritt.ergebnis}`;

      let nachweiHTML = '';
      if (schritt.nachweise && schritt.nachweise.length > 0) {
        nachweiHTML = `<ul class="pruefschritt-nachweise">
          ${schritt.nachweise.map(n => `<li>${escapeHTML(n)}</li>`).join('')}
        </ul>`;
      }

      div.innerHTML = `
        <div class="pruefschritt-icon" aria-label="${schritt.ergebnis}">${statusIcon(schritt.ergebnis)}</div>
        <div class="pruefschritt-inhalt">
          <div class="pruefschritt-kriterium">${escapeHTML(schritt.kriterium)}</div>
          <div class="pruefschritt-begruendung">${escapeHTML(schritt.begruendung)}</div>
          ${nachweiHTML}
        </div>
      `;
      schritteListe.appendChild(div);
    });

    // Nachweisliste
    const nachweisList = document.getElementById('nachweise-liste');
    nachweisList.innerHTML = '';
    if (ergebnis.alleNachweise.length > 0) {
      ergebnis.alleNachweise.forEach(n => {
        const li = document.createElement('li');
        li.textContent = n;
        nachweisList.appendChild(li);
      });
      document.getElementById('nachweise-karte').classList.remove('versteckt');
    } else {
      document.getElementById('nachweise-karte').classList.add('versteckt');
    }

    // Prüfvermerk generieren
    const vermerkText = generierePruefvermerk(ergebnis, fall);
    document.getElementById('pruefvermerk-text').textContent = vermerkText;

    // Rechtsstand
    document.getElementById('rechtsstand-hinweis').textContent = ergebnis.rechtsstandHinweis;
  }

  // ----------------------------------------------------------
  // PRÜFVERMERK GENERIEREN
  // ----------------------------------------------------------

  /**
   * Erstellt einen kopierbaren Prüfvermerk-Text.
   * @param {object} ergebnis
   * @param {object} fall
   * @returns {string}
   */
  function generierePruefvermerk(ergebnis, fall) {
    const linie = '─'.repeat(60);
    const zeilen = [];

    zeilen.push('PRÜFVERMERK — SGB II Anspruchsprüfung nach § 7 SGB II');
    zeilen.push(linie);
    zeilen.push(`Datum/Uhrzeit:   ${ergebnis.pruefzeitpunkt}`);
    zeilen.push(`Falltyp:         ${aktiverFalltyp ? FALLTYPEN[aktiverFalltyp]?.label : 'unbekannt'}`);
    zeilen.push('');

    // Eingabedaten zusammenfassen
    zeilen.push('FALLANGABEN:');
    if (fall.alter)           zeilen.push(`  Alter:               ${fall.alter} Jahre`);
    if (fall.familienstand)   zeilen.push(`  Familienstand:       ${fall.familienstand}`);
    if (fall.anzahlKinder)    zeilen.push(`  Kinder (minderjährig): ${fall.anzahlKinder}`);
    if (fall.erwerbsfaehigkeit) zeilen.push(`  Erwerbsfähigkeit:   ${fall.erwerbsfaehigkeit}`);
    if (fall.staatsangehoerigkeit) zeilen.push(`  Staatsangehörigkeit: ${fall.staatsangehoerigkeit}`);
    if (fall.nettoEinkommen)  zeilen.push(`  Nettoeinkommen:     ${fall.nettoEinkommen} €/Monat`);
    if (fall.vermoegen)       zeilen.push(`  Vermögen:           ${fall.vermoegen} €`);
    zeilen.push('');

    // Gesamtergebnis
    zeilen.push('GESAMTERGEBNIS:');
    const statusLabel = {
      gruen: '[ANSPRUCH WAHRSCHEINLICH]',
      gelb:  '[WEITERE PRÜFUNG ERFORDERLICH]',
      rot:   '[AUSSCHLUSS WAHRSCHEINLICH]',
    }[ergebnis.ampelStatus] || '[OFFEN]';
    zeilen.push(`  ${statusLabel}`);
    zeilen.push(`  ${ergebnis.ampelBeschreibung}`);
    zeilen.push('');

    // Prüfschritte
    zeilen.push('GEPRÜFTE KRITERIEN:');
    ergebnis.pruefschritte.forEach((schritt, i) => {
      const symbol = { ok: '✓', warnung: '!', ausschluss: '✕', info: 'i' }[schritt.ergebnis] || '?';
      zeilen.push(`  ${i + 1}. [${symbol}] ${schritt.kriterium}`);
      zeilen.push(`     ${schritt.begruendung}`);
      if (schritt.nachweise && schritt.nachweise.length > 0) {
        zeilen.push('     Benötigte Nachweise:');
        schritt.nachweise.forEach(n => zeilen.push(`       → ${n}`));
      }
      zeilen.push('');
    });

    // Fehlende Nachweise
    if (ergebnis.alleNachweise.length > 0) {
      zeilen.push('ANZUFORDERNDE NACHWEISE:');
      ergebnis.alleNachweise.forEach(n => zeilen.push(`  → ${n}`));
      zeilen.push('');
    }

    zeilen.push(linie);
    zeilen.push(ergebnis.rechtsstandHinweis);
    zeilen.push('Erstellt mit: SGB II Prüfassistent (Prototyp)');

    return zeilen.join('\n');
  }

  // ----------------------------------------------------------
  // PRÜFVERMERK KOPIEREN
  // ----------------------------------------------------------

  const btnKopieren = document.getElementById('btn-kopieren');
  if (btnKopieren) {
    btnKopieren.addEventListener('click', async () => {
      const text = document.getElementById('pruefvermerk-text').textContent;
      try {
        await navigator.clipboard.writeText(text);
        btnKopieren.textContent = '✓ Kopiert!';
        btnKopieren.classList.add('kopiert');
        setTimeout(() => {
          btnKopieren.textContent = '📋 Vermerk kopieren';
          btnKopieren.classList.remove('kopiert');
        }, 2000);
      } catch {
        zeigeToast('Kopieren fehlgeschlagen. Bitte manuell markieren.');
      }
    });
  }

  // ----------------------------------------------------------
  // TOAST-MELDUNG
  // ----------------------------------------------------------

  /**
   * Zeigt kurz eine Toast-Meldung an.
   * @param {string} meldung
   */
  function zeigeToast(meldung) {
    toast.textContent = meldung;
    toast.classList.add('sichtbar');
    setTimeout(() => toast.classList.remove('sichtbar'), 3000);
  }

  // ----------------------------------------------------------
  // HILFSFUNKTION: HTML-Escaping
  // ----------------------------------------------------------

  /**
   * Verhindert XSS durch Escapen von HTML-Sonderzeichen.
   * @param {string} str
   * @returns {string}
   */
  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

});
