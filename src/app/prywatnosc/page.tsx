import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';

const h2 = "font-[family-name:var(--font-instrument-serif)] text-2xl text-[#0E2A47] mt-10 mb-3";
const p = "text-[#12202B]/80 leading-relaxed mb-3";
const li = "text-[#12202B]/80 leading-relaxed mb-2";
const ol = "list-decimal list-outside pl-5 space-y-2 mb-3";
const ul = "list-disc list-outside pl-5 space-y-2 mb-3";

export default function PrywatnoscPage() {
  return (
    <main className="min-h-screen bg-[#F7F5F0] text-[#12202B]">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="font-[family-name:var(--font-instrument-serif)] text-4xl text-[#0E2A47]">
          Polityka Prywatności platformy Studilly
        </h1>
        <p className="mt-3 text-sm text-[#12202B]/60">Data wejścia w życie: 07.08.2026</p>

        <h2 className={h2}>§1 Administrator danych</h2>
        <p className={p}>Administratorem danych osobowych zbieranych za pośrednictwem platformy Studilly (www.studilly.com) jest:</p>
        <p className={p}>
          <strong>Studilly – Olivia Sienkiewicz</strong><br />
          Jednoosobowa działalność gospodarcza<br />
          NIP: 9512653365<br />
          REGON: 545390275<br />
          Adres: ul. Komfortowa 6, 02-995 Warszawa<br />
          E-mail: olivkasienkiewicz@gmail.com
        </p>
        <p className={p}>W sprawach dotyczących ochrony danych osobowych można kontaktować się bezpośrednio pod powyższym adresem e-mail.</p>

        <h2 className={h2}>§2 Jakie dane zbieramy</h2>
        <ul className={ul}>
          <li className={li}><strong>Dane konta:</strong> adres e-mail, imię i nazwisko, rola (Uczeń/Korepetytor).</li>
          <li className={li}><strong>Dane profilu Korepetytora:</strong> imię i nazwisko, przedmiot, poziom nauczania (HL/SL), opis, zdjęcie.</li>
          <li className={li}><strong>Dane Rezerwacji:</strong> wybrany termin, przedmiot, status płatności, kod referencyjny.</li>
          <li className={li}><strong>Zgłoszenia dotyczące brakujących przedmiotów:</strong> przedmiot, poziom, dodatkowa notatka.</li>
          <li className={li}><strong>Dane techniczne:</strong> preferencje językowe (cookie), dane sesji logowania.</li>
        </ul>
        <p className={p}><strong>Uwaga dotycząca płatności:</strong> Studilly nie przechowuje danych kart płatniczych ani danych bankowych Użytkowników. Płatności odbywają się poprzez bezpośredni przelew bankowy realizowany samodzielnie przez Ucznia na rachunek Studilly; Platforma przechowuje jedynie status i kod referencyjny płatności w celu jej identyfikacji.</p>

        <h2 className={h2}>§3 Cele i podstawy prawne przetwarzania danych</h2>
        <p className={p}>Założenie i obsługa konta, logowanie, obsługa Rezerwacji i płatności oraz kontakt w sprawie zajęć przetwarzane są na podstawie art. 6 ust. 1 lit. b) RODO (wykonanie umowy). Rozpatrywanie reklamacji i zapewnienie bezpieczeństwa Platformy przetwarzane są na podstawie art. 6 ust. 1 lit. c) i f) RODO (obowiązek prawny / prawnie uzasadniony interes). Prowadzenie ksiąg rachunkowych i rozliczeń podatkowych przetwarzane jest na podstawie art. 6 ust. 1 lit. c) RODO (obowiązek prawny).</p>

        <h2 className={h2}>§4 Okres przechowywania danych</h2>
        <ul className={ul}>
          <li className={li}>dane konta – przez czas jego posiadania oraz do 12 miesięcy po jego usunięciu lub zaprzestaniu korzystania z Platformy, chyba że dłuższy okres wynika z przepisów prawa,</li>
          <li className={li}>dane dotyczące płatności i rozliczeń – przez okres wymagany przepisami podatkowymi i rachunkowymi (co do zasady 5 lat, licząc od końca roku podatkowego).</li>
        </ul>

        <h2 className={h2}>§5 Odbiorcy danych</h2>
        <ul className={ul}>
          <li className={li}><strong>Dostawca hostingu bazy danych</strong> (Neon, Inc.) – przechowywanie danych w bazie danych Platformy.</li>
          <li className={li}><strong>Dostawca hostingu i infrastruktury aplikacji</strong> (Vercel Inc.) – utrzymanie działania Platformy.</li>
          <li className={li}><strong>Dostawca usług e-mail</strong> (Resend) – wysyłka wiadomości transakcyjnych (potwierdzenia rezerwacji, linki logowania).</li>
        </ul>
        <p className={p}>Wskazani dostawcy mogą przetwarzać dane na serwerach zlokalizowanych poza Europejskim Obszarem Gospodarczym (w szczególności w USA). W takich przypadkach przekazanie danych odbywa się w oparciu o odpowiednie zabezpieczenia prawne, w tym standardowe klauzule umowne zatwierdzone przez Komisję Europejską.</p>
        <p className={p}>Studilly nie sprzedaje danych osobowych Użytkowników ani nie udostępnia ich podmiotom trzecim w celach marketingowych bez odrębnej zgody.</p>

        <h2 className={h2}>§6 Pliki cookies</h2>
        <ul className={ul}>
          <li className={li}>zapamiętania wybranego języka interfejsu (cookie <code>studilly_locale</code>),</li>
          <li className={li}>utrzymania sesji zalogowanego Użytkownika (cookie sesyjne systemu logowania).</li>
        </ul>
        <p className={p}>Powyższe pliki cookies mają charakter niezbędny do prawidłowego funkcjonowania Platformy i nie wymagają odrębnej zgody Użytkownika. Platforma nie wykorzystuje obecnie plików cookies do celów marketingowych ani analitycznych stron trzecich.</p>

        <h2 className={h2}>§7 Prawa Użytkownika</h2>
        <p className={p}>Każdemu Użytkownikowi, którego dane są przetwarzane, przysługuje prawo do:</p>
        <ol className={ol}>
          <li className={li}>dostępu do swoich danych osobowych,</li>
          <li className={li}>sprostowania (poprawienia) danych,</li>
          <li className={li}>usunięcia danych („prawo do bycia zapomnianym"), z zastrzeżeniem przypadków, w których przetwarzanie jest niezbędne do wypełnienia obowiązku prawnego,</li>
          <li className={li}>ograniczenia przetwarzania,</li>
          <li className={li}>przenoszenia danych,</li>
          <li className={li}>wniesienia sprzeciwu wobec przetwarzania opartego na prawnie uzasadnionym interesie Administratora,</li>
          <li className={li}>wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (UODO), ul. Stawki 2, 00-193 Warszawa, jeżeli Użytkownik uzna, że przetwarzanie jego danych narusza przepisy RODO.</li>
        </ol>
        <p className={p}>W celu realizacji powyższych praw prosimy o kontakt na adres: olivkasienkiewicz@gmail.com.</p>

        <h2 className={h2}>§8 Dane osób niepełnoletnich</h2>
        <p className={p}>Z uwagi na charakter Platformy (przygotowanie do egzaminów IB), część Użytkowników może nie mieć ukończonych 18 lat. Dane takich Użytkowników przetwarzane są na zasadach określonych w niniejszej Polityce, z zachowaniem szczególnej staranności. Rodzice lub opiekunowie prawni mogą kontaktować się z Administratorem w celu weryfikacji lub żądania usunięcia danych niepełnoletniego dziecka.</p>

        <h2 className={h2}>§9 Bezpieczeństwo danych</h2>
        <p className={p}>Administrator stosuje odpowiednie środki techniczne i organizacyjne w celu zabezpieczenia danych osobowych przed nieuprawnionym dostępem, utratą lub zniszczeniem, w tym m.in. szyfrowane połączenia (HTTPS), ograniczony dostęp do bazy danych oraz uwierzytelnianie bez haseł (magic link) w celu ograniczenia ryzyka wycieku danych logowania.</p>

        <h2 className={h2}>§10 Zautomatyzowane podejmowanie decyzji</h2>
        <p className={p}>Administrator nie podejmuje wobec Użytkowników decyzji opartych wyłącznie na zautomatyzowanym przetwarzaniu danych, w tym profilowaniu, wywołujących skutki prawne.</p>

        <h2 className={h2}>§11 Zmiany Polityki Prywatności</h2>
        <p className={p}>Administrator zastrzega sobie prawo do wprowadzania zmian w niniejszej Polityce Prywatności. O istotnych zmianach Użytkownicy zostaną poinformowani poprzez komunikat na Platformie lub drogą e-mailową.</p>

        <h2 className={h2}>§12 Kontakt</h2>
        <p className={p}>
          Studilly – Olivia Sienkiewicz<br />
          ul. Komfortowa 6, 02-995 Warszawa<br />
          olivkasienkiewicz@gmail.com
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
