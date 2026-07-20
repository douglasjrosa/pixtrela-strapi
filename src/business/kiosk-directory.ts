import { isTeamActive } from './team-active';

export type KioskDirectoryTeamRow = {
  documentId: string;
  name: string;
};

export type KioskDirectoryColaboratorRow = {
  documentId: string;
  name: string;
  facePhotoUrl: string | null;
};

export function mapActiveDirectoryTeams(
  teams: Array<{
    documentId?: string;
    document_id?: string;
    name?: string;
    untill?: string | Date | null;
  }>,
): KioskDirectoryTeamRow[] {
  return teams
    .filter((team) => isTeamActive(team.untill))
    .map((team) => ({
      documentId: String(team.documentId ?? team.document_id ?? ''),
      name: String(team.name ?? ''),
    }))
    .filter((team) => team.documentId.length > 0 && team.name.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function mapDirectoryColaborators(
  members: Array<{
    documentId?: string;
    document_id?: string;
    name?: string;
    username?: string;
    roleType?: string;
    role_type?: string;
    blocked?: boolean | number;
    facePhoto?: { url?: string } | null;
  }>,
): KioskDirectoryColaboratorRow[] {
  return members
    .filter((member) => {
      const role = String(member.roleType ?? member.role_type ?? '');
      if (role !== 'colaborator') return false;
      if (member.blocked === true || member.blocked === 1) return false;
      return true;
    })
    .map((member) => ({
      documentId: String(member.documentId ?? member.document_id ?? ''),
      name: String(member.name ?? member.username ?? ''),
      facePhotoUrl: member.facePhoto?.url ? String(member.facePhoto.url) : null,
    }))
    .filter((member) => member.documentId.length > 0 && member.name.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
