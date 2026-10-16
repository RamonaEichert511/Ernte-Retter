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
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
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
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS rezepte (
                id SERIAL PRIMARY KEY,
                owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                title TEXT NOT NULL,
                beschreibung TEXT,
                zutaten TEXT[] NOT NULL DEFAULT '{}',
                schritte TEXT[] NOT NULL DEFAULT '{}',
                kategorie TEXT NOT NULL DEFAULT 'abendessen',
                image_url TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
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
        startrezepte = [
            (
                "Saure Gurken",
                "Klassisch eingelegt, nach ein paar Wochen perfekt.",
                [
                    "1 kg kleine Gurken",
                    "1 l Wasser",
                    "50 g Salz",
                    "Dill",
                    "Senfkörner",
                ],
                [
                    "Gurken waschen und in Gläser schichten.",
                    "Wasser mit Salz aufkochen und abkühlen lassen.",
                    "Dill und Senfkörner zugeben, Lake über die Gurken gießen.",
                    "Gläser verschließen und mindestens 4 Wochen dunkel lagern.",
                ],
                "haltbarmachen",
            ),
            (
                "Kürbissuppe",
                "Cremige Suppe für den Herbst.",
                [
                    "1 Hokkaido-Kürbis",
                    "1 Zwiebel",
                    "700 ml Gemüsebrühe",
                    "200 ml Sahne",
                ],
                [
                    "Kürbis und Zwiebel würfeln und anbraten.",
                    "Mit Brühe ablöschen und 20 Minuten köcheln.",
                    "Pürieren, Sahne zugeben und abschmecken.",
                ],
                "abendessen",
            ),
            (
                "Tomaten soße",
                "Leckere Tomatensoße ",
                [
                    "1200 g Tomaten",
                    "1 Zwiebel, rot fein gehackt",
                    "2 Knoblauchzehen fein gehackt",
                    "2EL Olivenöl",
                    "50 g Tomatenmark",
                    "1 TL Salz",
                    "1 TL Rohrohrzucker oder weißer Zucker",
                    "1 TL Paprika rosenscharf oder milder Paprika oder Chilipulver",
                    "1 Handvoll frische oder getrocknete Kräuter z.B. Basilikum, Oregano, Thymian"
                ],
                [
                    "Vorbereitung",
                    "Zwiebel und Knoblauch schälen und fein hacken. Tomaten vierteln, den Blütenansatz herausschneiden und dann in Stücke schneiden. Alle übrigen Zutaten bereitstellen.",
                    "1200 g Tomaten | 1 Zwiebel, rot | 2 Knoblauchzehen",
                    "Gläser säubern und heiß ausspülen, ebenso die Deckel und den Einfülltrichter (falls vorhanden).",
                    "Zubereitung",
                    "1. In einem großen Topf oder Pfanne Öl erhitzen und die Zwiebeln darin abraten. Knoblauch kurz mit anschwitzen, Tomatenmark hinzufügen und kurz mitbraten.",
                    "2 EL Olivenöl | 50 g Tomatenmark",
                    "2. Nun die Tomatenstücke zugeben und mit Salz, Paprikapulver und Zucker würzen, aufkochen und dann 30 Minuten zugedeckt köcheln lassen. Die kleingeschnittenen Kräuter 5 Minuten vor Ende zugeben.",
                    "1 TL Salz | 1 TL Rohrohrzucker | 1 TL Paprika rosenscharf | 1 Handvoll frische oder getrocknete Kräuter",
                    "3. Kurz abkühlen, dann kommt die Tomatensoße in den Mixer und wird einmal kräftig durchgemixt, damit keine Schalenstücke zurückbleiben. (Alternativ mit dem Pürierstab mixen). Dann gehts zurück in den Topf und nochmals kurz aufkochen lassen. Ggf. nochmals abschmecken.",
                    "Fertigstellung",
                    "Ofen auf 100 Grad Umluft vorheizen.",
                    "Die heiße Tomatensoße in die Gläser füllen, dabei auf saubere Ränder achten und sofort verschließen.",
                    "Gläser in eine Auflaufform oder in die tiefe Fettpfanne stellen (sie sollen sich nicht berühren). In den heißen Ofen schieben, 2-3 cm hoch heißes Wasser zugießen und mindestens 30 Minuten bei 100 Grad im Ofen einkochen. ",
                    "Beim Abkühlen bildet sich ein Vakuum. Das erkennst du daran, dass sich der Deckel etwas einzieht und bei Berührung weder knackt noch nachgibt. Damit ist die Tomatensoße mindestens 1 Jahr haltbar.",
                    "Fülle die Tomatensoße in unterschiedlich große Gläser, dann hast du für verschiedene Gerichte immer die richtige Menge zur Hand. Außerdem ist selbstgemachte Tomatensoße ein beliebtes Gastgeschenk, wenn du eingeladen bist."
                ],
                "haltbarmachen"
            )
        ]

        # Gleichzeitige Starts dürfen keine doppelten Rezepte anlegen.
        conn.execute("LOCK TABLE rezepte IN SHARE ROW EXCLUSIVE MODE")

        for rezept in startrezepte:
            conn.execute(
                """
                INSERT INTO rezepte
                    (title, beschreibung, zutaten, schritte, kategorie)
                SELECT %s, %s, %s, %s, %s
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM rezepte
                    WHERE title = %s AND owner_id IS NULL
                )
                """,
                (*rezept, rezept[0]),
            )