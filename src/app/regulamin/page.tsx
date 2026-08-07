import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';

const h2 = "font-[family-name:var(--font-instrument-serif)] text-2xl text-[#0E2A47] mt-10 mb-3";
const p = "text-[#12202B]/80 leading-relaxed mb-3";
const li = "text-[#12202B]/80 leading-relaxed mb-2";
const ol = "list-decimal list-outside pl-5 space-y-2 mb-3";

export default function RegulaminPage() {
  return (
    <main className="min-h-screen bg-[#F7F5F0] text-[#12202B]">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="font-[family-name:var(--font-instrument-serif)] text-4xl text-[#0E2A47]">
          Regulamin świadczenia usług platformy Studilly
        </h1>
        <p className="mt-3 text-sm text-[#12202B]/60">Data wejścia w życie: 07.08.2026</p>

        <h2 className={h2}>§1 Postanowienia ogólne</h2>
        <p className={p}>Niniejszy Regulamin określa zasady korzystania z platformy internetowej Studilly, dostępnej pod adresem www.studilly.com (dalej: „Platforma").</p>
        <p className={p}>Usługodawcą i administratorem Platformy jest:</p>
        <p className={p}>
          <strong>Studilly – Olivia Sienkiewicz</strong><br />
          Jednoosobowa działalność gospodarcza wpisana do Centralnej Ewidencji i Informacji o Działalności Gospodarczej (CEIDG)<br />
          NIP: 9512653365<br />
          REGON: 545390275<br />
          Adres: ul. Komfortowa 6, 02-995 Warszawa<br />
          E-mail: olivkasienkiewicz@gmail.com
        </p>
        <p className={p}>(dalej: „Usługodawca" lub „Studilly")</p>
        <p className={p}>Platforma umożliwia kontakt i rezerwację zajęć pomiędzy uczniami przygotowującymi się do egzaminów International Baccalaureate (IB) a korepetytorami współpracującymi ze Studilly.</p>
        <p className={p}>Korepetytorzy nie są zatrudnieni przez Studilly na podstawie umowy o pracę. Współpraca z Korepetytorami odbywa się na podstawie umów zlecenia (art. 734 i nast. Kodeksu cywilnego) lub innych umów cywilnoprawnych zawieranych odrębnie pomiędzy Studilly a danym Korepetytorem. Korepetytorzy nie są pracownikami w rozumieniu Kodeksu pracy.</p>
        <p className={p}>Korzystanie z Platformy oznacza akceptację niniejszego Regulaminu.</p>

        <h2 className={h2}>§2 Definicje</h2>
        <ul className="list-disc list-outside pl-5 space-y-2 mb-3">
          <li className={li}><strong>Użytkownik</strong> – osoba korzystająca z Platformy, w tym Uczeń lub Korepetytor.</li>
          <li className={li}><strong>Uczeń</strong> – Użytkownik rezerwujący i opłacający zajęcia.</li>
          <li className={li}><strong>Korepetytor</strong> – osoba prowadząca zajęcia na rzecz Studilly na podstawie umowy zlecenia lub innej umowy cywilnoprawnej, oferująca swoje usługi za pośrednictwem Platformy.</li>
          <li className={li}><strong>Konsument</strong> – Uczeń będący osobą fizyczną dokonującą rezerwacji w celu niezwiązanym bezpośrednio z działalnością gospodarczą lub zawodową.</li>
          <li className={li}><strong>Rezerwacja</strong> – zamówienie konkretnego terminu zajęć z wybranym Korepetytorem za pośrednictwem Platformy.</li>
        </ul>

        <h2 className={h2}>§3 Rejestracja i konto</h2>
        <ol className={ol}>
          <li className={li}>Korzystanie z Platformy wymaga założenia konta przy użyciu ważnego adresu e-mail.</li>
          <li className={li}>Logowanie odbywa się bez hasła, za pomocą linku wysyłanego każdorazowo na podany adres e-mail („magic link").</li>
          <li className={li}>Użytkownik zobowiązany jest do podania prawdziwych danych oraz zabezpieczenia dostępu do swojej skrzynki e-mail, gdyż stanowi ona jedyny sposób dostępu do konta.</li>
          <li className={li}>W przypadku podejrzenia nieautoryzowanego dostępu do konta Użytkownik zobowiązany jest niezwłocznie poinformować Studilly.</li>
        </ol>

        <h2 className={h2}>§4 Proces rezerwacji</h2>
        <ol className={ol}>
          <li className={li}>Uczeń przegląda dostępnych Korepetytorów z możliwością filtrowania według imienia i nazwiska, przedmiotu oraz poziomu (HL/SL).</li>
          <li className={li}>Uczeń wybiera dostępny termin zajęć u wybranego Korepetytora.</li>
          <li className={li}>Po potwierdzeniu Rezerwacji termin zostaje zablokowany dla danego Ucznia, a Korepetytor udostępnia link do spotkania online przed zaplanowanym terminem zajęć.</li>
          <li className={li}>Zajęcia odbywają się w zarezerwowanym terminie.</li>
          <li className={li}>Po odbyciu zajęć Uczniowi udostępniane są dane do przelewu bankowego wraz z unikalnym kodem referencyjnym – zgodnie z zasadami płatności opisanymi w §5.</li>
          <li className={li}>Cena zajęć podawana jest w złotych polskich (PLN) i obowiązuje w wysokości wskazanej w momencie dokonywania Rezerwacji.</li>
        </ol>

        <h2 className={h2}>§5 Płatności</h2>
        <ol className={ol}>
          <li className={li}>Płatność za odbyte zajęcia następuje przelewem bankowym w terminie <strong>do 48 godzin od zakończenia zajęć</strong>, na rachunek wskazany Uczniowi po zajęciach.</li>
          <li className={li}>Uczeń zobowiązany jest podać w tytule przelewu dokładny kod referencyjny wskazany przy Rezerwacji. Brak kodu referencyjnego może uniemożliwić lub opóźnić przypisanie płatności do Rezerwacji.</li>
          <li className={li}>Potwierdzenie otrzymania płatności odbywa się obecnie ręcznie przez personel Studilly. Studilly dokłada starań, aby potwierdzenie następowało możliwie szybko, jednak nie gwarantuje konkretnego czasu realizacji.</li>
          <li className={li}>W przypadku braku wpłaty w terminie 48 godzin od odbycia zajęć, Studilly zastrzega sobie prawo do naliczenia odsetek ustawowych za opóźnienie, zawieszenia możliwości dokonywania przez Ucznia kolejnych Rezerwacji do czasu uregulowania zaległej płatności, oraz podjęcia dalszych kroków przewidzianych prawem w celu odzyskania należności.</li>
        </ol>

        <h2 className={h2}>§6 Anulowanie i zmiana terminu</h2>
        <ol className={ol}>
          <li className={li}>Uczeń może wystąpić o anulowanie lub zmianę terminu zarezerwowanych zajęć, kontaktując się ze Studilly lub bezpośrednio z Korepetytorem, z zastrzeżeniem dostępności Korepetytora.</li>
          <li className={li}><strong>Anulowanie z wyprzedzeniem co najmniej 24 godzin</strong> przed zaplanowanym terminem zajęć nie wiąże się z żadnymi kosztami dla Ucznia.</li>
          <li className={li}><strong>Anulowanie z wyprzedzeniem krótszym niż 24 godziny</strong> przed zaplanowanym terminem, jak również niestawienie się Ucznia na zajęcia bez wcześniejszego powiadomienia, skutkuje obowiązkiem zapłaty pełnej kwoty za zarezerwowane zajęcia, zgodnie z zasadami płatności opisanymi w §5.</li>
          <li className={li}>W przypadku odwołania zajęć przez Korepetytora, Uczeń nie ponosi z tego tytułu żadnych kosztów. Studilly zaoferuje Uczniowi możliwość zmiany terminu na inny dostępny termin z tym samym lub innym Korepetytorem.</li>
        </ol>

        <h2 className={h2}>§7 Prawo odstąpienia od umowy (Konsumenci UE)</h2>
        <ol className={ol}>
          <li className={li}>Zgodnie z ustawą o prawach konsumenta, Konsument ma prawo odstąpić od umowy zawartej na odległość w terminie 14 dni bez podawania przyczyny.</li>
          <li className={li}>Z uwagi na fakt, że zajęcia korepetycyjne odbywają się zazwyczaj w ciągu kilku dni od dokonania Rezerwacji, poprzez potwierdzenie Rezerwacji i wyrażenie żądania rozpoczęcia świadczenia usługi przed upływem 14-dniowego terminu, Uczeń wyraźnie wyraża zgodę na natychmiastowe wykonanie usługi i przyjmuje do wiadomości, że traci prawo odstąpienia od umowy z chwilą pełnego wykonania usługi (odbycia zajęć); jeżeli zajęcia jeszcze się nie odbyły, Uczeń może odstąpić od umowy przed zaplanowanym terminem zajęć bez żadnych kosztów, kontaktując się ze Studilly.</li>
        </ol>

        <h2 className={h2}>§8 Osoby niepełnoletnie korzystające z Platformy</h2>
        <ol className={ol}>
          <li className={li}>Znaczna część uczniów przygotowujących się do egzaminów IB i korzystających ze Studilly nie ukończyła 18 roku życia.</li>
          <li className={li}>Zgodnie z prawem polskim osoby niepełnoletnie posiadają ograniczoną zdolność do czynności prawnych. Dokonując Rezerwacji, niepełnoletni Uczeń oświadcza, że posiada zgodę rodzica lub opiekuna prawnego na korzystanie z Platformy, w tym na dokonanie płatności za odbyte zajęcia.</li>
          <li className={li}>Studilly rekomenduje, aby rodzice lub opiekunowie prawni uczniów niepełnoletnich zapoznali się z niniejszym Regulaminem i, w miarę możliwości, byli zaangażowani w proces rezerwacji i płatności.</li>
        </ol>

        <h2 className={h2}>§9 Zasady korzystania z Platformy</h2>
        <p className={p}>Użytkownik zobowiązuje się do:</p>
        <ol className={ol}>
          <li className={li}>niepodawania nieprawdziwych danych podczas rejestracji lub Rezerwacji,</li>
          <li className={li}>niewykorzystywania Platformy w celu ustalania płatności lub rezerwacji poza Platformą w celu obejścia zabezpieczeń oferowanych przez Studilly,</li>
          <li className={li}>niedopuszczania się nękania, dyskryminacji lub zachowań obraźliwych wobec Korepetytorów, innych Uczniów lub personelu Studilly,</li>
          <li className={li}>niepodejmowania działań zakłócających prawidłowe funkcjonowanie Platformy.</li>
        </ol>
        <p className={p}>Studilly zastrzega sobie prawo do zawieszenia lub usunięcia konta Użytkownika naruszającego niniejszy Regulamin.</p>

        <h2 className={h2}>§10 Jakość zajęć i odpowiedzialność Korepetytorów</h2>
        <ol className={ol}>
          <li className={li}>Studilly dokłada rozsądnych starań w zakresie doboru i weryfikacji Korepetytorów współpracujących z Platformą na podstawie umów zlecenia lub innych umów cywilnoprawnych.</li>
          <li className={li}>Korepetytorzy pozostają odpowiedzialni za merytoryczny sposób prowadzenia własnych zajęć, przy czym Studilly, jako podmiot zlecający, dokłada starań, by zapewnić odpowiedni poziom świadczonych usług.</li>
          <li className={li}>Reklamacje dotyczące konkretnego Korepetytora lub zajęć należy kierować na adres wskazany w §1 ust. 2.</li>
        </ol>

        <h2 className={h2}>§11 Ograniczenie odpowiedzialności</h2>
        <ol className={ol}>
          <li className={li}>W zakresie dopuszczalnym przez prawo, odpowiedzialność Studilly z tytułu jakichkolwiek roszczeń związanych z korzystaniem z Platformy ograniczona jest do wysokości kwoty należnej za zajęcia, których dotyczy roszczenie.</li>
          <li className={li}>Studilly nie ponosi odpowiedzialności za szkody pośrednie lub następcze, w tym w szczególności za nieuzyskanie zamierzonych wyników egzaminacyjnych czy ocen.</li>
          <li className={li}>Postanowienia niniejszego paragrafu nie wyłączają ani nie ograniczają odpowiedzialności, której nie można wyłączyć na mocy bezwzględnie obowiązujących przepisów prawa, w tym przepisów o ochronie konsumentów.</li>
        </ol>

        <h2 className={h2}>§12 Reklamacje</h2>
        <p className={p}>Reklamacje dotyczące zajęć, płatności lub funkcjonowania Platformy należy zgłaszać na adres e-mail: olivkasienkiewicz@gmail.com, podając imię i nazwisko oraz adres e-mail konta, opis zgłaszanego problemu, oraz datę i kod referencyjny zajęć, jeśli dotyczy. Studilly rozpatruje reklamacje w terminie 14 dni od ich otrzymania.</p>

        <h2 className={h2}>§13 Ochrona danych osobowych</h2>
        <p className={p}>Zasady przetwarzania danych osobowych Użytkowników określa odrębna Polityka Prywatności, stanowiąca integralne uzupełnienie niniejszego Regulaminu.</p>

        <h2 className={h2}>§14 Zmiany Regulaminu</h2>
        <p className={p}>Studilly zastrzega sobie prawo do zmiany niniejszego Regulaminu. O istotnych zmianach Użytkownicy zostaną poinformowani drogą e-mailową lub poprzez komunikat na Platformie, z odpowiednim wyprzedzeniem przed ich wejściem w życie. Dalsze korzystanie z Platformy po wejściu w życie zmian oznacza ich akceptację.</p>

        <h2 className={h2}>§15 Postanowienia końcowe</h2>
        <p className={p}>Niniejszy Regulamin podlega prawu polskiemu. Wszelkie spory będą rozstrzygane przez sądy powszechne właściwe zgodnie z przepisami prawa polskiego, z zastrzeżeniem bezwzględnie obowiązujących przepisów o ochronie konsumentów, które mogą przysługiwać Konsumentowi w kraju jego zamieszkania na terenie UE. Konsument ma również możliwość skorzystania z pozasądowych sposobów rozpatrywania reklamacji i dochodzenia roszczeń, w tym za pośrednictwem platformy ODR Komisji Europejskiej (ec.europa.eu/consumers/odr) oraz właściwych wojewódzkich inspektoratów Inspekcji Handlowej.</p>

        <h2 className={h2}>§16 Kontakt</h2>
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
