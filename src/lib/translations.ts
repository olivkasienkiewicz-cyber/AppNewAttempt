export const translations = {
  en: {
    nav: {
      home: "Home",
      about: "About",
      tutors: "Tutors",
      login: "Log in",
    },
    home: {
      heroTitle: "IB tutoring that actually works",
      heroSubtitle: "Connect with expert IB tutors",
      cta: "Find a tutor",
    },
    about: {
      title: "About Studilly",
      body: "We connect IB students with expert tutors...",
    },
    tutors: {
      title: "Our Tutors",
      subjectLabel: "Subject",
    },
  },
  pl: {
    nav: {
      home: "Strona główna",
      about: "O nas",
      tutors: "Korepetytorzy",
      login: "Zaloguj się",
    },
    home: {
      heroTitle: "Korepetycje IB, które naprawdę działają",
      heroSubtitle: "Połącz się z doświadczonymi korepetytorami IB",
      cta: "Znajdź korepetytora",
    },
    about: {
      title: "O Studilly",
      body: "Łączymy uczniów IB z doświadczonymi korepetytorami...",
    },
    tutors: {
      title: "Nasi Korepetytorzy",
      subjectLabel: "Przedmiot",
    },
  },
} as const;

export type Locale = keyof typeof translations;
export type TranslationKeys = typeof translations.en;
