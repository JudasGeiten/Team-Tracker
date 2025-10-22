import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: { translation: {
  appTitle: 'TeamTally',
    nav: { dashboard: 'Dashboard', players: 'Players', teams: 'Teams', reports: 'Reports' },
    dashboard: {
      importTitle: 'Import from Spond',
      instructionsTitle: 'Instructions',
      instructions: {
        step1: 'Go to the group page in Spond.',
        step2: 'Click the three dots (…) menu on the right.',
        step3: 'Select "Last ned oppmøtehistorikk" (download attendance history).',
        step4: 'Choose which events to include and download the Excel file.',
        step5: 'Upload the file here. The app detects trainings (name contains "trening") and matches (name contains "kamp", "match" or "game").',
        step6: 'Unclear events must be confirmed or can be discarded.'
      },
      summaryTitle: 'Import Summary',
      players: 'Players', events: 'Events', matches: 'Matches', trainings: 'Trainings', firstEventDate: 'First Event Date', lastEventDate: 'Most Recent Event Date',
      confirmTypes: 'Confirm event types', training: 'Training', match: 'Match', discard: 'Discard',
      clarifyModal: {
        title: 'Classify Imported Events',
        intro: 'Select which identified team names should mark an event as a match. All names containing "trening" are already training. You can also discard events you do not want.',
        detectedTeams: 'Detected team tokens',
        teamMatchHint: 'Check teams that represent match participants',
        chooseType: 'Choose type',
        markMatch: 'Mark as Match',
        markTraining: 'Mark as Training',
        markDiscard: 'Discard',
        applySelections: 'Apply Selections',
        cancel: 'Cancel'
      },
      columns: { trainings: 'Trainings', matches: 'Matches', discarded: 'Discarded' },
      modeLabel: 'Mode', mode: { season: 'Season', match: 'Match' }, modeHelp: { season: 'Import full season attendance sheet.', match: 'Import single match availability sheet.' },
      summaryTitleMatch: 'Match Summary',
  matchImport: {
      metaName: 'Event', metaDate: 'Date/Time', metaLocation: 'Location', totalPlayers: 'Players', attending: 'Attending', declined: 'Declined',
      columns: { attending: 'Attending', declined: 'Declined' }
    }
    },
    playersPage: {
      searchPlaceholder: 'Search players',
      manageGroups: 'Manage Groups',
      matchModeTitle: 'Match Players',
      matchModeSubtitle: 'Attendance metrics hidden in match mode. Showing players, status and group assignment only.',
  matchShowDeclinedLabel: 'Show declined players',
      filterAll: 'All',
      table: { name: 'Name', group: 'Group', invited: 'Invited', attended: 'Attended', absent: 'Absent', attendancePct: 'Attendance %', actions: 'Actions', trainingsGroup: 'Trainings', matchesGroup: 'Matches' },
      details: 'Details', removeConfirm: 'Remove player {{name}}? This cannot be undone.',
      groupsDialog: { title: 'Groups', newGroup: 'New group', renameGroup: 'Rename group', add: 'Add', save: 'Save', cancel: 'Cancel', noneYet: 'No groups yet.' },
      playerDetails: {
        title: 'Player Details', summary: 'Summary', invited: 'Invited', attended: 'Attended', absent: 'Absent', attendance: 'Attendance', trainingsAttended: 'Trainings Attended', matchesAttended: 'Matches Attended', trainingsAbsent: 'Trainings Absent', matchesAbsent: 'Matches Absent', noTrainings: 'No trainings attended', noMatches: 'No matches attended', noTrainingsAbsent: 'No trainings missed', noMatchesAbsent: 'No matches missed', filterAll: 'All', filterAttended: 'Attended', filterAbsent: 'Absent', close: 'Close'
      },
      noPlayers: 'No players',
      matchStatus: { attending: 'Attending', declined: 'Declined' }
    },
    teamsPage: {
      generationTitle: 'Team Generation', targets: 'Targets', teamSize: 'Team Size', teamCount: 'Team Count', capacityHint: 'Capacity = size * count. Overflow players go to the wait list.', weightingLabel: 'Fairness weighting (prioritize lower attendance)', generateBtn: 'Generate Teams', regenerate: 'Regenerate', regenerateAgain: 'Regenerate Again', confirmTitle: 'Regenerate Teams?', confirmBody: 'This will discard the current team arrangement and generate new teams. Continue?', confirmCancel: 'Cancel', confirmOk: 'Regenerate', eligible: 'Eligible players', generatedTitle: 'Generated Teams', waitList: 'Wait List'
    },
    reportsPage: { placeholder: 'Reports & PDF export UI to be implemented.',
      matchesPerWeekTitle: 'Matches per week per player',
      matchesPerWeekSubtitle: 'Bar color: green ≥ 1 match/week, orange < 1 match/week. Reference line at 1.',
      matchesLabel: 'Matches',
      weeksLabel: 'Weeks',
      rateLabel: 'Matches/week',
      // New median-based charts
      matchesMedianTitle: 'Match rate deviation (per week)',
  matchesMedianSubtitle: 'Deviation from median ({{median}}). Labels show difference from median.',
      medianLabel: 'Median',
      trainingAttendanceTitle: 'Training attendance % deviation',
  trainingAttendanceSubtitle: 'Deviation from median attendance % ({{median}}). Labels show difference.',
      attendedLabel: 'Attended trainings',
      attendancePctLabel: 'Attendance %'
      , unit: { week: 'Per week', month: 'Per month', sixMonths: 'Per 6 months', year: 'Per year' }
      , rateUnitLabel: { week: 'Matches per week', month: 'Matches per month', sixMonths: 'Matches per 6 months', year: 'Matches per year' }
      , rateLabelUnit: { week: 'Matches/week', month: 'Matches/month', sixMonths: 'Matches/6mo', year: 'Matches/year' }
      , rangeSpanLabel: 'Span: {{weeks}} weeks'
      , matchModeWarning: 'Reports are only available in Season mode. Switch to Season import to view charts.'
      , toggle: { matches: 'Matches', trainings: 'Trainings' }
      , searchPlayersPlaceholder: 'Search player'
      , viewScope: { top: 'Top {{count}}', bottom: 'Bottom {{count}}', all: 'All' }
      , filteredLabel: 'Filtered: {{count}}'
    }
  }},
  no: { translation: {
  appTitle: 'TeamTally',
    nav: { dashboard: 'Oversikt', players: 'Spillere', teams: 'Lag', reports: 'Rapporter' },
    dashboard: {
      importTitle: 'Import fra Spond',
      instructionsTitle: 'Instruksjoner',
      instructions: {
        step1: 'Gå til gruppesiden i Spond.',
        step2: 'Trykk på menyknappen med tre prikker (… ) til høyre.',
        step3: 'Velg "Last ned oppmøtehistorikk".',
        step4: 'Velg hvilke arrangementer du vil ha med og last ned Excel-filen.',
        step5: 'Last opp filen her. Appen gjenkjenner treninger (navn inneholder "trening") og kamper/matcher (navn inneholder "kamp", "match" eller "game").',
        step6: 'Uklare arrangementer må bekreftes eller kan forkastes.'
      },
      summaryTitle: 'Importoppsummering',
      players: 'Spillere', events: 'Arrangementer', matches: 'Kamper', trainings: 'Treninger', firstEventDate: 'Første dato', lastEventDate: 'Siste dato',
      confirmTypes: 'Bekreft typer', training: 'Trening', match: 'Kamp', discard: 'Forkast',
      clarifyModal: {
        title: 'Klassifiser importerte arrangementer',
        intro: 'Velg hvilke identifiserte lagnavn som skal gjøre et arrangement til kamp. Alle navn som inneholder "trening" er allerede trening. Du kan også forkaste arrangementer du ikke ønsker.',
        detectedTeams: 'Oppdagede lag',
        teamMatchHint: 'Huk av lag som deltar i kamper',
        chooseType: 'Velg type',
        markMatch: 'Sett som kamp',
        markTraining: 'Sett som trening',
        markDiscard: 'Forkast',
        applySelections: 'Bruk valg',
        cancel: 'Avbryt'
      },
      columns: { trainings: 'Treninger', matches: 'Kamper', discarded: 'Forkastet' },
      modeLabel: 'Modus', mode: { season: 'Sesong', match: 'Kamp' }, modeHelp: { season: 'Importer sesong-oppmøtedata.', match: 'Importer tilgjengelighet for enkel kamp.' },
      summaryTitleMatch: 'Kampoppsummering',
  matchImport: {
      metaName: 'Arrangement', metaDate: 'Dato/Tid', metaLocation: 'Sted', totalPlayers: 'Spillere', attending: 'Kommer', declined: 'Kan ikke komme',
      columns: { attending: 'Kommer', declined: 'Kan ikke komme' }
    }
    },
    playersPage: {
      searchPlaceholder: 'Søk spillere',
      manageGroups: 'Administrer grupper',
      matchModeTitle: 'Kampliste',
      matchModeSubtitle: 'Oppmøtestatistikk skjules i kampmodus. Viser kun spillere, status og gruppe.',
  matchShowDeclinedLabel: 'Vis spillere som ikke kan',
      filterAll: 'Alle',
      table: { name: 'Navn', group: 'Gruppe', invited: 'Invitert', attended: 'Møtt', absent: 'Fravær', attendancePct: 'Oppmøte %', actions: 'Handlinger', trainingsGroup: 'Treninger', matchesGroup: 'Kamper' },
      details: 'Detaljer', removeConfirm: 'Fjern spiller {{name}}? Dette kan ikke angres.',
      groupsDialog: { title: 'Grupper', newGroup: 'Ny gruppe', renameGroup: 'Endre navn', add: 'Legg til', save: 'Lagre', cancel: 'Avbryt', noneYet: 'Ingen grupper ennå.' },
      playerDetails: {
        title: 'Spillerdetaljer', summary: 'Oppsummering', invited: 'Invitert', attended: 'Møtt', absent: 'Fravær', attendance: 'Oppmøte', trainingsAttended: 'Treninger', matchesAttended: 'Kamper', trainingsAbsent: 'Treninger (fravær)', matchesAbsent: 'Kamper (fravær)', noTrainings: 'Ingen treninger', noMatches: 'Ingen kamper', noTrainingsAbsent: 'Ingen treninger fravær', noMatchesAbsent: 'Ingen kamper fravær', filterAll: 'Alle', filterAttended: 'Møtt', filterAbsent: 'Fravær', close: 'Lukk'
      },
      noPlayers: 'Ingen spillere',
      matchStatus: { attending: 'Kommer', declined: 'Kan ikke komme' }
    },
    teamsPage: {
      generationTitle: 'Lag', targets: 'Mål', teamSize: 'Lagstørrelse', teamCount: 'Antall lag', capacityHint: 'Kapasitet = størrelse * antall. Overskudd havner på venteliste.', weightingLabel: 'Rettferdighetsvekting (prioriter lavt oppmøte)', generateBtn: 'Generer lag', regenerate: 'Generer på nytt', regenerateAgain: 'Generer på nytt', confirmTitle: 'Generer på nytt?', confirmBody: 'Dette vil forkaste nåværende laginndeling og generere nye lag. Fortsette?', confirmCancel: 'Avbryt', confirmOk: 'Generer', eligible: 'Spillere tilgjengelig', generatedTitle: 'Genererte lag', waitList: 'Venteliste'
    },
    reportsPage: { placeholder: 'Rapporter og PDF-eksport kommer.',
      matchesPerWeekTitle: 'Kamper per uke per spiller',
      matchesPerWeekSubtitle: 'Farge: grønn ≥ 1 kamp/uke, oransje < 1 kamp/uke. Referanselinje på 1.',
      matchesLabel: 'Kamper',
      weeksLabel: 'Uker',
      rateLabel: 'Kamper/uke',
      matchesMedianTitle: 'Kampfrekvens avvik (per uke)',
  matchesMedianSubtitle: 'Avvik fra median ({{median}}). Etiketter viser differanse fra median.',
      medianLabel: 'Median',
      trainingAttendanceTitle: 'Treningsoppmøte % avvik',
  trainingAttendanceSubtitle: 'Avvik fra median oppmøte % ({{median}}). Etiketter viser differanse.',
      attendedLabel: 'Møtte på treninger',
      attendancePctLabel: 'Oppmøte %'
      , unit: { week: 'Per uke', month: 'Per måned', sixMonths: 'Per 6 måneder', year: 'Per år' }
      , rateUnitLabel: { week: 'Kamper per uke', month: 'Kamper per måned', sixMonths: 'Kamper per 6 måneder', year: 'Kamper per år' }
      , rateLabelUnit: { week: 'Kamper/uke', month: 'Kamper/måned', sixMonths: 'Kamper/6mnd', year: 'Kamper/år' }
      , rangeSpanLabel: 'Periode: {{weeks}} uker'
      , matchModeWarning: 'Rapporter er kun tilgjengelig i Sesong-modus. Bytt til sesongimport for å se diagrammer.'
      , toggle: { matches: 'Kamper', trainings: 'Treninger' }
      , searchPlayersPlaceholder: 'Søk spiller'
      , viewScope: { top: 'Topp {{count}}', bottom: 'Bunn {{count}}', all: 'Alle' }
      , filteredLabel: 'Filtrert: {{count}}'
    }
  }}
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'no',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
});

export default i18n;
