// Shared vocabulary for ROVERBOOK — used by both the API and the web app.

export const VISIBILITY_LEVELS = [
  {
    id: 'public',
    label: '公開',
    labelEn: 'Public',
    hint: '任何人經你的卡片連結都可以看到',
  },
  {
    id: 'linked',
    label: '已連結',
    labelEn: 'Linked',
    hint: '只有你批准的領袖／朋友可以看到',
  },
  {
    id: 'self',
    label: '只限自己',
    labelEn: 'Private',
    hint: '只有你自己可以看到（除非你授予「全部資料」）',
  },
];

// 個人資料欄位：成員可以逐項選擇誰可以看到
export const FIELD_GROUPS = [
  {
    id: 'identity',
    label: '基本身份',
    labelEn: 'Identity',
    fields: [
      { key: 'photo', label: '相片', labelEn: 'Photo', type: 'photo' },
      { key: 'nameZh', label: '姓名（中文）', labelEn: 'Name (Chinese)', type: 'text' },
      { key: 'nameEn', label: '姓名（英文）', labelEn: 'Name (English)', type: 'text' },
      { key: 'memberNo', label: '會員編號', labelEn: 'Membership No.', type: 'text' },
      { key: 'crew', label: '樂行童軍團', labelEn: 'Crew', type: 'text' },
      { key: 'district', label: '區', labelEn: 'District', type: 'text' },
      { key: 'region', label: '地域', labelEn: 'Region', type: 'text' },
      { key: 'issueDate', label: '紀錄冊簽發日期', labelEn: 'Date of Issue', type: 'date' },
    ],
  },
  {
    id: 'contact',
    label: '個人資料',
    labelEn: 'Personal particulars',
    fields: [
      { key: 'dob', label: '出生日期', labelEn: 'Date of Birth', type: 'date' },
      { key: 'placeOfBirth', label: '出生地點', labelEn: 'Place of Birth', type: 'text' },
      { key: 'phone', label: '聯絡電話', labelEn: 'Telephone', type: 'tel' },
      { key: 'email', label: '電郵', labelEn: 'Email', type: 'email' },
      { key: 'address', label: '通訊地址', labelEn: 'Address', type: 'text' },
      { key: 'bloodType', label: '血型', labelEn: 'Blood Type', type: 'text' },
      { key: 'emergencyName', label: '緊急聯絡人', labelEn: 'Emergency Contact', type: 'text' },
      { key: 'emergencyPhone', label: '緊急聯絡電話', labelEn: 'Emergency Telephone', type: 'tel' },
    ],
  },
  {
    id: 'group',
    label: '旅部資料',
    labelEn: 'Group information',
    fields: [
      { key: 'sponsoringAuthority', label: '主辦機構', labelEn: 'Sponsoring Authority', type: 'text' },
      { key: 'groupAddress', label: '旅部地址', labelEn: 'Group Address', type: 'text' },
      { key: 'gsl', label: '旅長', labelEn: 'Name of GSL', type: 'text' },
      { key: 'rsl', label: '團長', labelEn: 'Name of RSL', type: 'text' },
      { key: 'meetingPlace', label: '團集會地點', labelEn: 'Meeting Place', type: 'text' },
      { key: 'dateJoined', label: '入團日期', labelEn: 'Date Joined', type: 'date' },
      { key: 'dateScoutMovement', label: '加入童軍運動日期', labelEn: 'Joined Scout Movement', type: 'date' },
    ],
  },
];

export const PROFILE_FIELDS = FIELD_GROUPS.flatMap((g) => g.fields);

// 紀錄冊其餘章節：整節授權
export const SECTIONS = [
  { key: 'scouting', label: '童軍紀錄', labelEn: 'Scouting Experience' },
  { key: 'training', label: '訓練進度', labelEn: 'Training Scheme' },
  { key: 'awards', label: '獎章及獎勵', labelEn: 'Awards & Commendations' },
  { key: 'service', label: '服務紀錄', labelEn: 'Service Record' },
  { key: 'expeditions', label: '遠足及海外活動', labelEn: 'Expeditions & Overseas' },
  { key: 'additional', label: '其他經驗', labelEn: 'Additional Experiences' },
  { key: 'renewals', label: '會員續期', labelEn: 'Renewal of Membership' },
];

// 樂行童軍訓練計劃的七項考驗
export const COMPONENTS = [
  {
    id: 'dedication',
    label: '準領袖培訓',
    labelEn: 'Dedication',
    blurb: '認識樂行童軍的使命，學習帶領小隊與策劃活動。',
  },
  {
    id: 'scoutcraft',
    label: '童軍技能',
    labelEn: 'Scoutcraft',
    blurb: '露營、繩結、地圖閱讀、野外定向等童軍技藝。',
  },
  {
    id: 'volunteerism',
    label: '服務',
    labelEn: 'Volunteerism',
    blurb: '持續參與社區服務，實踐「服務」銘言。',
  },
  {
    id: 'global',
    label: '國際視野',
    labelEn: 'Global Vision',
    blurb: '認識世界童軍運動與不同文化，參與國際交流。',
  },
  {
    id: 'tenacity',
    label: '興趣及技能',
    labelEn: 'Tenacity',
    blurb: '鑽研一項興趣或技能，並持之以恆。',
  },
  {
    id: 'wellness',
    label: '身心健康',
    labelEn: 'Mental & Physical Wellness',
    blurb: '建立運動習慣，關注自己與同伴的身心健康。',
  },
  {
    id: 'intrepidity',
    label: '挑戰',
    labelEn: 'Intrepidity',
    blurb: '完成一項具挑戰性的個人或小隊任務。',
  },
];

// 四個漸進階段
export const BADGES = [
  {
    id: 'membership',
    label: '會員章',
    labelEn: 'Membership Badge',
    requirement: '完成啟導班／同等項目',
    requirementEn: 'Introductory Course / Link Badge',
    window: '平均 3 個月',
  },
  {
    id: 'epaulettes',
    label: '樂行童軍肩章',
    labelEn: 'Rover Scout Epaulettes',
    requirement: '完成 7 項考驗中其中 4 項',
    requirementEn: 'Complete 4 of the 7 components',
    window: '平均 3–6 個月',
  },
  {
    id: 'award',
    label: '樂行童軍獎章',
    labelEn: 'Rover Scout Award',
    requirement: '完成全部 7 項考驗',
    requirementEn: 'Complete all 7 components',
    window: '平均 12–18 個月',
  },
  {
    id: 'bp',
    label: '貝登堡獎章',
    labelEn: 'Baden-Powell Award',
    requirement: '完成全部 7 項考驗及評核',
    requirementEn: 'Complete all 7 components and assessment',
    window: '平均 12–18 個月',
  },
];

export const DEFAULT_PRIVACY = {
  fields: {
    photo: 'linked',
    nameZh: 'public',
    nameEn: 'public',
    memberNo: 'public',
    crew: 'public',
    district: 'public',
    region: 'public',
    issueDate: 'linked',
    dob: 'self',
    placeOfBirth: 'self',
    phone: 'linked',
    email: 'linked',
    address: 'self',
    bloodType: 'linked',
    emergencyName: 'self',
    emergencyPhone: 'self',
    sponsoringAuthority: 'linked',
    groupAddress: 'linked',
    gsl: 'linked',
    rsl: 'public',
    meetingPlace: 'linked',
    dateJoined: 'linked',
    dateScoutMovement: 'linked',
  },
  sections: {
    scouting: 'linked',
    training: 'linked',
    awards: 'public',
    service: 'linked',
    expeditions: 'linked',
    additional: 'self',
    renewals: 'linked',
  },
};
