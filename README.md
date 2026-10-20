![Ernte Retter – CookieCrew](images/ernte-retter-banner.png)

# 🌱 Ernte Retter – Ein Projekt der CookieCrew

## 📝 Projektbeschreibung

Dieses Repository enthält unser Abschlussprojekt **Ernte Retter**.

Die Idee ist aus meinem eigenen Gartenalltag entstanden: Man steckt viel Zeit und Herz in den Garten und plötzlich wird alles gleichzeitig reif. Wohin mit den ganzen Zucchini, Tomaten und dem Obst? Zum Wegwerfen ist die eigene Ernte einfach viel zu schade.

Unser Ziel ist es, eine Anwendung zu entwickeln, die dabei hilft, Ernte und Vorräte im Blick zu behalten, passende Rezepte zu finden und Obst und Gemüse haltbar zu machen. Eine Einmach-Fibel soll dabei Tipps und Wissen rund ums Haltbarmachen vermitteln.

Zusätzlich bauen wir einen Marktplatz, auf dem überschüssige Ernte angeboten und von anderen reserviert werden kann. Denn was bei einem zu viel ist, kann jemand anderes vielleicht gerade gut gebrauchen.

Den ursprünglich von mir entwickelten Ernte Retter bauen wir für unser Abschlussprojekt gemeinsam weiter aus – mit React, einem Python-Backend und Docker.

**Weniger verschwenden, mehr aus der eigenen Ernte machen und miteinander teilen.** 🌿

## 🍪 CookieCrew

Wir sind Bendix,Lee und Ramona und haben uns im Kurs Cloud-25-11 als Lerngruppe gefunden.

Nach unserem gemeinsamen Cookino Shop widmen wir uns nun dem Ernte Retter. Ein anderes Thema, aber mit genauso viel Herz, eigenen Ideen und dem Wunsch, gemeinsam etwas zu bauen, das auch im Alltag nützlich ist. ❤️


**📅 Wichtiger Termin:**  
Projektvorstellung: 21. Oktober 2026 


### Dokumentation
#### *7.Oktober*
* Thema finden
* Repo anlegen
* Features festlegen
* Besprechung wer macht was, ideen Sammlung

#### *8.Oktober*
######  Bendix:
  - Schreiben von docker-compose.yml, damit Frontend und Backend lokal als Container zusammen hochfahren 

######  Lee:
  - Backend Struktur gebaut

######  Ramona: 
  - Markplatz gebaut
  - Dokumentation

#### *9.Oktober*
######  Bendix:
  -  habe die AWS EC2-Instanz eingerichtet, habe die Docker-Laufzeitumgebung installiert und das manuelle Deployment auf dem Server getestet.

######  Lee:
  - Habe mit den Main.py code angefangen 

######  Ramona:
  - Dokumentation
  - umbau des Frontend 

#### *12.Oktober*
######  Bendix:
  - CloudFront eingerichtet
  - Domain auf AWS zertifiziert und bei CloudFront bereitgestellt


######  Lee:
  - Database und FAST API integrated. Database struktur gestartet.

######  Ramona:
  - Domain gekauft "ernteretter.de" 
  - Rezepte rausgesucht zum Füttern der Datenbank. 
  - Domain mit Bendix eingerichtet. Einstellungen vorgenommen für AWS Zertifizierung. 
  - Dokumentation auf den neuesten stand gebracht.

#### *13.Oktober*
######  Bendix:
  - fehlende .env angelegt, die docker-compose.yml um den PostgreSQL-Service sowie die .env-Einbindung erweitert
  - Bugfixing bis Anmeldung/ Registrierung funktionieren

######  Lee:
  - Authentication, Token und Login-System eingebaut.

######  Ramona:
  - Bug fix zwischen frontend und backend  mit Bendix 
  - LogIn funktioniert jetzt ! 
  - Dokumentation 

#### *14.Oktober*
######  Bendix:
  - Automatischer invalidierungsbefehl auf cloudfront bei GitHub Actions push eingerichtet
  - Healthcheck für backend in deploy.yml ergänzt

######  Lee:
  - aufgaben database gebaut, bug fixes

######  Ramona:
  - Dokumentation 
  - Fix zwischen Frontend und Backend gesucht 
  - Fix liste erstellt für Frontend und Backend
  - Probleme behoben oder funktionen neu eingebaut 
    - Reservierung zurückgeben button 
    - Benutzername ändern in Email beim Login
    - Benutzernamen anzeigen im Inserat 
    - Benutzernamen anzeigen im  “Mein konto”  

#### *15.Oktober*
######  Bendix:
  - Von veraltetem Python 3.10 auf 3.11 gewechselt, damit das websockets-Paket fehlerfrei durchläuft.
  - Einen Dummy-Test (tests/test_app.py) ergänzt, damit pytest nicht mangels Testdateien mit Exit-Code 5 abbricht. -> 
    Pipeline läuft stabil durch, synchronisiert via GitOps den AWS-Server, baut Docker neu, prüft den Health-Check und leert den CloudFront-Cache.


######  Lee:
  - favoriten und Wecker im backend gebaut

######  Ramona:
  - Dokumentation 
  - Aktualisierung beim Wechsel zwischen den Seiten eingebaut.
  - Aufgaben im Frontend an die Datenbank angebunden.
  - Fehler bei den Inseraten behoben.
  - Dropdown-Menüs für Menge und Einheit im Inserat hinzugefügt.
  - Spoonacular-API entfernt. Künftig werden eigene, eingepflegte Rezepte abgerufen; diese Funktion wird noch ausgebaut.
  - Footer angepasst und die Verlinkung zu „Über mich“ entfernt

#### *16.Oktober*
######  Bendix:
  - build-check für frontend in deploy.yml nachgerüstet
  - email-benachrichtigungs-service via AWS SES eingerichtet, entsprechende secrets für GitHub ergänzt, deploy.yml und docker-compose.
  - yml dafür angepasst

######  Lee:
  - Email system in backend gebaut

######  Ramona:
  - rezepte raus gesucht
  - einmach Fibel inhalt rausgesucht 
  - Fix ‘function {searchFromHero}’ wieder hinzugefügt 
  - Rezept dateien im Frontend angepasst, das Rezepte ordentlich angezeigt werden. 
  - Email link im frontend einbauen 
  - email link bugfix 
  - Dark mode fehler im Inserat 

#### *19.Oktober*
######  Bendix:
  - begonnen die Präsentationsfolien vorzubereiten

######  Lee:
  - Web socket und Profile bearbeiten Im backend gebaut

######  Ramona:
  - Chat button in Navbar und ans inserat frontend
  - Reservierung aufheben, von Ersteller, button hinzufügen
  - Automatische Abmeldung nach 60 min Inaktivität im Frontend eingebaut
  - Rezepte rausgesucht
  - “Mein Konto” Frontend bauen

#### *20.Oktober*
######  Bendix:
  - Präsentations folien 

######  Lee:
  - Bugfixing und mein Konto & Auto Logout eingebaut

######  Ramona:
  - Inserat verlinkung im PopUp konto
  - Konto informationen hinzufügen → nach anbindung ans backend
  - Änderungen Speichern button ‘aktivieren’
  - Fix zwischen frontend und backend
  - Chat entfernen button hinzugefügt
