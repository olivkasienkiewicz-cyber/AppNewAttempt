export type Translations = {
  nav: {
    home: string;
    about: string;
    tutors: string;
    login: string;
  };
  home: {
    heroTitle: string;
    heroSubtitle: string;
    cta: string;
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
  };
};

export const translations: Record<"en" | "pl", Translations> = {
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
      body: "Studilly is a tutoring platform built to help students reach their academic goals and navigate the entire foreign university application process. At its core, Studilly connects students with top-tier tutoring from graduates and current students of leading global universities, backed by a booking system that actually works. No more waiting weeks to lock in a lesson time or hoping for a reply — with Studilly, booking a class takes seconds.",
      founderHeading: "Meet our founder",
      founderBio: "An IB graduate with hands-on tutoring experience of her own, Olivia studied International Economics and Management at Bocconi University, with an Erasmus exchange at Copenhagen Business School. Her drive and passion for international education is what brought Studilly to life — with one goal in mind: making tutoring simpler, less frustrating, and genuinely built around helping students succeed.",
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
      body: "Studilly to platforma korepetycji stworzona, by pomóc uczniom osiągnąć cele edukacyjne i przejść przez cały proces aplikacji na zagraniczne uczelnie. Studilly łączy uczniów z najlepszymi korepetytorami — absolwentami i studentami czołowych światowych uczelni — dzięki systemowi rezerwacji, który naprawdę działa. Koniec z czekaniem tygodniami na termin lekcji czy liczeniem na odpowiedź — z Studilly zarezerwowanie zajęć zajmuje kilka sekund.",
      founderHeading: "Poznaj naszą założycielkę",
      founderBio: "Olivia, absolwentka IB z własnym doświadczeniem w korepetycjach, studiowała International Economics and Management na Uniwersytecie Bocconiego, z wymianą Erasmus w Copenhagen Business School. To jej zaangażowanie i pasja do edukacji międzynarodowej dały początek Studilly — z jednym celem: uczynić korepetycje prostszymi, mniej frustrującymi i naprawdę nastawionymi na sukces ucznia.",
    },
    tutors: {
      title: "Nasi Korepetytorzy",
      subjectLabel: "Przedmiot",
    },
  },
};

export type Locale = keyof typeof translations;
export type TranslationKeys = Translations;
