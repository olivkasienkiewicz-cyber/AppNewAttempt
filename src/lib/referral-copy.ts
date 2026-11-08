// Shared constants + bilingual copy for the referral programme.
// Kept separate from translations.ts so the feature stays self-contained.

export const REFERRAL_AMOUNT_PLN = 50;
export const REFERRAL_MIN_DURATION_MINUTES = 60;
export const REFERRAL_REWARD_VALID_DAYS = 90;
export const SITE_URL = 'https://studilly.com';

export function referralLink(code: string): string {
  return `${SITE_URL}/r/${encodeURIComponent(code)}`;
}

export type ReferralLocale = 'en' | 'pl';

export const referralCopy = {
  pl: {
    // Homepage section
    homeEyebrow: 'Program poleceń',
    homeTitle: 'Poleć znajomego — oboje dostajecie 50 zł zniżki',
    homeSubtitle:
      'Uczysz się ze Studilly? Podziel się swoim kodem. Znajomy płaci mniej za pierwsze zajęcia, a Ty dostajesz 50 zł zniżki, gdy tylko odbędzie swoją pierwszą lekcję.',
    homeSteps: [
      { n: '01', title: 'Udostępnij kod', body: 'Każdy uczeń ma swój osobisty kod i link w panelu.' },
      { n: '02', title: 'Znajomy rezerwuje', body: 'Wpisuje kod przy pierwszej rezerwacji i od razu płaci 50 zł mniej.' },
      { n: '03', title: 'Ty też zyskujesz', body: 'Po jego pierwszej lekcji dostajesz kod na 50 zł. Bez limitu znajomych.' },
    ],
    homeCtaSignedIn: 'Pobierz swój kod',
    homeCtaSignedOut: 'Załóż konto i poleć znajomego',
    homeFine: 'Dotyczy zajęć od 60 minut i pakietów. Kod dla znajomego działa przy pierwszej rezerwacji.',

    // Dashboard
    pageEyebrow: 'Polecenia',
    pageTitle: 'Poleć znajomego',
    pageSubtitle: 'Oboje dostajecie 50 zł zniżki. Bez limitu — każdy znajomy to kolejne 50 zł dla Ciebie.',
    yourCode: 'Twój kod',
    copyCode: 'Kopiuj kod',
    copyLink: 'Kopiuj link',
    share: 'Udostępnij',
    copied: 'Skopiowano!',
    shareMessage: (code: string, link: string) =>
      `Hej! Uczę się IB ze Studilly — mają świetnych korepetytorów. Z moim kodem ${code} dostaniesz 50 zł zniżki na pierwsze zajęcia: ${link}`,
    howTitle: 'Jak to działa',
    howSteps: [
      'Wyślij znajomemu swój kod lub link.',
      'Znajomy wpisuje kod przy pierwszej rezerwacji i płaci 50 zł mniej.',
      'Gdy odbędzie pierwszą lekcję, dostajesz kod na 50 zł — pojawi się poniżej i na Twoim mailu.',
    ],
    statsInvited: 'Polecone osoby',
    statsEarned: 'Zarobione',
    friendsTitle: 'Twoi znajomi',
    friendsEmpty: 'Jeszcze nikt nie użył Twojego kodu. Wyślij go pierwszej osobie!',
    statusPending: 'Czeka na pierwszą lekcję',
    statusRewarded: '50 zł dla Ciebie',
    rewardsTitle: 'Twoje nagrody',
    rewardsEmpty: 'Nagrody pojawią się tutaj po pierwszej lekcji poleconego znajomego.',
    rewardUsed: 'Wykorzystany',
    rewardActive: 'Aktywny',
    rewardValid: (d: string) => `ważny do ${d}`,
    rewardHint: 'Wpisz kod przy następnej rezerwacji lub płatności za pakiet.',
    fine: 'Zniżka dotyczy zajęć od 60 minut, pakietów i sprawdzania prac. Kod dla znajomego działa tylko dla nowych uczniów. Nie można użyć własnego kodu.',
    signInTitle: 'Zaloguj się, aby zobaczyć swój kod',
    signIn: 'Zaloguj się',
    back: 'Wróć',
    loadError: 'Nie udało się wczytać programu poleceń. Spróbuj ponownie.',

    // Friend landing (/r/CODE)
    landingEyebrow: 'Zaproszenie',
    landingTitle: (name: string | null) =>
      name ? `${name} zaprasza Cię do Studilly` : 'Zostałeś zaproszony do Studilly',
    landingSubtitle: 'Odbierz 50 zł zniżki na pierwsze zajęcia z korepetytorem IB, Matury lub egzaminu ósmoklasisty.',
    landingCodeLabel: 'Twój kod zniżkowy',
    landingCodeSaved: 'Zapisaliśmy kod — uzupełni się automatycznie przy rezerwacji.',
    landingCta: 'Odbierz 50 zł i zarezerwuj',
    landingCtaSignedIn: 'Zarezerwuj zajęcia',
    landingInvalid: 'Ten kod polecający nie istnieje lub wygasł.',
    landingBrowse: 'Zobacz korepetytorów',
    landingPerks: ['Korepetytorzy z UCL, Toronto, ESADE, KCL', 'IB, Matura, SAT i aplikacje na studia', 'Lekcje online w dogodnych godzinach'],

    // Student dashboard banner
    bannerTitle: 'Poleć znajomego — oboje dostajecie 50 zł',
    bannerCta: 'Twój kod',
    navLabel: 'Poleć znajomego',
    modalPrefilled: 'Kod polecający został uzupełniony automatycznie.',
  },
  en: {
    homeEyebrow: 'Referral programme',
    homeTitle: 'Refer a friend — you both get 50 zł off',
    homeSubtitle:
      "Studying with Studilly? Share your code. Your friend pays less for their first class, and you get 50 zł off as soon as they've had their first lesson.",
    homeSteps: [
      { n: '01', title: 'Share your code', body: 'Every student has a personal code and link in their dashboard.' },
      { n: '02', title: 'Your friend books', body: 'They enter it on their first booking and pay 50 zł less straight away.' },
      { n: '03', title: 'You get rewarded', body: 'After their first lesson you get a 50 zł code. No limit on friends.' },
    ],
    homeCtaSignedIn: 'Get your code',
    homeCtaSignedOut: 'Create an account and refer a friend',
    homeFine: "Valid on sessions of 60 minutes or more and on bundles. Your friend's code works on their first booking.",

    pageEyebrow: 'Referrals',
    pageTitle: 'Refer a friend',
    pageSubtitle: 'You both get 50 zł off. No limit — every friend earns you another 50 zł.',
    yourCode: 'Your code',
    copyCode: 'Copy code',
    copyLink: 'Copy link',
    share: 'Share',
    copied: 'Copied!',
    shareMessage: (code: string, link: string) =>
      `Hey! I'm studying IB with Studilly — their tutors are great. Use my code ${code} for 50 zł off your first class: ${link}`,
    howTitle: 'How it works',
    howSteps: [
      'Send your code or link to a friend.',
      'They enter it on their first booking and pay 50 zł less.',
      "After their first lesson, you get a 50 zł code — it'll appear below and in your inbox.",
    ],
    statsInvited: 'Friends referred',
    statsEarned: 'Earned',
    friendsTitle: 'Your friends',
    friendsEmpty: 'Nobody has used your code yet. Send it to your first friend!',
    statusPending: 'Waiting for first lesson',
    statusRewarded: '50 zł for you',
    rewardsTitle: 'Your rewards',
    rewardsEmpty: "Rewards appear here after a referred friend's first lesson.",
    rewardUsed: 'Used',
    rewardActive: 'Active',
    rewardValid: (d: string) => `valid until ${d}`,
    rewardHint: 'Enter the code on your next booking or bundle payment.',
    fine: "Discount applies to sessions of 60+ minutes, bundles and work checks. Your friend's code is for new students only. You can't use your own code.",
    signInTitle: 'Sign in to see your code',
    signIn: 'Sign in',
    back: 'Back',
    loadError: "Couldn't load the referral programme. Please try again.",

    landingEyebrow: 'Invitation',
    landingTitle: (name: string | null) =>
      name ? `${name} invited you to Studilly` : "You've been invited to Studilly",
    landingSubtitle: 'Claim 50 zł off your first class with an IB, Matura or egzamin ósmoklasisty tutor.',
    landingCodeLabel: 'Your discount code',
    landingCodeSaved: "We've saved the code — it'll fill in automatically when you book.",
    landingCta: 'Claim 50 zł and book',
    landingCtaSignedIn: 'Book a session',
    landingInvalid: "This referral code doesn't exist or has expired.",
    landingBrowse: 'Meet the tutors',
    landingPerks: ['Tutors from UCL, Toronto, ESADE, KCL', 'IB, Matura, SAT and university applications', 'Online lessons at times that suit you'],

    bannerTitle: 'Refer a friend — you both get 50 zł',
    bannerCta: 'Your code',
    navLabel: 'Refer a friend',
    modalPrefilled: 'Referral code filled in automatically.',
  },
};

// Discount error messages for referral-specific failures (used in toasts).
export const REFERRAL_ERROR_MESSAGES: Record<string, string> = {
  own_code: "You can't use your own referral code — booked at full price.",
  not_new_student: 'Referral codes are for new students only — booked at full price.',
};
