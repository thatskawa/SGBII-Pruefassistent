/**
 * ============================================================
 *  SGB II Prüfassistent v2 — main.js
 *
 *  Ablauf:
 *  1. Bedarfsgemeinschaft erfassen (Personen hinzufügen)
 *  2. Je Person: Prüftypen wählen (EU / Studierend)
 *     und die jeweiligen Felder ausfüllen
 *  3. Prüfung starten → Ergebnis je Person
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  // ----------------------------------------------------------
  // Zustand
  // ----------------------------------------------------------
  let personen = [];    // Array der erfassten BG-Personen
  let personenZaehler = 0; // fortlaufende ID

  // ----------------------------------------------------------
  // DOM-Referenzen
  // ----------------------------------------------------------
  const personenListeEl   = document.getElementById('personen-liste');
  const btnPersonHinzu    = document.getElementById('btn-person-hinzufuegen');
  const btnPruefen        = document.getElementById('btn-pruefen');
  const btnNeuePruefung   = document.getElementById('btn-neue-pruefung');
  const bgErfassungSection = document.getElementById('bg-erfassung');
  const ergebnisSection   = document.getElementById('ergebnis-section');
  const ergebnisInhalt    = document.getElementById('ergebnis-inhalt');
  const toast             = document.getElementById('toast');

  // Schritt-Tabs
  const tabBG       = document.getElementById('tab-bg');
  const tabErgebnis = document.getElementById('tab-ergebnis');

  // ----------------------------------------------------------
  // Rollen-Optionen für BG-Mitglieder
  // ----------------------------------------------------------
  const ROLLEN = [
    { value: 'antragsteller',    label: 'Antragsteller/in' },
    { value: 'partner',          label: 'Partner/in' },
    { value: 'kind_minderjaehrig', label: 'Kind (minderjährig)' },
    { value: 'kind_volljährig',  label: 'Kind (volljährig, in BG)' },
    { value: 'sonstiges',        label: 'Sonstiges BG-Mitglied' },
  ];

  // ----------------------------------------------------------
  // PERSON HINZUFÜGEN
  // ----------------------------------------------------------

  btnPersonHinzu.addEventListener('click', () => {
    personenZaehler++;
    const id = personenZaehler;

    const person = {
      id,
      name: '',
      rolle: '',
      alter: '',
      erwerbsfaehigkeit: '',
      pruefungEU: false,
      pruefungBafoeg: false,
      // EU-Felder
      staatsangehoerigkeit: '',
      aufenthaltsdauerMonate: '',
      aufenthaltsStatus: '',
      wochenstunden: '',
      bruttoEinkommen: '',
      istUnbefristet: false,
      // BAföG-Felder
      inAusbildung: 'nein',
      ausbildungsart: '',
      ausbildungsartLabel: '',
      bafoegFoerderfaehig: 'auto',
      ausbildungsStatus: '',
      wohntBeiEltern: false,
      bafoegBetrag: '',
    };

    personen.push(person);
    renderePersonenListe();
  });

  // ----------------------------------------------------------
  // PERSON ENTFERNEN
  // ----------------------------------------------------------

  function entfernePerson(id) {
    personen = personen.filter(p => p.id !== id);
    renderePersonenListe();
  }

  // ----------------------------------------------------------
  // PERSONEN-LISTE RENDERN
  // ----------------------------------------------------------

  function renderePersonenListe() {
    personenListeEl.innerHTML = '';

    if (personen.length === 0) {
      personenListeEl.innerHTML = `
        <div style="padding:20px;text-align:center;color:var(--grau-500);font-size:0.88rem;">
          Noch keine Person erfasst. Klicken Sie auf „Person hinzufügen".
        </div>`;
      return;
    }

    personen.forEach((person, index) => {
      const el = erstellePersonKarte(person, index + 1);
      personenListeEl.appendChild(el);
    });
  }

  // ----------------------------------------------------------
  // PERSONENKARTE ERSTELLEN
  // ----------------------------------------------------------

  function erstellePersonKarte(person, nummer) {
    const div = document.createElement('div');
    div.className = 'person-karte';
    div.dataset.id = person.id;

    // Kurzbezeichnung für den Header
    const kurzName = person.name || `Person ${nummer}`;
    const rolleLabel = ROLLEN.find(r => r.value === person.rolle)?.label || 'Rolle auswählen';

    div.innerHTML = `
      <div class="person-header" data-id="${person.id}">
        <div class="person-header-links">
          <div class="person-index">${nummer}</div>
          <div>
            <div class="person-name-kurzinfo">${escHTML(kurzName)}</div>
            <div class="person-rolle-tag">${escHTML(rolleLabel)}</div>
          </div>
        </div>
        <button class="btn-person-loeschen" type="button" data-id="${person.id}">
          ✕ Entfernen
        </button>
      </div>

      <div class="person-felder">
        <div class="felder-grid">

          <div class="feld">
            <label>Name / Bezeichnung</label>
            <input type="text" placeholder="z. B. Max Mustermann"
              data-feld="name" data-id="${person.id}" value="${escHTML(person.name)}" />
          </div>

          <div class="feld">
            <label>Rolle in der BG</label>
            <select data-feld="rolle" data-id="${person.id}">
              <option value="">— bitte wählen —</option>
              ${ROLLEN.map(r => `<option value="${r.value}" ${person.rolle === r.value ? 'selected' : ''}>${r.label}</option>`).join('')}
            </select>
          </div>

          <div class="feld">
            <label>Alter (Jahre)</label>
            <input type="number" min="0" max="120" placeholder="z. B. 24"
              data-feld="alter" data-id="${person.id}" value="${person.alter}" />
          </div>

          <div class="feld">
            <label>Erwerbsfähigkeit</label>
            <select data-feld="erwerbsfaehigkeit" data-id="${person.id}">
              <option value="">— bitte wählen —</option>
              <option value="ja"            ${person.erwerbsfaehigkeit === 'ja' ? 'selected':''}>Ja (mind. 3 Std./Tag)</option>
              <option value="eingeschraenkt" ${person.erwerbsfaehigkeit === 'eingeschraenkt' ? 'selected':''}>Eingeschränkt</option>
              <option value="nein"           ${person.erwerbsfaehigkeit === 'nein' ? 'selected':''}>Nein</option>
            </select>
          </div>

        </div>

        <hr style="margin:14px 0;" />

        <!-- Prüfungsauswahl -->
        <div>
          <label style="font-size:0.83rem;font-weight:700;color:var(--grau-700);display:block;margin-bottom:8px;">
            Welche Prüfungen sollen durchgeführt werden?
          </label>
          <div class="pruefung-auswahl">
            <label class="pruefung-toggle">
              <input type="checkbox" data-feld="pruefungEU" data-id="${person.id}"
                ${person.pruefungEU ? 'checked' : ''} />
              🇪🇺 EU-Bürger-Prüfung
            </label>
            <label class="pruefung-toggle">
              <input type="checkbox" data-feld="pruefungBafoeg" data-id="${person.id}"
                ${person.pruefungBafoeg ? 'checked' : ''} />
              🎓 Studierenden-Prüfung
            </label>
          </div>
        </div>

        <!-- EU-Detail-Felder -->
        <div class="detail-bereich ${person.pruefungEU ? 'offen' : ''}" data-detail="eu" data-id="${person.id}">
          <div class="felder-grid mt14">

            <div class="feld">
              <label>Staatsangehörigkeit</label>
              <select data-feld="staatsangehoerigkeit" data-id="${person.id}">
                <option value="">— bitte wählen —</option>
                <option value="deutschland"  ${person.staatsangehoerigkeit === 'deutschland'  ? 'selected':''}>Deutschland</option>
                <option value="eu"           ${person.staatsangehoerigkeit === 'eu'           ? 'selected':''}>EU-Staat</option>
                <option value="drittstaat"   ${person.staatsangehoerigkeit === 'drittstaat'   ? 'selected':''}>Drittstaat</option>
              </select>
            </div>

            <div class="feld">
              <label>Aufenthaltsdauer in Deutschland</label>
              <input type="number" min="0" placeholder="z. B. 8"
                data-feld="aufenthaltsdauerMonate" data-id="${person.id}"
                value="${person.aufenthaltsdauerMonate}" />
              <span class="feld-hint">In Monaten</span>
            </div>

            <div class="feld">
              <label>Aufenthaltsstatus / Freizügigkeitsgrund</label>
              <select data-feld="aufenthaltsStatus" data-id="${person.id}">
                <option value="">— bitte wählen —</option>
                <option value="arbeitnehmer"      ${person.aufenthaltsStatus === 'arbeitnehmer'      ? 'selected':''}>Arbeitnehmer/in</option>
                <option value="selbststaendig"    ${person.aufenthaltsStatus === 'selbststaendig'    ? 'selected':''}>Selbstständig</option>
                <option value="arbeitsuchend"     ${person.aufenthaltsStatus === 'arbeitsuchend'     ? 'selected':''}>Arbeitsuchend</option>
                <option value="familienangehoerig" ${person.aufenthaltsStatus === 'familienangehoerig' ? 'selected':''}>Familienangehöriger EU-Bürger</option>
                <option value="sonstiges"         ${person.aufenthaltsStatus === 'sonstiges'         ? 'selected':''}>Sonstiges</option>
              </select>
            </div>

          </div>

          <!-- Erwerbstätigkeit (nur bei Arbeitnehmer/Selbstständig) -->
          <div class="felder-grid mt14 ${(person.aufenthaltsStatus === 'arbeitnehmer' || person.aufenthaltsStatus === 'selbststaendig') ? '' : 'versteckt'}"
               data-erwerb="${person.id}">
            <div class="feld">
              <label>Wochenstunden</label>
              <input type="number" min="0" max="60" step="0.5" placeholder="z. B. 20"
                data-feld="wochenstunden" data-id="${person.id}"
                value="${person.wochenstunden}" />
              <span class="feld-hint">Stunden/Woche</span>
            </div>
            <div class="feld">
              <label>Bruttoeinkommen</label>
              <input type="number" min="0" step="1" placeholder="z. B. 1200"
                data-feld="bruttoEinkommen" data-id="${person.id}"
                value="${person.bruttoEinkommen}" />
              <span class="feld-hint">Euro/Monat</span>
            </div>
            <div class="feld">
              <label style="visibility:hidden;">.</label>
              <label class="checkbox-zeile">
                <input type="checkbox" data-feld="istUnbefristet" data-id="${person.id}"
                  ${person.istUnbefristet ? 'checked':''} />
                <span>Tätigkeit ist unbefristet</span>
              </label>
            </div>
          </div>
        </div>

        <!-- BAföG-Detail-Felder -->
        <div class="detail-bereich ${person.pruefungBafoeg ? 'offen' : ''}" data-detail="bafoeg" data-id="${person.id}">
          <div class="felder-grid mt14">

            <div class="feld breit">
              <label>In Ausbildung / Studium?</label>
              <div class="radio-gruppe">
                <label class="radio-item">
                  <input type="radio" name="inAusbildung_${person.id}" value="ja"
                    data-feld="inAusbildung" data-id="${person.id}"
                    ${person.inAusbildung === 'ja' ? 'checked':''} />
                  <span>Ja</span>
                </label>
                <label class="radio-item">
                  <input type="radio" name="inAusbildung_${person.id}" value="nein"
                    data-feld="inAusbildung" data-id="${person.id}"
                    ${person.inAusbildung !== 'ja' ? 'checked':''} />
                  <span>Nein</span>
                </label>
              </div>
            </div>

          </div>

          <!-- Ausbildungsdetails (nur wenn ja) -->
          <div class="felder-grid mt14 ${person.inAusbildung === 'ja' ? '':'versteckt'}"
               data-ausbildung="${person.id}">
            <div class="feld">
              <label>Art der Ausbildung</label>
              <select data-feld="ausbildungsart" data-id="${person.id}">
                <option value="">— bitte wählen —</option>
                <option value="vollzeitstudium"    ${person.ausbildungsart === 'vollzeitstudium'    ? 'selected':''}>Vollzeitstudium (Uni / FH)</option>
                <option value="teilzeitstudium"    ${person.ausbildungsart === 'teilzeitstudium'    ? 'selected':''}>Teilzeitstudium</option>
                <option value="ausbildung_dual"    ${person.ausbildungsart === 'ausbildung_dual'    ? 'selected':''}>Ausbildung (dual)</option>
                <option value="ausbildung_schulisch" ${person.ausbildungsart === 'ausbildung_schulisch' ? 'selected':''}>Ausbildung (schulisch)</option>
                <option value="abendgymnasium"     ${person.ausbildungsart === 'abendgymnasium'     ? 'selected':''}>Abendgymnasium / Abendschule</option>
              </select>
            </div>

            <div class="feld">
              <label>
                BAföG-Förderfähigkeit
                <span class="auto-tag" data-autotag="${person.id}">auto</span>
              </label>
              <select data-feld="bafoegFoerderfaehig" data-id="${person.id}">
                <option value="auto"  ${person.bafoegFoerderfaehig === 'auto'  ? 'selected':''}>Automatisch ermitteln</option>
                <option value="ja"   ${person.bafoegFoerderfaehig === 'ja'    ? 'selected':''}>Ja (förderfähig)</option>
                <option value="nein" ${person.bafoegFoerderfaehig === 'nein'  ? 'selected':''}>Nein (nicht förderfähig)</option>
              </select>
            </div>

            <div class="feld">
              <label>Aktueller Ausbildungsstatus</label>
              <select data-feld="ausbildungsStatus" data-id="${person.id}">
                <option value="">— bitte wählen —</option>
                <option value="immatrikuliert"    ${person.ausbildungsStatus === 'immatrikuliert'    ? 'selected':''}>Immatrikuliert / in Ausbildung</option>
                <option value="beurlaubt"         ${person.ausbildungsStatus === 'beurlaubt'         ? 'selected':''}>Beurlaubt</option>
                <option value="krank_schwanger"   ${person.ausbildungsStatus === 'krank_schwanger'   ? 'selected':''}>Krank / Schwangerschaft</option>
                <option value="bafoeg_ausstehend" ${person.ausbildungsStatus === 'bafoeg_ausstehend' ? 'selected':''}>BAföG-Antrag gestellt, offen</option>
              </select>
            </div>

            <div class="feld">
              <label>Tatsächlich erhaltenes BAföG</label>
              <input type="number" min="0" step="1" placeholder="z. B. 370"
                data-feld="bafoegBetrag" data-id="${person.id}"
                value="${person.bafoegBetrag}" />
              <span class="feld-hint">Euro/Monat (laut Bescheid)</span>
            </div>

          </div>

          <!-- Wohnsituation (immer sichtbar wenn in Ausbildung) -->
          <div style="margin-top:12px;">
            <label class="checkbox-zeile">
              <input type="checkbox" data-feld="wohntBeiEltern" data-id="${person.id}"
                ${person.wohntBeiEltern ? 'checked':''} />
              <span>Person wohnt im Haushalt der Eltern
                <span style="font-size:0.76rem;color:var(--grau-500);font-weight:400;">
                  (§ 7 Abs. 6 Nr. 2 SGB II — Aufstockungsprüfung)
                </span>
              </span>
            </label>
          </div>
        </div>

      </div><!-- /person-felder -->
    `;

    // Events binden
    bindPersonEvents(div, person);
    return div;
  }

  // ----------------------------------------------------------
  // EVENTS FÜR EINE PERSONENKARTE BINDEN
  // ----------------------------------------------------------

  function bindPersonEvents(el, person) {

    // Entfernen-Button
    el.querySelector('.btn-person-loeschen').addEventListener('click', (e) => {
      e.stopPropagation();
      entfernePerson(person.id);
    });

    // Alle Input/Select-Felder
    el.querySelectorAll('[data-feld]').forEach(input => {
      const event = input.type === 'checkbox' || input.type === 'radio' ? 'change' : 'input';
      input.addEventListener(event, () => {
        const feld = input.dataset.feld;
        const wert = input.type === 'checkbox' ? input.checked : input.value;

        // Personendaten aktualisieren
        const p = personen.find(p => p.id === person.id);
        if (!p) return;
        p[feld] = wert;

        // Speziallogik: Header-Kurzinfo aktualisieren
        if (feld === 'name' || feld === 'rolle') {
          const header = el.querySelector('.person-name-kurzinfo');
          const rolleEl = el.querySelector('.person-rolle-tag');
          if (feld === 'name') header.textContent = wert || `Person ${el.closest('.person-karte') ? '?' : '?'}`;
          if (feld === 'rolle') rolleEl.textContent = ROLLEN.find(r => r.value === wert)?.label || 'Rolle auswählen';
        }

        // Prüfungs-Checkboxen → Detail-Bereiche einblenden
        if (feld === 'pruefungEU') {
          el.querySelector(`[data-detail="eu"]`).classList.toggle('offen', !!wert);
        }
        if (feld === 'pruefungBafoeg') {
          el.querySelector(`[data-detail="bafoeg"]`).classList.toggle('offen', !!wert);
        }

        // Aufenthaltsstatus → Erwerbs-Felder
        if (feld === 'aufenthaltsStatus') {
          const zeigeErwerb = (wert === 'arbeitnehmer' || wert === 'selbststaendig');
          el.querySelector(`[data-erwerb="${person.id}"]`).classList.toggle('versteckt', !zeigeErwerb);
        }

        // Ausbildung ja/nein → Detail-Felder
        if (feld === 'inAusbildung') {
          el.querySelector(`[data-ausbildung="${person.id}"]`).classList.toggle('versteckt', wert !== 'ja');
        }

        // Ausbildungsart → Auto-BAföG
        if (feld === 'ausbildungsart') {
          p.ausbildungsartLabel = input.options[input.selectedIndex]?.text || wert;
          const cfg = window.CONFIG?.bafoeg;
          if (cfg && p.bafoegFoerderfaehig === 'auto') {
            const autoTag = el.querySelector(`[data-autotag="${person.id}"]`);
            if (cfg.foerderfaehigeArten.includes(wert)) {
              if (autoTag) autoTag.textContent = '✓ förderfähig';
            } else if (cfg.nichtFoerderfaehigeArten.includes(wert)) {
              if (autoTag) autoTag.textContent = '✗ nicht förderfähig';
            } else {
              if (autoTag) autoTag.textContent = '? unklar';
            }
          }
        }
      });
    });
  }

  // ----------------------------------------------------------
  // PRÜFUNG STARTEN
  // ----------------------------------------------------------

  btnPruefen.addEventListener('click', () => {
    if (personen.length === 0) {
      zeigeToast('Bitte mindestens eine Person zur Bedarfsgemeinschaft hinzufügen.');
      return;
    }

    // Daten frisch aus dem DOM lesen (sicherste Methode)
    const bgErgebnisse = window.pruefeBedarfsgemeinschaft(personen);

    rendereErgebnis(bgErgebnisse);
    ergebnisSection.classList.add('sichtbar');
    bgErfassungSection.classList.add('versteckt');

    // Tabs aktualisieren
    tabBG.classList.remove('aktiv');
    tabBG.classList.add('fertig');
    tabErgebnis.classList.add('aktiv');

    ergebnisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ----------------------------------------------------------
  // NEUE PRÜFUNG
  // ----------------------------------------------------------

  btnNeuePruefung.addEventListener('click', () => {
    ergebnisSection.classList.remove('sichtbar');
    bgErfassungSection.classList.remove('versteckt');
    tabBG.classList.add('aktiv');
    tabBG.classList.remove('fertig');
    tabErgebnis.classList.remove('aktiv');
    bgErfassungSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ----------------------------------------------------------
  // ERGEBNIS RENDERN
  // ----------------------------------------------------------

  function rendereErgebnis(bgErgebnisse) {
    ergebnisInhalt.innerHTML = '';

    // Je Person ein Block
    bgErgebnisse.forEach(({ person, ergebnis }, idx) => {
      const name   = person.name || `Person ${idx + 1}`;
      const rolle  = ROLLEN.find(r => r.value === person.rolle)?.label || '';
      const { ampelStatus, ampelText, pruefschritte, alleNachweise } = ergebnis;

      const ampelEmojis = { gruen: '✅', gelb: '⚠️', rot: '🚫' };

      const personDiv = document.createElement('div');
      personDiv.className = 'person-ergebnis';
      personDiv.innerHTML = `
        <div class="person-ergebnis-header ${ampelStatus}">
          <div class="person-ampel-kreis">${ampelEmojis[ampelStatus] || '❓'}</div>
          <div class="person-ampel-info">
            <h3>${ampelText}</h3>
            <p>${escHTML(name)}${rolle ? ' · ' + escHTML(rolle) : ''}</p>
          </div>
        </div>
        <div class="pruefschritte" id="schritte-${person.id}"></div>
      `;

      ergebnisInhalt.appendChild(personDiv);

      // Prüfschritte
      const schritteEl = personDiv.querySelector(`#schritte-${person.id}`);
      pruefschritte.forEach(s => {
        const sd = document.createElement('div');
        sd.className = 'pruefschritt';
        const icons = { ok: '✓', warnung: '!', ausschluss: '✕', info: 'i' };
        const nachweiHTML = s.nachweise?.length
          ? `<ul class="ps-nachweise">${s.nachweise.map(n => `<li>${escHTML(n)}</li>`).join('')}</ul>`
          : '';
        sd.innerHTML = `
          <div class="ps-icon ${s.ergebnis}">${icons[s.ergebnis] || '?'}</div>
          <div class="ps-inhalt">
            <div class="ps-kriterium">${escHTML(s.kriterium)}</div>
            <div class="ps-begruendung">${escHTML(s.begruendung)}</div>
            ${nachweiHTML}
          </div>
        `;
        schritteEl.appendChild(sd);
      });

      // Nachweise je Person
      if (alleNachweise.length > 0) {
        const nDiv = document.createElement('div');
        nDiv.className = 'nachweise-karte';
        nDiv.style.margin = '0 20px 20px';
        nDiv.innerHTML = `
          <h3>📎 Benötigte Nachweise — ${escHTML(name)}</h3>
          <ul>${alleNachweise.map(n => `<li>${escHTML(n)}</li>`).join('')}</ul>
        `;
        personDiv.appendChild(nDiv);
      }
    });

    // Gesamt-Prüfvermerk
    const vermerkText = generiereVermerk(bgErgebnisse);
    const vermerkDiv = document.createElement('div');
    vermerkDiv.className = 'vermerk-karte';
    vermerkDiv.innerHTML = `
      <h3>📄 Kopierbarer Prüfvermerk (gesamt)</h3>
      <pre class="vermerk-text" id="vermerk-text">${escHTML(vermerkText)}</pre>
      <button class="btn-kopieren" id="btn-kopieren" type="button">📋 Vermerk kopieren</button>
    `;
    ergebnisInhalt.appendChild(vermerkDiv);

    // Rechtsstand
    const rsDiv = document.createElement('p');
    rsDiv.className = 'rechtsstand';
    rsDiv.textContent = CONFIG.hinweise.rechtsstand;
    ergebnisInhalt.appendChild(rsDiv);

    // Kopieren-Button
    document.getElementById('btn-kopieren').addEventListener('click', async () => {
      const text = document.getElementById('vermerk-text').textContent;
      try {
        await navigator.clipboard.writeText(text);
        const btn = document.getElementById('btn-kopieren');
        btn.textContent = '✓ Kopiert!';
        btn.classList.add('kopiert');
        setTimeout(() => {
          btn.textContent = '📋 Vermerk kopieren';
          btn.classList.remove('kopiert');
        }, 2000);
      } catch {
        zeigeToast('Kopieren fehlgeschlagen — bitte manuell markieren.');
      }
    });
  }

  // ----------------------------------------------------------
  // PRÜFVERMERK GENERIEREN
  // ----------------------------------------------------------

  function generiereVermerk(bgErgebnisse) {
    const linie = '─'.repeat(58);
    const zeilen = [];

    zeilen.push('PRÜFVERMERK — SGB II Anspruchsprüfung nach § 7 SGB II');
    zeilen.push(linie);
    zeilen.push(`Datum/Uhrzeit: ${new Date().toLocaleString('de-DE')}`);
    zeilen.push(`Anzahl BG-Mitglieder: ${bgErgebnisse.length}`);
    zeilen.push('');

    bgErgebnisse.forEach(({ person, ergebnis }, idx) => {
      const name  = person.name || `Person ${idx + 1}`;
      const rolle = ROLLEN.find(r => r.value === person.rolle)?.label || '';
      const statusMap = { gruen: 'KEIN AUSSCHLUSS', gelb: 'WEITERE PRÜFUNG NÖTIG', rot: 'AUSSCHLUSS WAHRSCHEINLICH' };

      zeilen.push(`PERSON ${idx + 1}: ${name}${rolle ? ' (' + rolle + ')' : ''}`);
      zeilen.push(`Alter: ${person.alter || 'n. a.'} Jahre`);
      zeilen.push(`Gesamtergebnis: [${statusMap[ergebnis.ampelStatus] || '?'}]`);
      zeilen.push('');
      zeilen.push('Geprüfte Kriterien:');

      ergebnis.pruefschritte.forEach((s, i) => {
        const sym = { ok: '✓', warnung: '!', ausschluss: '✕', info: 'i' }[s.ergebnis] || '?';
        zeilen.push(`  ${i + 1}. [${sym}] ${s.kriterium}`);
        zeilen.push(`     ${s.begruendung}`);
        if (s.nachweise?.length) {
          zeilen.push('     Nachweise:');
          s.nachweise.forEach(n => zeilen.push(`       → ${n}`));
        }
        zeilen.push('');
      });

      zeilen.push(linie);
    });

    zeilen.push(CONFIG.hinweise.rechtsstand);
    return zeilen.join('\n');
  }

  // ----------------------------------------------------------
  // HILFSFUNKTIONEN
  // ----------------------------------------------------------

  function zeigeToast(meldung) {
    toast.textContent = meldung;
    toast.classList.add('sichtbar');
    setTimeout(() => toast.classList.remove('sichtbar'), 3000);
  }

  function escHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Startperson direkt hinzufügen (UX-Verbesserung)
  btnPersonHinzu.click();
});
