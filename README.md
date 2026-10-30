# Seriendruck Brief-Generator v3 – README

Datei `index.html` per Doppelklick im Browser öffnen (Chrome, Edge oder Firefox). Der Quelltext liegt im Klartext in der Datei. Beim Laden wird eine Internetverbindung für die Schriften Roboto und Open Sans benötigt.

## Schnellstart

1. **Beispiel** klicken und die Vorschau ansehen.
2. Eigene Empfängerdaten einfügen oder per **CSV / TXT laden…** importieren.
3. Texte anpassen, Vorschau prüfen, **Drucken / PDF** wählen.

## 1 · Empfänger und Adresse

- **Empfängerliste:** Die erste Zeile enthält die Spaltennamen, jede weitere Zeile ist ein Empfänger. Trennzeichen sind Tabulator (Einfügen aus Excel), Semikolon oder Komma. Beispiel:
  `Anrede;Titel;Vorname;Nachname;Firma;Straße;PLZ;Ort`
- **CSV laden:** Bei Umlautfehlern die Kodierung auf *Windows-1252 (Excel DE)* stellen und die Datei erneut laden.
- **Adressfeld-Vorlage:** Hier legst du fest, wie die Adresse aufgebaut ist, z. B. `{Firma}`, `{Anrede} {Titel} {Vorname} {Nachname}`, `{Straße}`, `{PLZ} {Ort}`. Leere Zeilen entfallen automatisch.
- **Brief-Anrede:** Standard ist `{Briefanrede}`. Sie wird aus den Spalten *Anrede* (Frau/Herr), *Titel* und *Nachname* gebildet. Fehlt die Information, steht „Sehr geehrte Damen und Herren,". Du kannst auch festen Text eingeben.

## Platzhalter

Platzhalter funktionieren in **allen** Textfeldern (Adresse, Anrede, Betreff, Brieftext, Grußformel, Fußzeile, Info-Block, Anlagen).

- Jede Spalte der Liste, z. B. `{Nachname}` (Groß-/Kleinschreibung egal)
- `{Briefanrede}`, `{Datum}`, `{Betreff}`, `{Brief_ID}`

Ein Klick auf einen Chip fügt den Platzhalter in das zuletzt bearbeitete Feld ein. Gelbe Warnung oben links: Es gibt unbekannte Platzhalter (Tippfehler) oder leere Werte in mindestens einem Brief.

## 2 · Absender und Kopf

**Absender:** Zeile 1 ist die Rücksendezeile (über der Empfängeradresse), die weiteren Zeilen sind die vollständige Absenderadresse (bei nur einer Zeile wird diese verwendet). Unter *Absenderadresse anzeigen* wählst du, wo sie erscheint: **Briefkopf** (oben links, Standard), **Informationsblock** (rechts, oberhalb der Infozeilen), **Fußzeile** oder gar nicht.

Jede Option ist ein-/ausschaltbar: Rücksendezeile, Vermerk (z. B. „Einschreiben"), Datum (automatisch „heute"; das Feld ist dann gesperrt – für eine Handeingabe die Automatik ausschalten), Informationsblock (Zeilen im Format `Bezeichnung: Wert`), Datum und Brief-ID im Informationsblock, Logo. **Die Brief-ID ist standardmäßig aus.** Präfix und Startnummer sind einstellbar. Logos werden beim Laden automatisch verkleinert.

## 3 · Brieftext

Fett, kursiv, unterstrichen, Linksbündig, Blocksatz, Listen, Formatierung entfernen. **+ Seitenumbruch** erzwingt einen Umbruch (gestrichelte Linie, mit Entf/Rücktaste löschbar). Sonst bricht die Anwendung **automatisch** um. Eingefügter Text aus Word oder dem Web wird auf einfache Formatierungen reduziert.

## 4 · Layout und Ausgabe

- **Form B** (Adresse bei 45 mm, Falzmarken 105/210 mm) für Standardfensterumschläge, **Form A** (27 mm) für Umschläge mit hoch sitzendem Fenster. Beim ersten Probedruck mit deinem Umschlag prüfen.
- **Layout-Vorlage** (nur Aussehen, Inhalte bleiben unverändert; jederzeit auf bestehende Briefe anwendbar und wechselbar):
  - *Geschäftsbrief* – Absenderadresse links oben, Logo/Monogramm rechts (Standard).
  - *Privatbrief* – Absenderadresse rechts oben, Monogramm links; geeignet für Briefe von Privatpersonen an Unternehmen (Empfänger mit `{Firma}`, Anrede fällt ohne Nachname auf „Sehr geehrte Damen und Herren," zurück).
  - *Zentriert* – Absenderadresse mittig oben, Monogramm links.
  - *Linie* – wie Geschäftsbrief, mit feiner Trennlinie unter dem Briefkopf.
  Die Absenderadresse erscheint im Briefkopf nur, wenn dort die Position *Briefkopf* gewählt ist (siehe Abschnitt 2).
- **Monogramm** (optional): Kreis mit 1–3 Buchstaben. Ohne eigene Eingabe werden die Initialen des Absenders (Rechtsform wie GmbH wird ignoriert) verwendet. Ein geladenes Logo hat Vorrang vor dem Monogramm.
- Schriftart, Größe, Zeilenabstand.
- Falz-/Lochmarken getrennt für Vorschau und Ausdruck (Ausdruck nur auf Blankopapier einschalten).
- Seitenzahl „Seite x von y" (bei aktivem Kopf auf Folgeseiten im Kopf, sonst in der Fußzeile), Fußzeile.
- **Kopf auf Folgeseiten** (angelehnt an DIN 5008): dezente einzeilige Kopfzeile mit Empfänger (erste Adresszeile), Datum und Seitenzahl, danach Freiraum bis zum Text.
- **Druckumfang:** alle Briefe oder nur der in der Vorschau angezeigte.

## Vorschau

Auswahlfeld und ‹ › wechseln zwischen den Empfängern, „Alle" zeigt alle Briefe. Der Zoom-Regler verändert nur die Ansicht.

## Drucken / PDF

Im Druckdialog: **A4**, **Ränder: Keine**, **Skalierung 100 %**, **Kopf- und Fußzeilen ausschalten**, Hintergrundgrafiken an. Für PDF als Drucker „Als PDF speichern" wählen.

## Speichern

- Alle Eingaben einschließlich der gewählten Layout-Vorlage und des Monogramms werden automatisch im Browser gesichert (Meldung bei Fehlern).
- Der **Dokumentname** oben im Header wird für den Seitentitel, den Namen des PDF-Druckvorschlags und den JSON-Export verwendet.
- **Speichern / Laden / Löschen:** Der Dokumentname ist zugleich der Name des benannten Entwurfs im Browser. Für einen weiteren Entwurf zuerst den Namen oben ändern und dann speichern.
- **Export / Import:** JSON-Datei, die einzig verlässliche Sicherung (z. B. bei Browserwechsel oder Umbenennen der Datei). Der Export erhält den Dokumentnamen; bei älteren Importdateien ohne Namensfeld wird der Dateiname übernommen. Importierte Texte werden bereinigt. Ältere Entwürfe/Exporte ohne Layoutangabe laden mit *Geschäftsbrief* und ohne Monogramm.
- Vor jedem Überschreiben (Beispiel, Import, Entwurf laden, CSV) kommt eine Rückfrage.
