import os

import psycopg
from psycopg.rows import dict_row

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set, e.g. "
        "postgresql://ernte_user:ernte_pass@db:5432/ernte_db"
    )


def db():
    """Open a connection for use in a `with` block.

    On success the transaction is committed, on an exception it is rolled
    back, and the connection is closed either way.
    """
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def init_db():
    with db() as conn:
        # ---------- users ----------
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                email_verified BOOLEAN NOT NULL DEFAULT FALSE,
                verify_token_hash TEXT,
                verify_expires TIMESTAMPTZ,
                wohnort TEXT,
                plz TEXT,
                ueber_mich TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        # optional profile fields (existing accounts keep all their data)
        conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS wohnort TEXT")
        conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS plz TEXT")
        conn.execute(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS ueber_mich TEXT"
        )
        # for databases where the users table already existed: accounts
        # created before email verification count as verified, so nobody
        # is locked out. New registrations set the value explicitly.
        conn.execute(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified "
            "BOOLEAN NOT NULL DEFAULT TRUE"
        )
        conn.execute(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token_hash TEXT"
        )
        conn.execute(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_expires "
            "TIMESTAMPTZ"
        )
        # one account per email, regardless of upper/lower case
        conn.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx "
            "ON users (LOWER(email))"
        )

        # ---------- sessions (one row per login / device) ----------
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                ended_at TIMESTAMPTZ
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id)"
        )
        # tidy up: sessions that have been dead for a while are not needed
        conn.execute(
            "DELETE FROM sessions WHERE last_activity_at < NOW() - INTERVAL '7 days' "
            "OR ended_at < NOW() - INTERVAL '1 day'"
        )

        # ---------- offers (Ernte teilen) ----------
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS offers (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NULL,
                status TEXT NOT NULL DEFAULT 'verfügbar',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                owner_id INTEGER NOT NULL REFERENCES users(id),
                reserved_by INTEGER REFERENCES users(id),
                menge NUMERIC(10, 2) NOT NULL DEFAULT 1,
                einheit TEXT NOT NULL DEFAULT 'Stück',
                location TEXT NOT NULL DEFAULT ''
            )
            """
        )
        # for databases where the offers table already existed
        conn.execute(
            "ALTER TABLE offers ADD COLUMN IF NOT EXISTS menge "
            "NUMERIC(10, 2) NOT NULL DEFAULT 1"
        )
        conn.execute(
            "ALTER TABLE offers ALTER COLUMN menge TYPE NUMERIC(10, 2)"
        )
        conn.execute(
            "ALTER TABLE offers ADD COLUMN IF NOT EXISTS einheit "
            "TEXT NOT NULL DEFAULT 'Stück'"
        )
        conn.execute(
            "ALTER TABLE offers ADD COLUMN IF NOT EXISTS location "
            "TEXT NOT NULL DEFAULT ''"
        )

        # ---------- nachrichten (chat about an offer) ----------
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS nachrichten (
                id SERIAL PRIMARY KEY,
                offer_id INTEGER NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
                sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                text TEXT NOT NULL,
                gelesen BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS nachrichten_offer_idx "
            "ON nachrichten (offer_id, created_at)"
        )

        # ---------- aufgaben ----------
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS aufgaben (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                priority TEXT NOT NULL DEFAULT 'mittel',
                kategorie TEXT NOT NULL DEFAULT 'allgemein',
                done BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        # for databases where the aufgaben table already existed
        conn.execute(
            "ALTER TABLE aufgaben ADD COLUMN IF NOT EXISTS priority "
            "TEXT NOT NULL DEFAULT 'mittel'"
        )
        conn.execute(
            "ALTER TABLE aufgaben ADD COLUMN IF NOT EXISTS kategorie "
            "TEXT NOT NULL DEFAULT 'allgemein'"
        )

        # ---------- rezepte (own recipes, German) ----------
        # slug: fixed internal key of a starter recipe (user recipes: NULL)
        # vorbereitung / fertigstellung / tipps: optional text sections
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS rezepte (
                id SERIAL PRIMARY KEY,
                slug TEXT,
                owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                title TEXT NOT NULL,
                beschreibung TEXT,
                zutaten TEXT[] NOT NULL DEFAULT '{}',
                vorbereitung TEXT,
                schritte TEXT[] NOT NULL DEFAULT '{}',
                fertigstellung TEXT,
                tipps TEXT,
                kategorie TEXT NOT NULL DEFAULT 'abendessen',
                image_url TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        # for databases where the rezepte table already existed
        conn.execute("ALTER TABLE rezepte ADD COLUMN IF NOT EXISTS slug TEXT")
        conn.execute(
            "ALTER TABLE rezepte ADD COLUMN IF NOT EXISTS vorbereitung TEXT"
        )
        conn.execute(
            "ALTER TABLE rezepte ADD COLUMN IF NOT EXISTS fertigstellung TEXT"
        )
        conn.execute("ALTER TABLE rezepte ADD COLUMN IF NOT EXISTS tipps TEXT")
        # several rows may have no slug (NULL), but a slug is used only once
        conn.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS rezepte_slug_idx "
            "ON rezepte (slug)"
        )

        # ---------- favoriten (must come after rezepte) ----------
        # One-time migration: an old favoriten table (Spoonacular ids, no
        # link to rezepte) is dropped and recreated below. Once the table
        # has the foreign key, this check never drops it again.
        favoriten_vorhanden = conn.execute(
            "SELECT to_regclass('favoriten') IS NOT NULL AS vorhanden"
        ).fetchone()["vorhanden"]
        hat_verweis = conn.execute(
            "SELECT 1 FROM pg_constraint "
            "WHERE conrelid = to_regclass('favoriten') "
            "AND confrelid = to_regclass('rezepte')"
        ).fetchone()
        if favoriten_vorhanden and hat_verweis is None:
            conn.execute("DROP TABLE favoriten")

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS favoriten (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                recipe_id INTEGER NOT NULL REFERENCES rezepte(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (user_id, recipe_id)
            )
            """
        )

        # ---------- wecker (Vorratskammer) ----------
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS wecker (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                produkt TEXT NOT NULL,
                einlegedatum DATE NOT NULL,
                fertig_am TIMESTAMPTZ NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )

        # ---------- Startrezepte ----------
        # Pflege der Startrezepte: Hier ändern, Backend neu starten, fertig.
        #
        # - slug: fester interner Schlüssel. Daran wird das Rezept erkannt,
        #   der Titel darf also jederzeit geändert werden. Den slug selbst
        #   nach dem ersten Start nicht mehr ändern.
        # - Neuer slug -> Rezept wird angelegt.
        # - Bekannter slug -> alle Inhalte werden aktualisiert. ID und
        #   Favoriten bleiben erhalten.
        # - frueher: (optional) alte Titel. Nur nötig, wenn ein Titel im
        #   selben Deployment geändert wird, in dem das Rezept zum ersten
        #   Mal einen slug bekommt.
        # - vorbereitung, fertigstellung, tipps: Text oder None (leer).
        #   Absätze innerhalb eines Textes mit einer Leerzeile trennen.
        # - Achtung: Manuelle Änderungen an diesen Rezepten direkt in der
        #   Datenbank werden beim nächsten Start überschrieben.
        startrezepte = [
            {
                "slug": "saure-gurken",
                "title": "Saure Gurken",
                "beschreibung": "Klassisch eingelegt, nach ein paar Wochen perfekt.",
                "zutaten": [
                    "1 kg kleine Gurken",
                    "1 l Wasser",
                    "50 g Salz",
                    "Dill",
                    "Senfkörner",
                ],
                "vorbereitung": None,
                "schritte": [
                    "Gurken waschen und in Gläser schichten.",
                    "Wasser mit Salz aufkochen und abkühlen lassen.",
                    "Dill und Senfkörner zugeben, Lake über die Gurken gießen.",
                    "Gläser verschließen und mindestens 4 Wochen dunkel lagern.",
                ],
                "fertigstellung": None,
                "tipps": None,
                "kategorie": "haltbarmachen",
            },
            {
                "slug": "kuerbissuppe",
                "title": "Kürbissuppe",
                "beschreibung": "Cremige Suppe für den Herbst.",
                "zutaten": [
                    "1 Hokkaido-Kürbis",
                    "1 Zwiebel",
                    "700 ml Gemüsebrühe",
                    "200 ml Sahne",
                ],
                "vorbereitung": None,
                "schritte": [
                    "Kürbis und Zwiebel würfeln und anbraten.",
                    "Mit Brühe ablöschen und 20 Minuten köcheln.",
                    "Pürieren, Sahne zugeben und abschmecken.",
                ],
                "fertigstellung": None,
                "tipps": None,
                "kategorie": "abendessen",
            },
            {
                "slug": "tomatensosse",
                "title": "Tomatensoße",
                "beschreibung": "Leckere Tomatensoße",
                "zutaten": [
                    "1200 g Tomaten",
                    "1 Zwiebel, rot fein gehackt",
                    "2 Knoblauchzehen fein gehackt",
                    "2EL Olivenöl",
                    "50 g Tomatenmark",
                    "1 TL Salz",
                    "1 TL Rohrohrzucker oder weißer Zucker",
                    "1 TL Paprika rosenscharf, milder Paprika oder Chilipulver",
                    "1 Handvoll frische oder getrocknete Kräuter z.B. Basilikum, Oregano, Thymian",
                ],
                "vorbereitung": (
                    "Zwiebel und Knoblauch schälen und fein hacken. Tomaten vierteln, "
                    "den Blütenansatz herausschneiden und dann in Stücke schneiden. "
                    "Alle übrigen Zutaten bereitstellen.\n\n"
                    "1200 g Tomaten | 1 Zwiebel, rot | 2 Knoblauchzehen\n\n"
                    "Gläser säubern und heiß ausspülen, ebenso die Deckel und den "
                    "Einfülltrichter (falls vorhanden)."
                ),
                "schritte": [
                    "1. In einem großen Topf oder Pfanne Öl erhitzen und die Zwiebeln darin abraten. Knoblauch kurz mit anschwitzen, Tomatenmark hinzufügen und kurz mitbraten.",
                    "2 EL Olivenöl | 50 g Tomatenmark",
                    "2. Nun die Tomatenstücke zugeben und mit Salz, Paprikapulver und Zucker würzen, aufkochen und dann 30 Minuten zugedeckt köcheln lassen. Die kleingeschnittenen Kräuter 5 Minuten vor Ende zugeben.",
                    "1 TL Salz | 1 TL Rohrohrzucker | 1 TL Paprika rosenscharf | 1 Handvoll frische oder getrocknete Kräuter",
                    "3. Kurz abkühlen, dann kommt die Tomatensoße in den Mixer und wird einmal kräftig durchgemixt, damit keine Schalenstücke zurückbleiben. (Alternativ mit dem Pürierstab mixen). Dann gehts zurück in den Topf und nochmals kurz aufkochen lassen. Ggf. nochmals abschmecken.",
                ],
                "fertigstellung": (
                    "Ofen auf 100 Grad Umluft vorheizen.\n\n"
                    "Die heiße Tomatensoße in die Gläser füllen, dabei auf saubere "
                    "Ränder achten und sofort verschließen.\n\n"
                    "Gläser in eine Auflaufform oder in die tiefe Fettpfanne stellen "
                    "(sie sollen sich nicht berühren). In den heißen Ofen schieben, "
                    "2-3 cm hoch heißes Wasser zugießen und mindestens 30 Minuten bei "
                    "100 Grad im Ofen einkochen.\n\n"
                    "Beim Abkühlen bildet sich ein Vakuum. Das erkennst du daran, dass "
                    "sich der Deckel etwas einzieht und bei Berührung weder knackt noch "
                    "nachgibt. Damit ist die Tomatensoße mindestens 1 Jahr haltbar."
                ),
                "tipps": (
                    "Fülle die Tomatensoße in unterschiedlich große Gläser, dann hast "
                    "du für verschiedene Gerichte immer die richtige Menge zur Hand. "
                    "Außerdem ist selbstgemachte Tomatensoße ein beliebtes "
                    "Gastgeschenk, wenn du eingeladen bist."
                ),
                "kategorie": "haltbarmachen",
            },
            {
               "slug": "tomatenInOel",
               "title": "Getrocknete Tomaten in Öl",
               "beschreibung": "Selbst gemachte getrocknete Tomaten in Öl – Ein Genuss für jede Küche",
               "zutaten": [
                   "1 kg Tomaten",
                   "200 ml hochwertiges Olivenöl",
                   "2-3 Knoblauchzehen",
                   "Gewürze nach Wahl (z. B. Oregano, Basilikum, Pfeffer, Salz)",
               ],
               "vorbereitung": (
                    "Tomaten vorbereiten: Waschen Sie die Tomaten gründlich und schneiden Sie "
                    "sie in Hälften oder Viertel "
                ),
               "schritte": [
                   "1. Trocknen: Legen Sie die Tomaten auf ein Backblech und trocknen "
                    "Sie sie im Ofen bei 60°C für etwa 6-8 Stunden. Alternativ können "
                    "Sie auch einen Dörrautomaten verwenden oder die Tomaten an der Sonne trocknen.",
                   "2. Einlegen: Lassen Sie die getrockneten Tomaten abkühlen und betten Sie sie in ein Einmachglas.",
                   "Fügen Sie die geschälten Knoblauchzehen und die Gewürze hinzu, bevor Sie das Öl darübergießen.",
                    ],
               "fertigstellung": (
                   "Lagerung: Verschließen Sie das Glas gut und lagern Sie es kühl und dunkel. "
                   "Nach etwa einer Woche haben die Tomaten ausreichend Aroma aufgenommen."
                   ),
               "tipps": (
                   "Wie lange sind getrocknete Tomaten in Öl haltbar?\n\n"

	                "Getrocknete Tomaten in Öl sind in der Regel etwa 6 bis 12 Monate haltbar, "
                    "vorausgesetzt, sie werden luftdicht verpackt und an einem kühlen, dunklen "
                    "Ort gelagert. Achten Sie darauf, dass die Tomaten vollständig mit Öl bedeckt sind, um Schimmelbildung zu vermeiden."
               ),
               "kategorie": "haltbarmachen",
           },
           {
                "slug": "zucchiniSalsa",
                "title": "Zucchini Salsa",
                "beschreibung": "Zucchinischwemme ? Kein Problem, dieses Rezept verarbeitet viel Zucchini auf einmal und ist sehr simpel!",
                "zutaten": [
                   "1 kg Zucchini",
                   "500g Paprika",
                   "1.5 kg Ketchup",
                   "300 ml Olivenöl",
                   "500 g Zwiebeln",
                   "2  Knoblauchzehen",
                   "2 TL Tabasco",
                   "1 TL Chilipulver",
                   "2 TL Worcestershiresauce",
                   "1 TL Kreuzkümmel",
                   "1 EL Zucker",
                   "3 TL Salz",

               ],
               "vorbereitung": (
                    "Zucchini schälen und kleinschneiden, Paprika säubern und kleinschneiden. "
                    "Zwiebeln und Knoblauch schälen und klein schneiden."
                    "Alle weiteren Zutaten bereitstellen "
                    "1 kg Zucchini | 500 g Paprika |500 g Zwiebel | 2 Knoblauchzehen \n\n"
                    "Gläser säubern und heiß ausspülen, ebenso die Deckel und den Einfülltrichter (falls vorhanden)."
                    
                ),
               "schritte": [
                   "1. Alle Zutaten in einen großen Topf geben (oder noch besser, auf zwei Töpfe verteilen). "
                
                   "2. Das Ganze ca. 1 Stunde kochen lassen und sofort danach heiß in vorbereitete Gläser füllen.",
                    ],
               "fertigstellung": None,

                   
               "tipps": (
                   "Diese Sauce kann man ungefähr 1 Jahr aufheben. Sie schmeckt kalt gut zu Fleisch oder Brot und warm zu Nudeln, Reis, mit Hackfleisch usw."

               ),
               "kategorie": "haltbarmachen",
           },           
        ]

        # Gleichzeitige Starts dürfen keine doppelten Rezepte anlegen.
        conn.execute("LOCK TABLE rezepte IN SHARE ROW EXCLUSIVE MODE")

        for rezept in startrezepte:
            # Einmalig: Ein Startrezept, das vor der Einführung der slugs
            # angelegt wurde, bekommt hier seinen slug (Erkennung über den
            # Titel). Danach wird nur noch über den slug erkannt.
            conn.execute(
                """
                UPDATE rezepte SET slug = %s
                WHERE id = (
                    SELECT id FROM rezepte
                    WHERE slug IS NULL AND owner_id IS NULL
                      AND title = ANY(%s)
                    ORDER BY id
                    LIMIT 1
                )
                AND NOT EXISTS (SELECT 1 FROM rezepte WHERE slug = %s)
                """,
                (
                    rezept["slug"],
                    [rezept["title"], *rezept.get("frueher", [])],
                    rezept["slug"],
                ),
            )
            # Neu anlegen oder Inhalte aktualisieren (id, created_at,
            # Favoriten und Besitzer bleiben unverändert).
            conn.execute(
                """
                INSERT INTO rezepte
                    (slug, title, beschreibung, zutaten, vorbereitung,
                     schritte, fertigstellung, tipps, kategorie)
                VALUES
                    (%(slug)s, %(title)s, %(beschreibung)s, %(zutaten)s,
                     %(vorbereitung)s, %(schritte)s, %(fertigstellung)s,
                     %(tipps)s, %(kategorie)s)
                ON CONFLICT (slug) DO UPDATE SET
                    title = EXCLUDED.title,
                    beschreibung = EXCLUDED.beschreibung,
                    zutaten = EXCLUDED.zutaten,
                    vorbereitung = EXCLUDED.vorbereitung,
                    schritte = EXCLUDED.schritte,
                    fertigstellung = EXCLUDED.fertigstellung,
                    tipps = EXCLUDED.tipps,
                    kategorie = EXCLUDED.kategorie
                """,
                {
                    "slug": rezept["slug"],
                    "title": rezept["title"],
                    "beschreibung": rezept["beschreibung"],
                    "zutaten": rezept["zutaten"],
                    "vorbereitung": rezept["vorbereitung"],
                    "schritte": rezept["schritte"],
                    "fertigstellung": rezept["fertigstellung"],
                    "tipps": rezept["tipps"],
                    "kategorie": rezept["kategorie"],
                },
            )