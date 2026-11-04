import React from 'react';
import { Page, H, P, Note, Line, Area, Grid, Check, ItemLine, ProgressRow, Comment, Present, Sig, Rows , Bilingual } from '../components/Form.jsx';
import Write from '../components/Write.jsx';
import { useBook, useField } from '../bookContext.js';
import { navigate } from '../router.jsx';
import { FORM_META, formStatus } from '@shared/forms.js';
import { useLang } from '../i18n.jsx';

/* 完成頒發後，直接一鍵生成對應申請表 */
function FormLink({ id }) {
  const { book } = useBook();
  const { isEn } = useLang();
  const st = formStatus(book)[id];
  return (
    <div className={`formlink${st.ready ? ' is-ready' : ''}`}>
      <div className="formlink__text">
        <strong>
          {FORM_META[id].code} · {st.ready ? (isEn ? 'ready to generate' : '已備妥，可以一鍵生成') : isEn ? 'incomplete' : '資料未齊'}
        </strong>
        <em>{isEn ? st.noteEn || st.note : st.note}</em>
      </div>
      <button className="btn btn--gold btn--sm" onClick={() => navigate(`/forms/${id}`)}>
        {isEn ? 'Generate form' : '生成表格'}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------- 13 會員章簡介 */

export function MbIntro() {
  return (
    <Page id="mb-intro" className="p-intro">
      <H en="Membership Badge">會員章</H>
      <P en="Membership Badge is the initial stage of the progressive training in the Rover Scout Section. It aims to help new members to know the Scout Movement and the Rover Scout Section, to understand and to accept the Scout Promise and Scout Law.">
        會員章是樂行童軍支部有進度性訓練的初階，旨在讓新加入的成員透過參與團活動去認識童軍運動及樂行童軍支部，明瞭及接納童軍誓詞和規律。
      </P>
      <P en="The Management Committee is responsible for the arrangement of training and assessments. The badge has to be approved and presented by the Rover Scout Leader upon recommendation by the Chairperson of the Management Committee.">
        此章是由管理委員會安排訓練及考核，管理委員會主席推薦，經由團長批核和頒發。
      </P>
      <div className="introstats">
        <ItemLine label="參與最少三次團活動" en="Take part in the crew activities at least 3 times" ids={['L1-ACT-01']} />
        <ItemLine label="理解：國旗、國徽、區旗、區徽、國歌及童軍運動" en="Understanding" ids={['L1-UND-01', 'L1-UND-02', 'L1-UND-03', 'L1-UND-04']} />
        <ItemLine label="禮節：儀式、升旗、步操" en="Ceremonial" ids={['L1-ETQ-01', 'L1-ETQ-02', 'L1-ETQ-03', 'L1-ETQ-04', 'L1-ETQ-05', 'L1-ETQ-06']} />
        <ItemLine label="許諾：誓詞及規律" en="Commitment" ids={['L1-PRM-01']} />
        <ItemLine label="保護童軍成員免受傷害課程" en="Safe From Harm" ids={['L1-CP-01']} />
      </div>
      <Note en="This chapter is arranged, assessed and recommended by the Management Committee, then approved and presented by the Rover Scout Leader.">
        填好細項後，請到第 17 頁填寫頒發紀錄，並由管理委員會主席及團長簽署。
      </Note>
    </Page>
  );
}

/* ------------------------------------------------------------- 14 活動紀錄 */

export function MbActivities() {
  return (
    <Page id="mb-activities">
      <H no="(1)" en="Activities" progress={['L1-ACT-01']}>活動</H>
      <Bilingual as="p" className="pglead" zh="參與最少三次團活動" en="Take part in the crew activities at least 3 times" />
      <Rows
        path="pages.mb-activities.rows"
        min={3}
        addLabel={null}
        del={false}
        cols={[
          { k: 'date', label: '日期', en: 'Date', type: 'date' },
          { k: 'place', label: '地點', en: 'Place' },
          { k: 'summary', label: '活動簡述', en: 'Summary of Activities', width: 2.1 },
          { k: 'certifiedBy', label: '確認人簽署', en: 'Certified by', width: 1.2 },
        ]}
      />
    </Page>
  );
}

/* ------------------------------------------------- 15 理解 · 禮節 */

export function MbUnderstanding() {
  return (
    <Page id="mb-understanding" className="p-items">
      <H no="(2)" en="Understanding" progress={['L1-UND-01', 'L1-UND-02', 'L1-UND-03', 'L1-UND-04']}>理解</H>
      <div className="itemhead">
        <Bilingual zh="項目" en="Items" />
        <span />
        <Bilingual zh="審核員" en="Assessor" />
        <Bilingual zh="日期" en="Date" />
      </div>
      <ItemLine label="(2.1) 對國旗、國徽、區旗、區徽和國歌的認識" en="Understand the National Flag and Emblem, Regional Flag and Emblem, and National Anthem" ids={['L1-UND-01', 'L1-UND-02', 'L1-UND-03']} />
      <ItemLine label="(2.2) 對香港及世界童軍運動有普遍的認識" en="Understand Hong Kong and World Scout Movement" ids={['L1-UND-04']} />

      <H no="(3)" en="Ceremonial" progress={['L1-ETQ-01', 'L1-ETQ-02', 'L1-ETQ-03', 'L1-ETQ-04', 'L1-ETQ-05', 'L1-ETQ-06']}>禮節</H>
      <div className="itemhead">
        <Bilingual zh="項目" en="Items" />
        <span />
        <Bilingual zh="審核員" en="Assessor" />
        <Bilingual zh="日期" en="Date" />
      </div>
      <ItemLine label="(3.1) 認識在國歌奏唱和升掛國旗、區旗時應有之禮儀" en="Know the rite to the National Flag and Emblem, Regional Flag and Emblem, and National Anthem" ids={['L1-ETQ-01']} />
      <ItemLine label="(3.2) 認識升掛國旗、區旗及展示國徽、區徽時之注意事項及使用限制" en="Know the regulations for the use and display of the flags and emblems" ids={['L1-ETQ-01']} />
      <ItemLine label="(3.3) 示範國旗和區旗的升掛方法" en="Demonstrate how to raise the National Flag and the Regional Flag" ids={['L1-ETQ-02']} />
      <ItemLine label="(3.4) 認識童軍禮節及步操" en="Know the basic foot drill and ceremonial" ids={['L1-ETQ-03', 'L1-ETQ-04', 'L1-ETQ-05', 'L1-ETQ-06']} />
    </Page>
  );
}

/* ------------------------------------------------- 16 許諾 · 保護童軍成員 */

export function MbCommitment() {
  return (
    <Page id="mb-commitment" className="p-items">
      <H no="(4)" en="Commitment" progress={['L1-PRM-01']}>許諾</H>
      <ItemLine label="明瞭及能接納童軍誓詞及規律" en="Understand and accept the Scout Promise and Scout Law" ids={['L1-PRM-01']} />

      <H no="(5)" en="Safe From Harm" progress={['L1-CP-01']}>保護童軍成員免受傷害</H>
      <ItemLine label="完成「保護童軍成員免受傷害」網上自學課程" en="Finish the Safe From Harm Online Learning Course" ids={['L1-CP-01']} />

      <div className="fduo sigspace">
        <Line label="宣誓日期 Date of Investiture" type="date" path="pages.mb-commitment.investiture" />
        <div className="sigspace__sig">
          <Sig path="pages.mb-commitment.rsl" title="樂行童軍團長" label="團長簽署 Signature of RSL" />
        </div>
      </div>
    </Page>
  );
}

/* --------------------------------------------------------------- 17 頒發 */

export function MbPresented() {
  return (
    <Page id="mb-presented" className="p-presented">
      <H en="Membership Badge">會員章</H>
      <Present page="mb-presented" signer="副署 Countersigned by" en="Rover Scout Leader">
        <div className="present__first">
          <Sig
            path="pages.mb-presented.chair"
            title="管理委員會主席"
            label="管理委員會主席簽署"
            en="Signature of Chairperson, Management Committee"
          />
        </div>
      </Present>
    </Page>
  );
}

/* --------------------------------------------------------------- 18 肩章 */

export function EpIntro() {
  return (
    <Page id="ep-intro" className="p-intro">
      <H en="Rover Scout Epaulettes">樂行童軍肩章</H>
      <P en="The aim of Rover Scout Epaulettes is to provide a platform for Rover Scouts with newly awarded Membership to acquire basic understanding and experience of activities and scoutcraft in the Rover Scout Section.">
        樂行童軍肩章之設立旨在提供階梯，讓剛獲頒會員章的樂行童軍對樂行童軍支部活動及童軍技能有基本認識和體驗。
      </P>
      <P en="The Management Committee is responsible for the arrangement of training and assessments of the Rover Scout Epaulettes. Upon the approval and recommendation by RSL, the Epaulettes are endorsed and issued by DRSL / ADC (RS) / ARHQC (RS) / RHQC (RS).">
        樂行童軍肩章是由管理委員會安排訓練及考核，經所屬團長批核及推薦，由樂行童軍區長、助理區總監（樂行童軍）、助理地域總部總監（樂行童軍）或地域總部總監（樂行童軍）確認及簽發。
      </P>

      <Bilingual as="p" className="pglead" zh="內容：完成下列 (1) 或 (2) 項" en="Complete either (1) OR (2)" />
      <ItemLine label="(1) 完成樂行童軍啟導班" en="Complete a Rover Scout Introductory Course" ids={['L2-INTRO-01']} />
      <ItemLine label="(2) 完成同等項目" en="Complete the equivalent items" ids={['L2-INTRO-01']} />

      <div className="sigspace">
        <Sig path="pages.ep-intro.chair" title="管理委員會主席" label="管理委員會主席簽署 Signature of MC Chairperson" />
        <div className="fduo">
          <Line label="姓名 Name" path="pages.ep-intro.chairName" />
          <Line label="日期 Date" type="date" path="pages.ep-intro.chairDate" />
        </div>
      </div>
    </Page>
  );
}

export function EpPresented() {
  return (
    <Page id="ep-presented" className="p-presented">
      <H en="Rover Scout Epaulettes">樂行童軍肩章</H>
      <Present page="ep-presented" signer="副署 Countersigned by" en="Rover Scout Leader">
        <div className="present__first">
          <Sig
            path="pages.ep-presented.chair"
            title="管理委員會主席"
            label="管理委員會主席簽署"
            en="Signature of Chairperson, Management Committee"
          />
        </div>
      </Present>
    </Page>
  );
}

/* --------------------------------------------------------- 20–21 獎章簡介 */

export function RsaIntro() {
  return (
    <Page id="rsa-intro" className="p-intro">
      <H en="Rover Scout Award and Baden-Powell Award">樂行童軍獎章及貝登堡獎章</H>
      <Bilingual as="h4" className="pgh" zh="簡介" en="Introduction" />
      <P en="The assessments of the two awards comprise seven components including “Dedication”, “Scoutcraft”, “Volunteerism”, “Global Vision”, “Tenacity”, “Mental and Physical Wellness”, and “Intrepidity”. Rover Scouts can carry out the assessments simultaneously. Rover Scout Award will be awarded when the member completed four components, while Baden-Powell Award will be awarded when the member completed all the components.">
        兩項獎章的考驗由 7 個項目組成，分別為「準領袖培訓」、「童軍技能」、「服務」、「國際視野」、「興趣及技能」、「身心健康」及「挑戰」。樂行童軍可同時進行這 7 項考驗，當完成其中任何 4 項後，成員可獲頒發「樂行童軍獎章」；而在完成所有考驗後，可獲頒發「貝登堡獎章」。
      </P>
      <Bilingual as="h4" className="pgh" zh="考核流程" en="Assessment progress" />
      <P en="Rover Scouts must plan their personal progress and gain approval from the affiliated Headquarter Commissioner (Rover Scouts) by submitting the “Application for Assessment of the Rover Scout Award and Baden-Powell Award” before the initiation of the assessment.">
        樂行童軍須自行計劃其考驗內容和進程，並於展開考驗前提交「樂行童軍獎章及貝登堡獎章考驗申請」予所屬總部總監（樂行童軍）作批核，除另有註明外，所有考驗項目必須於「考驗申請」批核後完成。
      </P>
      <div className="fduo">
        <Line label="考驗申請提交日期 Application submitted" type="date" path="pages.rsa-intro.appliedOn" />
        <Line label="批核日期 Approved on" type="date" path="pages.rsa-intro.approvedOn" />
      </div>
    </Page>
  );
}

export function RsaAwards() {
  return (
    <Page id="rsa-awards" className="p-intro">
      <H en="Rover Scout Award / Baden-Powell Award">樂行童軍獎章 · 貝登堡獎章</H>
      <Bilingual as="h4" className="pgh" zh="樂行童軍獎章" en="Rover Scout Award" />
      <P en="The Respective Rover Scout Leader is responsible for the training while the Respective Regional Headquarters Commissioner (Rover Scouts) is responsible for the assessments of the Rover Scout Award. After completing four components, the Rover Scout Award will be endorsed and issued by the Region upon confirmation and recommendation by the District. The Headquarters will confirm and issue the certificate.">
        樂行童軍獎章是由所屬團長負責安排訓練及由所屬總部總監（樂行童軍）負責考核，樂行童軍在完成 7 項考驗的其中 4 項後，經區會確認及推薦，地域審批，總會確認及簽發獎章證書。
      </P>
      <Bilingual as="h4" className="pgh" zh="貝登堡獎章" en="Baden-Powell Award" />
      <P en="After completing all the seven components, District Commissioner and Regional Commissioner should interview the member concerned and make recommendations. The Headquarters will endorse and issue the Baden Powell Award and certificate.">
        貝登堡獎章是由所屬團長負責安排訓練及由所屬總部總監（樂行童軍）負責考核，樂行童軍在完成全部 7 個項目後，經區總監及地域總監接見及推薦，總會審批及簽發獎章證書。
      </P>
      <Note en="Seven components: Dedication, Scoutcraft, Volunteerism, Global Vision, Tenacity, Mental and Physical Wellness, Intrepidity.">
        七項考驗：準領袖培訓、童軍技能、服務、國際視野、興趣及技能、身心健康、挑戰。
      </Note>
    </Page>
  );
}

/* ------------------------------------------------------------- 22 準領袖培訓 */

export function Dedication() {
  return (
    <Page id="dedication" className="p-items">
      <H no="(1)" en="DEDICATION" progress={['L3-LEADER-01', 'L3-LEADER-02']}>準領袖培訓</H>
      <Bilingual as="p" className="pglead" zh="完成下列所有項目：" en="Complete the following items" />
      <div className="itemhead itemhead--3">
        <Bilingual zh="項目" en="Items" />
        <Bilingual zh="證書編號" en="Certificate Number" />
        <Bilingual zh="日期" en="Date" />
      </div>
      <ProgressRow sub="1A" label="完成木章訓練系統第一階段" en="Complete Wood Badge Framework Stage 1" ids={['L3-LEADER-01']} assessor={false} />
      <ProgressRow sub="1B" label="完成木章訓練系統第一階段（續）" en="Complete Wood Badge Framework Stage 1" ids={['L3-LEADER-01']} assessor={false} />
      <ProgressRow sub="2A" label="完成木章訓練系統第二階段" en="Complete Wood Badge Framework Stage 2" ids={['L3-LEADER-02']} assessor={false} />
      <ProgressRow sub="2B" label="完成木章訓練系統第二階段（續）" en="Complete Wood Badge Framework Stage 2" ids={['L3-LEADER-02']} assessor={false} />
      <ProgressRow
        label="完成在職輔導或旅團服務"
        en="Complete In-service Mentorship OR Service within a Scout Group"
        ids={['L3-LEADER-02']}
        assessor={false}
      />
      <Comment page="dedication" />
    </Page>
  );
}

/* --------------------------------------------------------------- 23 童軍技能 */

export function Scoutcraft() {
  return (
    <Page id="scoutcraft" className="p-items">
      <H no="(2)" en="SCOUTCRAFT" progress={['L3-SCOUT-01', 'L3-SCOUT-02']}>童軍技能</H>

      <Bilingual as="h4" className="pgh" zh="2.1 傳統童軍技能" en="Traditional Skills" />
      <Check
        label="選擇項目 Selected Item"
        path="pages.scoutcraft.traditional"
        options={[
          { value: 'expedition', label: '遠足', en: 'Expedition' },
          { value: 'campcraft', label: '營藝', en: 'Campcraft' },
          { value: 'pioneering', label: '先鋒工程', en: 'Pioneering' },
          { value: 'other', label: '其他', en: 'Others' },
        ]}
      />
      <Line label="所選之訓練班" en="Selected Course" path="pages.scoutcraft.course1" placeholder="領袖遠足訓練班" />
      <div className="itemhead itemhead--3">
        <Bilingual zh="項目" en="Items" />
        <Bilingual zh="證書編號" en="Certificate Number" />
        <Bilingual zh="日期" en="Date" />
      </div>
      <ProgressRow label="完成所選之訓練班" en="Complete the selected course" ids={['L3-SCOUT-01']} assessor={false} />

      <Bilingual as="h4" className="pgh" zh="2.2 教練員或導師訓練班" en="Instructor / Assessor course" />
      <Line label="所選之訓練班" en="Selected Course" path="pages.scoutcraft.course2" placeholder="教練員訓練班" />
      <ProgressRow label="完成所選之訓練班" en="Complete the selected course" ids={['L3-SCOUT-02']} assessor={false} />

      <Comment page="scoutcraft" />
    </Page>
  );
}

/* ----------------------------------------------------------------- 24 服務 */

export function Volunteerism() {
  return (
    <Page id="volunteerism" className="p-items">
      <H no="(3)" en="VOLUNTEERISM" progress={['L3-SERVICE-01', 'L3-SERVICE-02', 'L3-SERVICE-03']}>服務</H>
      <Bilingual as="p" className="pglead" zh="完成下列所有項目：" en="Complete the following items" />
      <ProgressRow label="3.1 持有急救證書" en="Hold the First Aid Certificate" ids={['L3-SERVICE-01']} />
      <ProgressRow label="3.2 完成寰宇童軍計劃「探索」課程" en="Complete the SWA “Discovery” Section" ids={['L3-SERVICE-02']} />
      <ProgressRow label="3.3 完成寰宇童軍計劃「自願服務」或同等服務" en="Complete the SWA “Voluntary Service” or the equivalent service" ids={['L3-SERVICE-03']} />
      <Area label="服務簡述 Summary of Service" path="pages.volunteerism.summary" rows={2} />
      <Comment page="volunteerism" />
    </Page>
  );
}

/* ------------------------------------------------------------- 25 國際視野 */

export function GlobalVision() {
  return (
    <Page id="global-vision" className="p-items">
      <H no="(4)" en="GLOBAL VISION" progress={['L3-INTL-01', 'L3-INTL-02']}>國際視野</H>
      <Check
        label="所選擇之項目 Selected Item"
        path="pages.global-vision.selected"
        options={[
          { value: 'daily', label: '1. 日常交流', en: 'Daily Interactions' },
          { value: 'exchange', label: '2. 國際交流活動', en: 'International Exchange' },
        ]}
      />
      <div className="fduo">
        <Line label="從事之活動 Selected Activity" path="pages.global-vision.activity" />
        <Line label="活動日期 Duration" path="pages.global-vision.duration" placeholder="2025-07 至 2026-01" />
      </div>
      <Area label="內容簡述 Summary of Activity" path="pages.global-vision.summary" rows={3} />
      <div className="fduo">
        <ProgressRow label="完成並經審核" en="Completed and assessed" ids={['L3-INTL-01', 'L3-INTL-02']} />
      </div>
      <Comment page="global-vision" />
    </Page>
  );
}

/* --------------------------------------------------------------- 26 興趣 */

export function Tenacity() {
  return (
    <Page id="tenacity" className="p-items">
      <H no="(5)" en="TENACITY" progress={['L3-INT-01']}>興趣及技能</H>
      <div className="fduo">
        <Line label="從事之活動 Selected Activity" path="pages.tenacity.activity" placeholder="攝影" />
        <Line label="活動日期 Duration" path="pages.tenacity.duration" />
      </div>
      <Area label="內容簡述 Summary of Activity" path="pages.tenacity.summary" rows={3} />
      <ProgressRow label="12 個月內持續進修／參與不少於 52 小時" en="52 hours within 12 months" ids={['L3-INT-01']} />
      <Comment page="tenacity" />
    </Page>
  );
}

/* ------------------------------------------------------------ 27 身心健康一 */

export function Wellness1() {
  return (
    <Page id="wellness-1" className="p-items">
      <H no="(6)" en="MENTAL AND PHYSICAL WELLNESS" progress={['L3-HEALTH-01']}>身心健康（一）</H>
      <Bilingual as="p" className="pglead" zh="精神健康" en="Mental Health" />
      <Rows
        path="pages.wellness-1.certs"
        min={2}
        addLabel={null}
        cols={[
          { k: 'item', label: '項目', en: 'Items', width: 2.2 },
          { k: 'cert', label: '證書編號', en: 'Certificate No.' },
          { k: 'hours', label: '時數', en: 'Hours' },
          { k: 'date', label: '日期', en: 'Date', type: 'date' },
        ]}
      />
      <div className="fduo">
        <ProgressRow label="SOUL Keeper / 精神健康課程（訓練＋服務 50 小時以上）" en="SOUL Keeper / Mental Health course (50+ hours of training and service)" ids={['L3-HEALTH-01']} />
        <Line label="服務時數 Service Hours" path="pages.wellness-1.serviceHours" />
      </div>
      <Area label="服務簡述 Summary of Service" path="pages.wellness-1.summary" rows={2} />
      <Comment page="wellness-1" compact />
    </Page>
  );
}

/* ------------------------------------------------------------ 28 身心健康二 */

export function Wellness2() {
  return (
    <Page id="wellness-2" className="p-items">
      <H no="(6)" en="MENTAL AND PHYSICAL WELLNESS" progress={['L3-HEALTH-02']}>身心健康（二）</H>
      <div className="fduo">
        <Line label="從事之體育運動 Selected Physical Activity" path="pages.wellness-2.activity" placeholder="長跑" />
        <Line label="時數 Hours" path="pages.wellness-2.hours" />
      </div>
      <Area label="內容簡述 Summary of Activity" path="pages.wellness-2.summary" rows={3} />
      <ProgressRow label="12 個月內累積 52 小時並有持續進步" en="52 hours accumulated in 12 months" ids={['L3-HEALTH-02']} />
      <Comment page="wellness-2" />
    </Page>
  );
}

/* --------------------------------------------------------------- 29 挑戰 */

export function Intrepidity() {
  return (
    <Page id="intrepidity" className="p-items">
      <H no="(7)" en="INTREPIDITY" progress={['L3-CHALLENGE-01', 'L3-CHALLENGE-02']}>挑戰</H>
      <Check
        label="所選擇之項目 Selected Item"
        path="pages.intrepidity.selected"
        options={[
          { value: 'personal', label: '1. 個人挑戰', en: 'Personal Challenge' },
          { value: 'wilderness', label: '2. 野外挑戰', en: 'Wilderness Challenge' },
        ]}
      />
      <div className="fduo">
        <Line label="從事之活動 Selected Activity" path="pages.intrepidity.activity" />
        <Line label="活動日期 Duration" path="pages.intrepidity.duration" />
      </div>
      <Area label="內容簡述 Summary of Activity" path="pages.intrepidity.summary" rows={3} />
      <ProgressRow label="完成並經審核" en="Completed and assessed" ids={['L3-CHALLENGE-01', 'L3-CHALLENGE-02']} />
      <Comment page="intrepidity" />
    </Page>
  );
}

/* --------------------------------------------------------- 30 樂行獎章頒發 */

export function RsaPresented() {
  return (
    <Page id="rsa-presented" className="p-presented">
      <H en="Rover Scout Award">樂行童軍獎章</H>
      <Present page="rsa-presented" signer="樂行童軍團長" en="Rover Scout Leader" />
      <FormLink id="pt21" />
    </Page>
  );
}

/* ------------------------------------------------------------- 31–32 會面 */

export function Interview({ kind }) {
  const { isEn } = useLang();
  const isDistrict = kind === 'district';
  const page = isDistrict ? 'interview-district' : 'interview-region';
  return (
    <Page id={page} className="p-interview">
      <H no={isDistrict ? '(I)' : '(II)'} en={`Interview with ${isDistrict ? 'District' : 'Regional'} Commissioner`}>
        {isDistrict ? '貝登堡獎章申請前會面（一）' : '貝登堡獎章申請前會面（二）'}
      </H>
      <Bilingual
        as="p"
        className="pglead"
        zh={isDistrict ? '與區總監會面' : '與地域總監會面'}
        en={isDistrict ? 'Interview with District Commissioner' : 'Interview with Regional Commissioner'}
      />

      <Area label="評語 Comment" path={`pages.${page}.comment`} rows={6} />
      <div className="sigspace">
        <Sig path={`pages.${page}.sig`} title={isDistrict ? '區總監 District Commissioner' : '地域總監 Regional Commissioner'} label="總監簽署 Signature" />
        <div className="ftrio">
          <Line label="姓名 Name" path={`pages.${page}.name`} />
          <Line label={isDistrict ? '區 District' : '地域 Region'} path={`pages.${page}.unit`} />
          <Line label="日期 Date" type="date" path={`pages.${page}.date`} />
        </div>
      </div>
    </Page>
  );
}

/* --------------------------------------------------------- 33 貝登堡頒發 */

export function BpaPresented() {
  return (
    <Page id="bpa-presented" className="p-presented">
      <H en="Baden-Powell Award">貝登堡獎章</H>
      <Present page="bpa-presented" signer="樂行童軍團長" en="Rover Scout Leader" />
      <FormLink id="pt22" />
    </Page>
  );
}
