export type Translations = {
  nav: {
    home: string;
    about: string;
    tutors: string;
    opinions: string;
    pricing: string;
    workCheck: string;
    login: string;
  };
  home: {
    heroTitle: string;
    heroSubtitle: string;
    additionalServicesNote: string;
    cta: string;
    howItWorksHeading: string;
    steps: { step: string; title: string; body: string }[];
    subjectsHeading: string;
    subjectsSubheading: string;
    hlSlBadge: string;
    groups: { group: string; label: string }[];
    tutorsSectionHeading: string;
    tutorsSectionSubheading: string;
    tutorsSectionCta: string;
    applicationSupportHeading: string;
    applicationSupportSubheading: string;
    applicationServices: { title: string; body: string }[];
    closingHeading: string;
  };
  about: {
    title: string;
    body: string;
    founderHeading: string;
    founderBio: string;
  };
  tutors: {
    title: string;
    subjectLabel: string;
    intro: string;
    comingSoon: string;
  };
  opinions: {
    title: string;
    subtitle: string;
  };
  pricing: {
    title: string;
    subtitle: string;
    tiers: { label: string; price: string; unit: string; note: string }[];
    footnote: string;
    workCheckHeading: string;
    workCheckSubtitle: string;
    workCheckUnit: string;
    workCheckFootnote: string;
    workCheckCta: string;
  };
  workCheck: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cta: string;
    myChecks: string;
    includedHeading: string;
    included: string[];
    howHeading: string;
    steps: { title: string; body: string }[];
    pricesHeading: string;
    from: string;
    optionsHeading: string;
    secondLabel: string;
    secondNote: string;
    integrityHeading: string;
    integrityBody: string;
    orderTitle: string;
    orderSubtitle: string;
    productLabel: string;
    subjectLabel: string;
    subjectPlaceholder: string;
    fileLabel: string;
    fileHint: string;
    fileChange: string;
    noteLabel: string;
    notePlaceholder: string;
    secondOption: string;
    discountLabel: string;
    discountPlaceholder: string;
    totalLabel: string;
    totalFromNote: string;
    integrityConfirm: string;
    submit: string;
    uploading: string;
    submitting: string;
    fileTypeError: string;
    fileSizeError: string;
    uploadError: string;
    subjectRequired: string;
    fileRequired: string;
    genericError: string;
    discountError: string;
    successTitle: string;
    successQuote: string;
    successPay: string;
    paymentHeading: string;
    accountHolderLabel: string;
    referenceLabel: string;
    amountLabel: string;
    referenceHint: string;
    loginRequired: string;
    loginCta: string;
  };
  browse: {
    searchPlaceholder: string;
    subjectLabel: string;
    subjectAll: string;
    levelLabel: string;
    levelAll: string;
    noMatchesTitle: string;
    noMatchesBody: string;
    requestSubjectLink: string;
  };
  subjectRequest: {
    emptyStatePrompt: string;
    modalTitle: string;
    modalIntro: string;
    subjectLabel: string;
    subjectPlaceholder: string;
    levelLabel: string;
    levelPlaceholder: string;
    noteLabel: string;
    notePlaceholder: string;
    submit: string;
    cancel: string;
    successTitle: string;
    successBody: string;
    duplicateError: string;
    genericError: string;
    close: string;
  };
  slotRequest: {
    modalTitle: string;
    modalIntro: string;
    dateLabel: string;
    timeLabel: string;
    timePlaceholder: string;
    noteLabel: string;
    notePlaceholder: string;
    submit: string;
    cancel: string;
    successTitle: string;
    successBody: string;
    genericError: string;
    close: string;
  };
};

