import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: { translation: {
    appTitle: 'Team Manager',
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
      confirmTypes: 'Confirm event types', training: 'Training', match: 'Match', discard: 'Discard'
    },
    playersPage: {
      searchPlaceholder: 'Search players',
      manageGroups: 'Manage Groups',
      table: { name: 'Name', group: 'Group', invited: 'Invited', attended: 'Attended', absent: 'Absent', attendancePct: 'Attendance %', actions: 'Actions' },
      details: 'Details', removeConfirm: 'Remove player {{name}}? This cannot be undone.',
      groupsDialog: { title: 'Groups', newGroup: 'New group', renameGroup: 'Rename group', add: 'Add', save: 'Save', cancel: 'Cancel', noneYet: 'No groups yet.' },
      playerDetails: {
        title: 'Player Details', summary: 'Summary', invited: 'Invited', attended: 'Attended', absent: 'Absent', attendance: 'Attendance', trainingsAttended: 'Trainings Attended', matchesAttended: 'Matches Attended', noTrainings: 'No trainings attended', noMatches: 'No matches attended', close: 'Close'
      },
      noPlayers: 'No players'
    },
    teamsPage: {
      generationTitle: 'Team Generation', targets: 'Targets', teamSize: 'Team Size', teamCount: 'Team Count', capacityHint: 'Capacity = size * count. Overflow players go to the wait list.', weightingLabel: 'Fairness weighting (prioritize lower attendance)', generateBtn: 'Generate Teams', regenerate: 'Regenerate', regenerateAgain: 'Regenerate Again', confirmTitle: 'Regenerate Teams?', confirmBody: 'This will discard the current team arrangement and generate new teams. Continue?', confirmCancel: 'Cancel', confirmOk: 'Regenerate', eligible: 'Eligible players', generatedTitle: 'Generated Teams', waitList: 'Wait List'
    },
    reportsPage: { placeholder: 'Reports & PDF export UI to be implemented.' }
  }},
  no: { translation: {
    appTitle: 'Lagstyring',
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
      confirmTypes: 'Bekreft typer', training: 'Trening', match: 'Kamp', discard: 'Forkast'
    },
    playersPage: {
      searchPlaceholder: 'Søk spillere',
      manageGroups: 'Administrer grupper',
      table: { name: 'Navn', group: 'Gruppe', invited: 'Invitert', attended: 'Møtt', absent: 'Fravær', attendancePct: 'Oppmøte %', actions: 'Handlinger' },
      details: 'Detaljer', removeConfirm: 'Fjern spiller {{name}}? Dette kan ikke angres.',
      groupsDialog: { title: 'Grupper', newGroup: 'Ny gruppe', renameGroup: 'Endre navn', add: 'Legg til', save: 'Lagre', cancel: 'Avbryt', noneYet: 'Ingen grupper ennå.' },
      playerDetails: {
        title: 'Spillerdetaljer', summary: 'Oppsummering', invited: 'Invitert', attended: 'Møtt', absent: 'Fravær', attendance: 'Oppmøte', trainingsAttended: 'Treninger (møtt)', matchesAttended: 'Kamper (møtt)', noTrainings: 'Ingen treninger møtt', noMatches: 'Ingen kamper møtt', close: 'Lukk'
      },
      noPlayers: 'Ingen spillere'
    },
    teamsPage: {
      generationTitle: 'Laggenerering', targets: 'Mål', teamSize: 'Lagstørrelse', teamCount: 'Antall lag', capacityHint: 'Kapasitet = størrelse * antall. Overskudd havner på venteliste.', weightingLabel: 'Rettferdighetsvekting (prioriter lavt oppmøte)', generateBtn: 'Generer lag', regenerate: 'Generer på nytt', regenerateAgain: 'Generer på nytt', confirmTitle: 'Generer på nytt?', confirmBody: 'Dette vil forkaste nåværende laginndeling og generere nye lag. Fortsette?', confirmCancel: 'Avbryt', confirmOk: 'Generer', eligible: 'Spillere tilgjengelig', generatedTitle: 'Genererte lag', waitList: 'Venteliste'
    },
    reportsPage: { placeholder: 'Rapporter og PDF-eksport kommer.' }
  }}
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'no',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
});

export default i18n;
