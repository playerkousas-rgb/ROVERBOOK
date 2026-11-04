// Privacy engine — decides exactly what a viewer may read from a member's card.
// Access ranks: 0 = public, 1 = linked, 2 = full / owner.

import { FIELD_GROUPS, SECTIONS, COMPONENTS, BADGES, VISIBILITY_LEVELS } from '../shared/schema.js';

const LEVEL_RANK = { public: 0, linked: 1, self: 2 };

export function findConnection(db, ownerId, requesterId, status = 'accepted') {
  return (
    db.connections.find(
      (c) => c.ownerId === ownerId && c.requesterId === requesterId && c.status === status,
    ) || null
  );
}

export function connectionForViewer(db, viewer, subject) {
  if (!viewer || viewer.id === subject.id) return null;
  const link = db.connections.find(
    (c) =>
      c.status === 'accepted' &&
      ((c.ownerId === subject.id && c.requesterId === viewer.id) ||
        (c.ownerId === viewer.id && c.requesterId === subject.id)),
  );
  return link || null;
}

export function viewerRank(viewer, subject, connection) {
  if (viewer && viewer.id === subject.id) return { rank: 2, level: 'self', connection };
  if (!viewer) return { rank: 0, level: 'public', connection: null };
  if (connection) {
    return {
      rank: connection.scope === 'full' ? 2 : 1,
      level: connection.scope === 'full' ? 'full' : 'linked',
      connection,
    };
  }
  return { rank: 0, level: 'public', connection: null };
}

function fieldValue(subject, key) {
  if (key === 'memberNo') return subject.memberNo;
  if (key === 'crew') return subject.crew;
  if (key === 'district') return subject.district;
  if (key === 'region') return subject.region;
  if (key === 'nameZh') return subject.nameZh;
  if (key === 'nameEn') return subject.nameEn;
  const v = subject.profile?.[key];
  return v ?? '';
}

export function trainingSummary(subject) {
  const comps = subject.training?.components || {};
  const doneKeys = COMPONENTS.filter((c) => comps[c.id]?.done).map((c) => c.id);
  const badges = subject.training?.badges || {};
  const latestRenewal = [...(subject.renewals || [])].sort((a, b) => b.validUntil.localeCompare(a.validUntil))[0];
  const earned = BADGES.filter((b) => badges[b.id]?.date).map((b) => b.id);
  return {
    completed: doneKeys.length,
    total: COMPONENTS.length,
    doneKeys,
    earned,
    badges,
    membershipValidUntil: latestRenewal?.validUntil || null,
    membershipActive: latestRenewal ? latestRenewal.validUntil >= new Date().toISOString().slice(0, 10) : false,
  };
}

// Build the viewer-specific card. Never leaks values above the viewer's rank.
export function buildCard(db, viewer, subject, { isPublicLink = false } = {}) {
  const connection = connectionForViewer(db, viewer, subject);
  const { rank, level } = viewerRank(viewer, subject, connection);

  const privacy = subject.privacy || { fields: {}, sections: {} };
  const groups = FIELD_GROUPS.map((group) => {
    const fields = group.fields
      .map((f) => {
        const vis = privacy.fields?.[f.key] || 'self';
        const visible = LEVEL_RANK[vis] <= rank;
        const value = fieldValue(subject, f.key);
        if (!visible) return { ...f, visible: false, visibility: vis };
        if (!value) return { ...f, visible: true, visibility: vis, value: '' };
        return { ...f, visible: true, visibility: vis, value };
      })
      .filter((f) => f.visible);
    const hidden = group.fields.length - fields.length;
    return { ...group, fields, hidden };
  });

  const sections = {};
  const lockedSections = [];
  SECTIONS.forEach((sec) => {
    const vis = privacy.sections?.[sec.key] || 'self';
    const visible = LEVEL_RANK[vis] <= rank;
    const items = subject[sec.key] || [];
    if (visible) {
      sections[sec.key] = { ...sec, visible: true, visibility: vis, items };
    } else {
      lockedSections.push({ ...sec, visibility: vis, count: rank >= 1 ? items.length : undefined });
    }
  });

  const summary = trainingSummary(subject);
  const trainingVisible = !!sections.training?.visible;
  const membershipVisible = trainingVisible || !!sections.renewals?.visible;
  const badgeProgress = {
    ...summary,
    visible: trainingVisible,
    membershipVisible,
    membershipValidUntil: membershipVisible ? summary.membershipValidUntil : null,
    membershipActive: membershipVisible ? summary.membershipActive : null,
    completed: trainingVisible ? summary.completed : null,
    earned: trainingVisible ? summary.earned : [],
    components: COMPONENTS.map((c) => {
      const state = subject.training?.components?.[c.id] || {};
      const visible = sections.training?.visible;
      return {
        ...c,
        done: visible ? !!state.done : null,
        date: visible ? state.date || '' : '',
        note: visible ? state.note || '' : '',
        verified: visible ? !!state.verifiedBy : null,
      };
    }),
    badges: BADGES.map((b) => ({
      ...b,
      date: sections.training?.visible ? subject.training?.badges?.[b.id]?.date || '' : '',
    })),
  };

  const canSee = (key) => LEVEL_RANK[privacy.fields?.[key] || 'self'] <= rank;
  const nameVisible = canSee('nameZh') || canSee('nameEn');
  const nameZh = canSee('nameZh') ? subject.nameZh : '樂行童軍';
  const nameEn = canSee('nameEn') ? subject.nameEn : 'Rover Scout';

  return {
    subject: {
      id: subject.id,
      role: subject.role,
      nameZh,
      nameEn,
      nameHidden: !nameVisible,
      initials: (nameVisible ? subject.nameZh : '樂').slice(-1),
      crew: canSee('crew') ? subject.crew : null,
      group: canSee('crew') ? subject.group : null,
      district: canSee('district') ? subject.district : null,
      region: canSee('region') ? subject.region : null,
      leaderTitle: subject.leaderTitle,
      photo: canSee('photo') ? subject.profile?.photo || null : null,
    },
    access: {
      level,
      rank,
      isOwner: !!viewer && viewer.id === subject.id,
      connectionId: connection?.id || null,
      scope: connection?.scope || null,
      isPublicLink,
    },
    groups,
    sections,
    lockedSections,
    badgeProgress,
    endorsement: sections.training?.visible || rank >= 2 ? subject.endorsement || null : null,
    counts: {
      hiddenFields: groups.reduce((n, g) => n + g.hidden, 0),
      visibleFields: groups.reduce((n, g) => n + g.fields.length, 0),
      totalFields: groups.reduce((n, g) => n + g.fields.length + g.hidden, 0),
      lockedSections: lockedSections.length,
    },
  };
}

// Compact listing row (used in leader search & connection lists).
export function miniCard(db, viewer, subject) {
  const connection = connectionForViewer(db, viewer, subject);
  const { rank, level } = viewerRank(viewer, subject, connection);
  const p = subject.privacy?.fields || {};
  const show = (key) => LEVEL_RANK[p[key] || 'self'] <= rank;
  return {
    id: subject.id,
    role: subject.role,
    nameZh: subject.nameZh,
    nameEn: subject.nameEn,
    memberNo: show('memberNo') ? subject.memberNo : null,
    crew: show('crew') ? subject.crew : null,
    group: show('crew') ? subject.group : null,
    region: show('region') ? subject.region : null,
    leaderTitle: subject.leaderTitle,
    photo: null,
    access: level,
    connectionId: connection?.id || null,
    scope: connection?.scope || null,
    connectionStatus: connection?.status || null,
  };
}

export { VISIBILITY_LEVELS };