export const translations: Record<"en" | "pl", Translations> = {
  en: {
    nav: {
      home: "Home",
      about: "About",
      tutors: "Tutors",
      opinions: "Opinions",
      pricing: "Pricing",
      workCheck: "Work checks",
      login: "Log in",
    },
    home: {
      heroTitle: "IB tutoring that actually fits your syllabus.",
      heroSubtitle:
        "Book real IB tutors — by subject, by level, by the hour. No packages, no sales calls. Pick a slot, transfer the fee, get your meeting link.",
      additionalServicesNote:
        "Also available: egzamin ósmoklasisty and IB school entrance exam prep.",
      cta: "Get started",
      howItWorksHeading: "How it works",
      steps: [
        {
          step: "1",
          title: "Browse",
          body: "Filter tutors by IB subject, HL or SL, and open slots.",
        },
        {
          step: "2",
          title: "Book",
          body: "Reserve a time. It's held for you while payment is confirmed.",
        },
        {
          step: "3",
          title: "Bank transfer",
          body: "Pay by bank transfer. We confirm it manually, fast.",
        },
        {
          step: "4",
          title: "Meeting link",
          body: "Once confirmed, your tutor's meeting link lands in your inbox.",
        },
      ],
      subjectsHeading: "Every IB group, both levels",
      subjectsSubheading: "HL and SL, across all six subject groups.",
      hlSlBadge: "HL · SL",
      groups: [
        { group: "Group 1", label: "Studies in Language & Literature" },
        { group: "Group 2", label: "Language Acquisition" },
        { group: "Group 3", label: "Individuals & Societies" },
        { group: "Group 4", label: "Sciences" },
        { group: "Group 5", label: "Mathematics" },
        { group: "Group 6", label: "The Arts" },
      ],
      tutorsSectionHeading: "Meet our tutors",
      tutorsSectionSubheading:
        "Our tutors come from Bocconi, ESADE, the University of Amsterdam, UCL, the University of Toronto, and many more.",
      tutorsSectionCta: "See all tutors",
      applicationSupportHeading: "Foreign university application support",
      applicationSupportSubheading:
        "Beyond the IB — help with everything it takes to get in.",
      applicationServices: [
        {
          title: "Exam prep",
          body: "Structured prep for SAT, ACT, and other entrance exams, tailored to your target universities.",
        },
        {
          title: "Personal statement writing",
          body: "One-on-one guidance to draft, refine, and polish a personal statement that actually sounds like you.",
        },
        {
          title: "University & course choice",
          body: "Advice on shortlisting universities and courses that fit your grades, budget, and goals.",
        },
        {
          title: "Ongoing application support",
          body: "From deadlines to documents, get support through the entire application process, start to finish.",
        },
      ],
      closingHeading: "Your next session is a few taps away.",
    },
    about: {
      title: "About Studilly",
      body: "Studilly is a tutoring platform built to help students reach their academic goals and navigate the entire foreign university application process. At its core, Studilly connects students with top-tier tutoring from graduates and current students of leading global universities, backed by a booking system that actually works. No more waiting weeks to lock in a lesson time or hoping for a reply — with Studilly, booking a class takes seconds.",
      founderHeading: "Meet our founder",
      founderBio: "An IB graduate with hands-on tutoring experience of her own, Olivia studied International Economics and Management at Bocconi University, with an Erasmus exchange at Copenhagen Business School. Her drive and passion for international education is what brought Studilly to life — with one goal in mind: making tutoring simpler, less frustrating, and genuinely built around helping students succeed.",
    },
    tutors: {
      title: "Our Tutors",
      subjectLabel: "Subject",
      intro: "Every tutor on Studilly has been through the IB themselves.",
      comingSoon: "Tutor profiles are coming soon.",
    },
    opinions: {
      title: "What students say",
      subtitle: "Real feedback from students we've tutored through their IB.",
    },
    pricing: {
      title: "Simple, transparent pricing",
      subtitle: "One flat rate per session type — no packages, no hidden fees.",
      tiers: [
        {
          label: "IB subjects",
          price: "230 PLN",
          unit: "per hour",
          note: "All six subject groups, HL & SL",
        },
        {
          label: "IB school entrance exams",
          price: "160 PLN",
          unit: "per hour",
          note: "Prep for admission into IB programmes",
        },
        {
          label: "Egzamin ósmoklasisty",
          price: "120 PLN",
          unit: "per hour",
          note: "Polish 8th-grade exam preparation",
        },
        {
          label: "Polska Matura – poziom podstawowy",
          price: "160 PLN",
          unit: "per hour",
          note: "Standard-level Polish Matura exam preparation",
        },
        {
          label: "Polska Matura – poziom rozszerzony",
          price: "180 PLN",
          unit: "per hour",
          note: "Extended-level Polish Matura exam preparation",
        },
        {
          label: "SAT Preparation",
          price: "250 PLN",
          unit: "per hour",
          note: "Structured prep for the SAT exam",
        },
        {
          label: "University Application Support",
          price: "300 PLN",
          unit: "per hour",
          note: "Personal statements, university choice, and application guidance",
        },
        {
          label: "Language Classes",
          price: "180 PLN",
          unit: "per hour",
          note: "French, English, or German language lessons",
        },
      ],
      footnote: "Confirmed by bank transfer · Meeting link on booking",
      workCheckHeading: "Written Work Check",
      workCheckSubtitle:
        "Written feedback on your draft against the IB criteria, with an estimated mark band. One flat price per piece of work.",
      workCheckUnit: "per check",
      workCheckFootnote: "Feedback within 5 working days · Second check of the same work: 60% of the price",
      workCheckCta: "Learn more and order",
    },
    workCheck: {
      eyebrow: "Written Work Check",
      title: "Expert feedback on your IB draft — before it counts.",
      subtitle:
        "Send us your TOK essay, exhibition, IA or Extended Essay. A tutor who has been through the IB marks it against the official criteria and tells you exactly what to improve.",
      cta: "Order a check",
      myChecks: "My checks",
      includedHeading: "Every check includes",
      included: [
        "Comments directly on your draft",
        "A summary against each IB assessment criterion",
        "An estimated mark band",
        "Feedback within 5 working days",
      ],
      howHeading: "How it works",
      steps: [
        { title: "Upload your draft", body: "PDF or Word file, plus anything the reviewer should know." },
        { title: "Pay by bank transfer", body: "You get the transfer details and a reference code straight away." },
        { title: "A tutor reviews it", body: "We match your work with a tutor who knows the subject." },
        { title: "Get your feedback", body: "Download the commented draft and summary from your account." },
      ],
      pricesHeading: "Prices",
      from: "from",
      optionsHeading: "Options",
      secondLabel: "Second check of the same work",
      secondNote: "60% of the price",
      integrityHeading: "Feedback, not ghostwriting",
      integrityBody:
        "To protect you under the IB academic integrity rules, our tutors only comment and assess — they never rewrite or edit your text. All changes to the work are yours.",
      orderTitle: "Order a Written Work Check",
      orderSubtitle: "Upload your draft and we'll take it from there.",
      productLabel: "What should we check?",
      subjectLabel: "Subject",
      subjectPlaceholder: "e.g. History HL",
      fileLabel: "Your draft",
      fileHint: "PDF, DOC, DOCX or ODT, up to 20 MB",
      fileChange: "Change file",
      noteLabel: "Anything the reviewer should know? (optional)",
      notePlaceholder: "e.g. My research question, the criteria I'm unsure about, my deadline",
      secondOption: "This is a second check of work Studilly already reviewed (−40%)",
      discountLabel: "Discount code (optional)",
      discountPlaceholder: "e.g. HOFFMUN10",
      totalLabel: "Total",
      totalFromNote: "Starting price — we'll confirm the final price within 1 working day, before you pay.",
      integrityConfirm:
        "I understand the reviewer gives feedback only and will not write or edit my work.",
      submit: "Place order",
      uploading: "Uploading draft…",
      submitting: "Placing order…",
      fileTypeError: "Please upload a PDF, DOC, DOCX or ODT file.",
      fileSizeError: "That file is larger than 20 MB.",
      uploadError: "We couldn't upload your file. Please try again.",
      subjectRequired: "Please enter the subject.",
      fileRequired: "Please add your draft.",
      genericError: "Something went wrong. Please try again.",
      discountError: "The discount code couldn't be applied, so the full price is shown.",
      successTitle: "Order placed",
      successQuote:
        "Thanks! We'll confirm the final price within 1 working day and email you the payment details.",
      successPay:
        "Thanks! Transfer the amount below — your work goes to a reviewer as soon as the payment is confirmed.",
      paymentHeading: "Payment by bank transfer",
      accountHolderLabel: "Account holder",
      referenceLabel: "Reference",
      amountLabel: "Amount",
      referenceHint: "Use the reference code exactly as shown so we can match your transfer.",
      loginRequired: "Log in or create a free account to order a check.",
      loginCta: "Log in",
    },
    browse: {
      searchPlaceholder: "Search by tutor name",
      subjectLabel: "Subject",
      subjectAll: "All subjects",
      levelLabel: "Level",
      levelAll: "All levels",
      noMatchesTitle: "No tutors match your filters",
      noMatchesBody: "Try a different search, subject, or level.",
      requestSubjectLink: "Can't find your subject? Request it",
    },
    subjectRequest: {
      emptyStatePrompt: "Can't find your subject? Let us know and we'll find a tutor.",
      modalTitle: "Request a subject",
      modalIntro: "Tell us what you're looking for and we'll reach out to tutors who can teach it.",
      subjectLabel: "Subject",
      subjectPlaceholder: "e.g. Psychology",
      levelLabel: "Level (optional)",
      levelPlaceholder: "Select a level",
      noteLabel: "Anything else? (optional)",
      notePlaceholder: "e.g. Looking for someone experienced with the IA",
      submit: "Send request",
      cancel: "Cancel",
      successTitle: "Request sent",
      successBody: "Thanks — we'll be in touch once we've found a tutor for this subject.",
      duplicateError: "You've already requested this subject. We'll be in touch once we've found a tutor.",
      genericError: "Something went wrong. Please try again.",
      close: "Close",
    },
    slotRequest: {
      modalTitle: "Request a time slot",
      modalIntro: "Don't see a time that works? Ask your tutor to add one.",
      dateLabel: "Date",
      timeLabel: "Time",
      timePlaceholder: "Pick a time",
      noteLabel: "Note (optional)",
      notePlaceholder: "Anything the tutor should know",
      submit: "Send request",
      cancel: "Cancel",
      successTitle: "Request sent",
      successBody: "We've let the tutor know — they'll add the slot if it works for them.",
      genericError: "Something went wrong. Please try again.",
      close: "Close",
    },
  },
  pl: {
    nav: {
      home: "Strona główna",
      about: "O nas",
      tutors: "Korepetytorzy",
      opinions: "Opinie",
      pricing: "Cennik",
      workCheck: "Sprawdzanie prac",
      login: "Zaloguj się",
    },
    home: {
      heroTitle: "Korepetycje IB, które naprawdę pasują do Twojego programu.",
      heroSubtitle:
        "Rezerwuj prawdziwych korepetytorów IB — według przedmiotu, poziomu i godziny. Bez pakietów, bez rozmów sprzedażowych. Wybierz termin, przelej opłatę, otrzymaj link do spotkania.",
      additionalServicesNote:
        "Dostępne również: przygotowanie do egzaminu ósmoklasisty oraz egzaminów wstępnych do szkół IB.",
      cta: "Zacznij teraz",
      howItWorksHeading: "Jak to działa",
      steps: [
        {
          step: "1",
          title: "Przeglądaj",
          body: "Filtruj korepetytorów według przedmiotu IB, poziomu HL lub SL i dostępnych terminów.",
        },
        {
          step: "2",
          title: "Zarezerwuj",
          body: "Zarezerwuj termin. Jest dla Ciebie zablokowany do czasu potwierdzenia płatności.",
        },
        {
          step: "3",
          title: "Przelew bankowy",
          body: "Zapłać przelewem bankowym. Potwierdzamy go ręcznie i szybko.",
        },
        {
          step: "4",
          title: "Link do spotkania",
          body: "Po potwierdzeniu link do spotkania z korepetytorem trafia na Twoją skrzynkę.",
        },
      ],
      subjectsHeading: "Każda grupa IB, oba poziomy",
      subjectsSubheading: "HL i SL, we wszystkich sześciu grupach przedmiotowych.",
      hlSlBadge: "HL · SL",
      groups: [
        { group: "Grupa 1", label: "Studia języka i literatury" },
        { group: "Grupa 2", label: "Nauka języków obcych" },
        { group: "Grupa 3", label: "Jednostka i społeczeństwo" },
        { group: "Grupa 4", label: "Nauki ścisłe i przyrodnicze" },
        { group: "Grupa 5", label: "Matematyka" },
        { group: "Grupa 6", label: "Sztuka" },
      ],
      tutorsSectionHeading: "Poznaj naszych korepetytorów",
      tutorsSectionSubheading:
        "Nasi korepetytorzy pochodzą z Bocconi, ESADE, Uniwersytetu w Amsterdamie, UCL, Uniwersytetu w Toronto i wielu innych.",
      tutorsSectionCta: "Zobacz wszystkich korepetytorów",
      applicationSupportHeading: "Wsparcie w aplikacji na zagraniczne uczelnie",
      applicationSupportSubheading:
        "Poza IB — pomoc we wszystkim, czego potrzebujesz, by dostać się na wymarzoną uczelnię.",
      applicationServices: [
        {
          title: "Przygotowanie do egzaminów",
          body: "Uporządkowane przygotowanie do SAT, ACT i innych egzaminów wstępnych, dopasowane do wybranych uczelni.",
        },
        {
          title: "Pisanie listu motywacyjnego",
          body: "Indywidualne wsparcie w napisaniu i dopracowaniu listu motywacyjnego, który naprawdę brzmi jak Ty.",
        },
        {
          title: "Wybór uczelni i kierunku",
          body: "Doradztwo w wyborze uczelni i kierunków dopasowanych do Twoich ocen, budżetu i celów.",
        },
        {
          title: "Wsparcie w całym procesie aplikacji",
          body: "Od terminów po dokumenty — wsparcie na każdym etapie procesu aplikacyjnego, od początku do końca.",
        },
      ],
      closingHeading: "Twoja kolejna sesja jest o kilka kliknięć.",
    },
    about: {
      title: "O Studilly",
      body: "Studilly to platforma korepetycji stworzona, by pomóc uczniom osiągnąć cele edukacyjne i przejść przez cały proces aplikacji na zagraniczne uczelnie. Studilly łączy uczniów z najlepszymi korepetytorami — absolwentami i studentami czołowych światowych uczelni — dzięki systemowi rezerwacji, który naprawdę działa. Koniec z czekaniem tygodniami na termin lekcji czy liczeniem na odpowiedź — z Studilly zarezerwowanie zajęć zajmuje kilka sekund.",
      founderHeading: "Poznaj naszą założycielkę",
      founderBio: "Olivia, absolwentka IB z własnym doświadczeniem w korepetycjach, studiowała International Economics and Management na Uniwersytecie Bocconiego, z wymianą Erasmus w Copenhagen Business School. To jej zaangażowanie i pasja do edukacji międzynarodowej dały początek Studilly — z jednym celem: uczynić korepetycje prostszymi, mniej frustrującymi i naprawdę nastawionymi na sukces ucznia.",
    },
    tutors: {
      title: "Nasi Korepetytorzy",
      subjectLabel: "Przedmiot",
      intro: "Każdy korepetytor w Studilly sam przeszedł przez IB.",
      comingSoon: "Profile korepetytorów pojawią się wkrótce.",
    },
    opinions: {
      title: "Co mówią uczniowie",
      subtitle: "Prawdziwe opinie uczniów, których przygotowaliśmy do matury IB.",
    },
    pricing: {
      title: "Proste, przejrzyste ceny",
      subtitle: "Jedna stała stawka za typ zajęć — bez pakietów, bez ukrytych opłat.",
      tiers: [
        {
          label: "Przedmioty IB",
          price: "230 PLN",
          unit: "za godzinę",
          note: "Wszystkie sześć grup przedmiotowych, HL i SL",
        },
        {
          label: "Egzaminy wstępne do szkół IB",
          price: "160 PLN",
          unit: "za godzinę",
          note: "Przygotowanie do rekrutacji do programu IB",
        },
        {
          label: "Egzamin ósmoklasisty",
          price: "120 PLN",
          unit: "za godzinę",
          note: "Przygotowanie do egzaminu ósmoklasisty",
        },
        {
          label: "Polska Matura – poziom podstawowy",
          price: "160 PLN",
          unit: "za godzinę",
          note: "Przygotowanie do matury na poziomie podstawowym",
        },
        {
          label: "Polska Matura – poziom rozszerzony",
          price: "180 PLN",
          unit: "za godzinę",
          note: "Przygotowanie do matury na poziomie rozszerzonym",
        },
        {
          label: "Przygotowanie do SAT",
          price: "250 PLN",
          unit: "za godzinę",
          note: "Uporządkowane przygotowanie do egzaminu SAT",
        },
        {
          label: "Wsparcie w aplikacji na uczelnię",
          price: "300 PLN",
          unit: "za godzinę",
          note: "Listy motywacyjne, wybór uczelni i wsparcie w procesie aplikacyjnym",
        },
        {
          label: "Zajęcia językowe",
          price: "180 PLN",
          unit: "za godzinę",
          note: "Lekcje francuskiego, angielskiego lub niemieckiego",
        },
      ],
      footnote: "Potwierdzane przelewem bankowym · Link do spotkania po rezerwacji",
      workCheckHeading: "Sprawdzanie prac pisemnych",
      workCheckSubtitle:
        "Pisemna informacja zwrotna do Twojej pracy według kryteriów IB, z szacowanym przedziałem punktowym. Jedna stała cena za pracę.",
      workCheckUnit: "za sprawdzenie",
      workCheckFootnote: "Informacja zwrotna w ciągu 5 dni roboczych · Ponowne sprawdzenie tej samej pracy: 60% ceny",
      workCheckCta: "Dowiedz się więcej i zamów",
    },
    workCheck: {
      eyebrow: "Sprawdzanie prac pisemnych",
      title: "Ekspercka informacja zwrotna do Twojej pracy IB — zanim będzie się liczyć.",
      subtitle:
        "Prześlij nam esej TOK, exhibition, IA lub Extended Essay. Korepetytor, który sam przeszedł przez IB, oceni pracę według oficjalnych kryteriów i wskaże, co dokładnie poprawić.",
      cta: "Zamów sprawdzenie",
      myChecks: "Moje sprawdzenia",
      includedHeading: "Każde sprawdzenie obejmuje",
      included: [
        "Komentarze bezpośrednio w Twojej pracy",
        "Podsumowanie według każdego kryterium oceny IB",
        "Szacowany przedział punktowy",
        "Informację zwrotną w ciągu 5 dni roboczych",
      ],
      howHeading: "Jak to działa",
      steps: [
        { title: "Prześlij pracę", body: "Plik PDF lub Word oraz wszystko, co sprawdzający powinien wiedzieć." },
        { title: "Zapłać przelewem", body: "Od razu otrzymasz dane do przelewu i kod referencyjny." },
        { title: "Korepetytor sprawdza", body: "Przydzielamy pracę korepetytorowi, który zna dany przedmiot." },
        { title: "Odbierz feedback", body: "Pobierz skomentowaną pracę i podsumowanie ze swojego konta." },
      ],
      pricesHeading: "Cennik",
      from: "od",
      optionsHeading: "Opcje",
      secondLabel: "Ponowne sprawdzenie tej samej pracy",
      secondNote: "60% ceny",
      integrityHeading: "Informacja zwrotna, nie pisanie za Ciebie",
      integrityBody:
        "Dla Twojego bezpieczeństwa w świetle zasad uczciwości akademickiej IB nasi korepetytorzy wyłącznie komentują i oceniają — nigdy nie przepisują ani nie redagują Twojego tekstu. Wszystkie zmiany w pracy wprowadzasz samodzielnie.",
      orderTitle: "Zamów sprawdzenie pracy",
      orderSubtitle: "Prześlij swoją pracę, a resztą zajmiemy się my.",
      productLabel: "Co mamy sprawdzić?",
      subjectLabel: "Przedmiot",
      subjectPlaceholder: "np. History HL",
      fileLabel: "Twoja praca",
      fileHint: "PDF, DOC, DOCX lub ODT, do 20 MB",
      fileChange: "Zmień plik",
      noteLabel: "Coś, o czym sprawdzający powinien wiedzieć? (opcjonalnie)",
      notePlaceholder: "np. pytanie badawcze, kryteria, których nie jesteś pewien/pewna, termin oddania",
      secondOption: "To ponowne sprawdzenie pracy, którą Studilly już sprawdzało (−40%)",
      discountLabel: "Kod rabatowy (opcjonalnie)",
      discountPlaceholder: "np. HOFFMUN10",
      totalLabel: "Razem",
      totalFromNote: "Cena początkowa — ostateczną cenę potwierdzimy w ciągu 1 dnia roboczego, przed płatnością.",
      integrityConfirm:
        "Rozumiem, że sprawdzający przekazuje wyłącznie informację zwrotną i nie pisze ani nie redaguje mojej pracy.",
      submit: "Złóż zamówienie",
      uploading: "Przesyłanie pracy…",
      submitting: "Składanie zamówienia…",
      fileTypeError: "Prześlij plik PDF, DOC, DOCX lub ODT.",
      fileSizeError: "Plik jest większy niż 20 MB.",
      uploadError: "Nie udało się przesłać pliku. Spróbuj ponownie.",
      subjectRequired: "Podaj przedmiot.",
      fileRequired: "Dodaj swoją pracę.",
      genericError: "Coś poszło nie tak. Spróbuj ponownie.",
      discountError: "Nie udało się zastosować kodu rabatowego — widoczna jest pełna cena.",
      successTitle: "Zamówienie złożone",
      successQuote:
        "Dziękujemy! Potwierdzimy ostateczną cenę w ciągu 1 dnia roboczego i wyślemy e-mailem dane do przelewu.",
      successPay:
        "Dziękujemy! Przelej poniższą kwotę — praca trafi do sprawdzającego, gdy tylko potwierdzimy płatność.",
      paymentHeading: "Płatność przelewem",
      accountHolderLabel: "Odbiorca",
      referenceLabel: "Tytuł przelewu",
      amountLabel: "Kwota",
      referenceHint: "Wpisz kod w tytule przelewu dokładnie tak, jak jest podany, abyśmy mogli przypisać płatność.",
      loginRequired: "Zaloguj się lub załóż bezpłatne konto, aby zamówić sprawdzenie.",
      loginCta: "Zaloguj się",
    },
    browse: {
      searchPlaceholder: "Szukaj po imieniu i nazwisku",
      subjectLabel: "Przedmiot",
      subjectAll: "Wszystkie przedmioty",
      levelLabel: "Poziom",
      levelAll: "Wszystkie poziomy",
      noMatchesTitle: "Brak korepetytorów pasujących do filtrów",
      noMatchesBody: "Spróbuj zmienić wyszukiwanie, przedmiot lub poziom.",
      requestSubjectLink: "Nie widzisz swojego przedmiotu? Zgłoś go",
    },
    subjectRequest: {
      emptyStatePrompt: "Nie widzisz swojego przedmiotu? Daj nam znać, a znajdziemy korepetytora.",
      modalTitle: "Zgłoś przedmiot",
      modalIntro: "Powiedz nam, czego szukasz, a skontaktujemy się z korepetytorami, którzy mogą tego uczyć.",
      subjectLabel: "Przedmiot",
      subjectPlaceholder: "np. Psychologia",
      levelLabel: "Poziom (opcjonalnie)",
      levelPlaceholder: "Wybierz poziom",
      noteLabel: "Coś jeszcze? (opcjonalnie)",
      notePlaceholder: "np. Szukam osoby z doświadczeniem w IA",
      submit: "Wyślij zgłoszenie",
      cancel: "Anuluj",
      successTitle: "Zgłoszenie wysłane",
      successBody: "Dziękujemy — odezwiemy się, gdy znajdziemy korepetytora do tego przedmiotu.",
      duplicateError: "Już zgłosiłaś/eś ten przedmiot. Odezwiemy się, gdy znajdziemy korepetytora.",
      genericError: "Coś poszło nie tak. Spróbuj ponownie.",
      close: "Zamknij",
    },
    slotRequest: {
      modalTitle: "Poproś o termin",
      modalIntro: "Nie widzisz dogodnego terminu? Poproś korepetytora, żeby go dodał.",
      dateLabel: "Data",
      timeLabel: "Godzina",
      timePlaceholder: "Wybierz godzinę",
      noteLabel: "Notatka (opcjonalnie)",
      notePlaceholder: "Coś, o czym korepetytor powinien wiedzieć",
      submit: "Wyślij prośbę",
      cancel: "Anuluj",
      successTitle: "Prośba wysłana",
      successBody: "Poinformowaliśmy korepetytora — doda termin, jeśli będzie mu pasował.",
      genericError: "Coś poszło nie tak. Spróbuj ponownie.",
      close: "Zamknij",
    },
  },
};

export type Locale = keyof typeof translations;
export type TranslationKeys = Translations;
