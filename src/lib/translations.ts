export type Translations = {
  nav: {
    home: string;
    about: string;
    tutors: string;
    opinions: string;
    login: string;
  };
  home: {
    heroTitle: string;
    heroSubtitle: string;
    cta: string;
    sessionRateLabel: string;
    sessionRateUnit: string;
    sessionRateNote: string;
    howItWorksHeading: string;
    steps: { step: string; title: string; body: string }[];
    subjectsHeading: string;
    subjectsSubheading: string;
    hlSlBadge: string;
    groups: { group: string; label: string }[];
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
};

export const translations: Record<"en" | "pl", Translations> = {
  en: {
    nav: {
      home: "Home",
      about: "About",
      tutors: "Tutors",
      opinions: "Opinions",
      login: "Log in",
    },
    home: {
      heroTitle: "IB tutoring that actually fits your syllabus.",
      heroSubtitle:
        "Book real IB tutors — by subject, by level, by the hour. No packages, no sales calls. Pick a slot, transfer the fee, get your meeting link.",
      cta: "Get started",
      sessionRateLabel: "Session rate",
      sessionRateUnit: "per hour, any subject",
      sessionRateNote: "Confirmed by bank transfer · Meeting link on booking",
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
          body: "Pay 230 PLN by bank transfer. We confirm it manually, fast.",
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
  },
  pl: {
    nav: {
      home: "Strona główna",
      about: "O nas",
      tutors: "Korepetytorzy",
      opinions: "Opinie",
      login: "Zaloguj się",
    },
    home: {
      heroTitle: "Korepetycje IB, które naprawdę pasują do Twojego programu.",
      heroSubtitle:
        "Rezerwuj prawdziwych korepetytorów IB — według przedmiotu, poziomu i godziny. Bez pakietów, bez rozmów sprzedażowych. Wybierz termin, przelej opłatę, otrzymaj link do spotkania.",
      cta: "Zacznij teraz",
      sessionRateLabel: "Stawka za sesję",
      sessionRateUnit: "za godzinę, dowolny przedmiot",
      sessionRateNote: "Potwierdzane przelewem bankowym · Link do spotkania po rezerwacji",
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
          body: "Zapłać 230 PLN przelewem bankowym. Potwierdzamy go ręcznie i szybko.",
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
  },
};

export type Locale = keyof typeof translations;
export type TranslationKeys = Translations;
