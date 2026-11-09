import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useBook } from '../bookContext.js';
import { Link, navigate } from '../router.jsx';
import { Icon } from '../ui.jsx';
import Write from '../components/Write.jsx';
import { FORM_META, FORM_ORDER, formData, formStatus } from '@shared/forms.js';

const nz = (v) => (v == null || v === '' ? '' : String(v));
const fmtDate = (v) => {
  const d = new Date(v);
  if (!v || Number.isNaN(d.getTime())) return nz(v);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
};
const tick = (on) => (on ? '☑' : '☐');

const getIn = (obj, path) =>
  path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

function setIn(obj, path, value) {
  const next = structuredClone(obj || {});
  const keys = path.split('.');
  let cur = next;
  keys.slice(0, -1).forEach((k) => {
    if (!cur[k] || typeof cur[k] !== 'object') cur[k] = {};
    cur = cur[k];
  });
  cur[keys[keys.length - 1]] = value;
  return next;
}

const printNow = async () => {
  try {
    await document.fonts?.ready;
  } catch {
    /* ignore */
  }
  setTimeout(() => window.print(), 80);
};

/* 螢幕上的「列印預覽」：把將要印出的結果原樣顯示 */
function usePrintPreview() {
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    document.body.classList.toggle('preview-print', preview);
    return () => document.body.classList.remove('preview-print');
  }, [preview]);
  return [preview, setPreview];
}

function PreviewBar({ preview, onToggle, onPrint }) {
  if (!preview) return null;
  return (
    <div className="previewbar">
      <span>列印預覽 · 只會印出文件</span>
      <button className="btn btn--ghost btn--sm" onClick={onToggle}>
        離開預覽
      </button>
      <button className="btn btn--primary btn--sm" onClick={onPrint}>
        <Icon name="print" size={14} /> 列印
      </button>
    </div>
  );
}

/* 文件內可直接補寫的欄位（紀錄冊沒有的資料），存於 book.forms */
function FormField({ path, fallback = '', placeholder = '', multiline = false, rows = 2 }) {
  const { book, update } = useBook();
  const stored = getIn(book, `forms.${path}`);
  const value = stored === undefined || stored === null || stored === '' ? fallback : stored;
  return (
    <Write
      value={value}
      multiline={multiline}
      rows={rows}
      compact
      label={placeholder || '填寫'}
      placeholder={placeholder}
      onChange={(v) => update((b) => ({ ...b, forms: setIn(b.forms || {}, path, v) }))}
    />
  );
}

/* ------------------------------------------------------------------ 首頁 */

export function FormsIndex() {
  const { book, update } = useBook();
  const status = formStatus(book);
  const setMember = (key, value) =>
    update((b) => ({ ...b, member: { ...b.member, [key]: value } }));

  return (
    <div className="formshome">
      <header className="formshome__head">
        <span className="eyebrow">FORMS · 3 張官方表格</span>
        <h1>一鍵生成申請表</h1>
        <p>
          三張表格的個人資料、考核項目、日期、審核員同簽名，都直接由這本紀錄冊帶出。
          <br />
          你只需要核對，然後列印或存成 PDF。
        </p>
      </header>

      <div className="formshome__list">
        {FORM_ORDER.map((id) => {
          const meta = FORM_META[id];
          const st = status[id];
          return (
            <article key={id} className={`formcard${st.ready ? ' is-ready' : ''}`}>
              <div className="formcard__top">
                <span className="formcard__code">{meta.code}</span>
                <span className={`formcard__state${st.ready ? ' is-ready' : ''}`}>
                  {st.ready ? '可以生成' : '未齊資料'}
                </span>
              </div>
              <h2>{meta.zh}</h2>
              <p className="formcard__en">{meta.en}</p>
              <p className="formcard__when">
                <Icon name="clock" size={13} /> {meta.when}
              </p>
              <p className="formcard__note">{st.note}</p>
              <div className="formcard__actions">
                <Link to={`/forms/${id}`} className={`btn ${st.ready ? 'btn--primary' : 'btn--ghost'}`}>
                  <Icon name="seal" size={15} /> 一鍵生成
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      <section className="formshome__extra">
        <h3>表格需要的補充資料</h3>
        <p className="formshome__hint">
          紀錄冊本身無這兩項，填一次，三張表格往後都會自動使用（可以留空，到時手寫）。
        </p>
        <div className="formshome__fields">
          <label className="ff">
            <span>性別 Gender</span>
            <select value={book.member?.gender || ''} onChange={(e) => setMember('gender', e.target.value)}>
              <option value="">未填</option>
              <option value="男 Male">男 Male</option>
              <option value="女 Female">女 Female</option>
            </select>
          </label>
          <div className="ff ff--wide">
            <span>通訊地址（英文）Address (English)</span>
            <Write
              value={book.member?.addressEn || ''}
              onChange={(v) => setMember('addressEn', v)}
              placeholder="Flat A, 1/F, 1 Example Road, Kowloon"
              label="通訊地址（英文）"
            />
          </div>
        </div>
      </section>

      <div className="formshome__back">
        <Link to="/p/particulars-1" className="btn btn--ghost">
          <Icon name="back" size={15} /> 返回紀錄冊
        </Link>
        <Link to="/forms/all" className="btn btn--gold">
          <Icon name="print" size={15} /> 一次列印三張
        </Link>
        <p>
          三張表格的公函部分（區總監、地域、青少年活動署簽署及蓋章）留白，交由領袖及總會填寫。
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- 文件外框 */

function useFitScale() {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, Math.max(0.3, (el.clientWidth - 10) / 794)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener('resize', fit);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, []);
  return [ref, scale];
}

export function FormDoc({ id }) {
  const { book } = useBook();
  const meta = FORM_META[id];
  const data = formData(book, id);
  const status = formStatus(book)[id];
  const [wrapRef, scale] = useFitScale();
  const [full, setFull] = useState(false);
  const [preview, setPreview] = usePrintPreview();

  useEffect(() => {
    if (!meta) navigate('/forms', { replace: true });
  }, [meta]);

  if (!meta) return null;

  return (
    <div className="formpage">
      <PreviewBar preview={preview} onToggle={() => setPreview(false)} onPrint={printNow} />
      <div className="formbar">
        <Link to="/forms" className="btn btn--ghost btn--sm">
          <Icon name="back" size={14} /> 三張表格
        </Link>
        <span className="formbar__name">
          {meta.code} · {meta.zh}
        </span>
        <button className="btn btn--ghost btn--sm" onClick={() => setFull((v) => !v)}>
          <Icon name="zoom" size={14} /> {full ? '全頁' : '放大'}
        </button>
        <Link to="/forms/all" className="btn btn--ghost btn--sm">
          <Icon name="book" size={14} /> 全部三張
        </Link>
        <button className="btn btn--ghost btn--sm" onClick={() => setPreview(true)}>
          <Icon name="expand" size={14} /> 預覽
        </button>
        <button className="btn btn--primary btn--sm" onClick={printNow}>
          <Icon name="print" size={14} /> 列印 / 存 PDF
        </button>
      </div>

      {!status?.ready && (
        <p className="formwarn">
          <Icon name="info" size={14} /> {status?.note} 仍可生成，未完成的欄位會留白待手寫。
        </p>
      )}

      <p className="formtip">
        <Icon name="print" size={13} /> 列印：電腦 ⌘P／Ctrl+P；iPhone 分享 →「列印」（可揀另存 PDF）；Android ⋮ →「列印」。
      </p>

      <div className={`formwrap${full ? ' is-full' : ''}`} ref={wrapRef}>
        <div className="formdoc" style={full ? undefined : { zoom: scale }}>
          {id === 'pt69' && <Doc69 data={data} />}
          {id === 'pt21' && <Doc21 data={data} />}
          {id === 'pt22' && <Doc22 data={data} />}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- 共用件 */

function DocHead({ code, zh, en }) {
  return (
    <div className="fd-head">
      <div className="fd-head__code">FORM {code} 8/2026</div>
      <div className="fd-head__org">
        香港童軍總會
        <em>Scout Association of Hong Kong</em>
      </div>
      <h2>{zh}</h2>
      <p className="fd-head__en">{en}</p>
    </div>
  );
}

function Section({ no, zh, en, children, breakBefore }) {
  return (
    <section className={`fd-sec${breakBefore ? ' fd-sec--break' : ''}`}>
      <h3>
        <span className="fd-sec__no">{no}</span> {zh} <em>{en}</em>
      </h3>
      {children}
    </section>
  );
}

function Particulars({ p, note }) {
  return (
    <div className="fd-particulars">
      <table className="fd-tbl fd-tbl--particulars">
        <colgroup>
          <col style={{ width: '92px' }} />
          <col />
          <col style={{ width: '74px' }} />
          <col style={{ width: '58px' }} />
          <col style={{ width: '60px' }} />
          <col style={{ width: '52px' }} />
          <col style={{ width: '86px' }} />
        </colgroup>
        <tbody>
          <tr>
            <th>姓名（中文）<em>Name (Chinese)</em></th>
            <td>{p.nameZh}</td>
            <th>（英文）<em>(English)</em></th>
            <td colSpan={3}>{p.nameEn}</td>
            <td className="fd-photo" rowSpan={4}>
              {p.photo ? <img src={p.photo} alt="近照" /> : <span>近照<br />Recent Photo</span>}
            </td>
          </tr>
          <tr>
            <th>出生日期<em>Date of Birth</em></th>
            <td>{fmtDate(p.dob)}</td>
            <th>年齡<em>Age</em></th>
            <td>{p.age}</td>
            <th>性別<em>Gender</em></th>
            <td>{p.gender}</td>
          </tr>
          <tr>
            <th>童軍成員編號<em>Scout ID</em></th>
            <td>{p.memberNo}</td>
            <th>簽發日期<em>Issue Date</em></th>
            <td colSpan={3}>{fmtDate(p.issueDate)}</td>
          </tr>
          <tr>
            <th>所屬單位<em>Unit</em></th>
            <td colSpan={5}>
              （地域 Region）{p.region}　（區 District）{p.district}　（旅 Group）{p.group}
            </td>
          </tr>
          <tr>
            <th>通訊地址<em>Address</em></th>
            <td colSpan={5}>{p.address}</td>
            {p.addressEn && <td className="fd-addr-en">{p.addressEn}</td>}
            {!p.addressEn && <td className="fd-photo fd-photo--blank" />}
          </tr>
          <tr>
            <th>聯絡電話<em>Contact No.</em></th>
            <td>{p.phone}</td>
            <th>電郵地址<em>E-mail</em></th>
            <td colSpan={4}>{p.email}</td>
          </tr>
        </tbody>
      </table>
      {note && <p className="fd-small">{note}</p>}
    </div>
  );
}

function SigBlock({ title, en, sig, name, date, stamp, lines }) {
  return (
    <div className="fd-sig">
      <div className="fd-sig__head">
        {title} <em>{en}</em>
      </div>
      <div className="fd-sig__body">
        <div className="fd-sig__ink">
          {sig ? <img src={sig} alt={`${title} 簽署`} /> : <span className="fd-sig__line" />}
        </div>
        {stamp && <div className="fd-sig__stamp">{stamp}</div>}
      </div>
      <div className="fd-sig__meta">
        <span>姓名 Name：{name || '＿＿＿＿＿＿'}</span>
        <span>日期 Date：{date ? fmtDate(date) : '＿＿＿＿＿＿'}</span>
      </div>
      {lines}
    </div>
  );
}

function ReturnAddress({ p }) {
  return (
    <div className="fd-return">
      <p className="fd-small">請用正楷填寫回郵地址 Please fill in return address by using BLOCK LETTERS</p>
      <div className="fd-return__grid">
        <div className="fd-return__box">
          <span>姓名 Name：{p.nameZh} {p.nameEn}</span>
          <span>地址 Address：{p.addressEn || p.address}</span>
        </div>
        <div className="fd-return__box">
          <span>姓名 Name：</span>
          <span>地址 Address：</span>
          <span className="fd-return__spacer" />
          <span className="fd-return__spacer" />
        </div>
        <div className="fd-return__box">
          <span>姓名 Name：</span>
          <span>地址 Address：</span>
          <span className="fd-return__spacer" />
          <span className="fd-return__spacer" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ PT/69 考試 */

function Doc69({ data }) {
  const { personal, components, holder, rsl } = data;
  return (
    <>
      <DocHead code="PT/69" zh="樂行童軍獎章及貝登堡獎章考試申請" en="Application for Assessment of the Rover Scout Award and Baden-Powell Award" />
      <Section no="(1)" zh="個人摘要" en="Personal Particulars">
        <div className="fd-no">
          編號 No.：<span className="fd-write">{personal.memberNo}</span>
        </div>
        <Particulars
          p={personal}
          note="（須與香港身份證／出生證明書上資料相同）(Same as Name printed on Identification)"
        />
      </Section>

      <Section no="(2)" zh="考試計劃" en="Assessment Planning" breakBefore>
        <table className="fd-tbl fd-tbl--plan">
          <colgroup>
            <col style={{ width: '210px' }} />
            <col />
            <col style={{ width: '82px' }} />
            <col style={{ width: '82px' }} />
          </colgroup>
          <thead>
            <tr>
              <th>項目<em>Items</em></th>
              <th>計劃簡述<em>Summary of Planning</em></th>
              <th>由<em>From</em></th>
              <th>至<em>To</em></th>
            </tr>
          </thead>
          <tbody>
            {components.map((c) => (
              <tr key={c.key} className={c.done ? 'is-done' : ''}>
                <th className="fd-item">
                  <span>
                    {tick(c.done)} {c.zh}
                  </span>
                  <em>{c.en}</em>
                  {c.key === 'dedication' && (
                    <small>
                      {tick(c.items[1]?.date)} 完成木章訓練系統第二階段 Complete Wood Badge Framework Stage 2
                      <br />
                      {tick(c.items[1]?.date)} 旅團服務 Service within a Scout Group
                    </small>
                  )}
                  {c.key === 'scoutcraft' && (
                    <small>
                      {tick(c.items[0]?.date)} 傳統童軍技能 Traditional Skills
                      <br />
                      {tick(c.items[1]?.date)} 教練員或導師訓練班 Instructor / Assessor course
                      <br />
                      {tick(c.items[2]?.date)} 隊列訓練工作坊 Chinese Foot Drill Workshop
                    </small>
                  )}
                  {c.key === 'global-vision' && (
                    <small>
                      {tick(c.items[0]?.date)} 日常交流 Daily Exchange
                      <br />
                      {tick(c.items[1]?.date)} 國際交流活動 International Exchange
                    </small>
                  )}
                  {c.key === 'wellness' && (
                    <small>
                      {tick(c.items[0]?.date)} 精神健康課程及服務
                      <br />
                      {tick(c.items[1]?.date)} 體育運動 Physical Activity
                    </small>
                  )}
                  {c.key === 'intrepidity' && (
                    <small>
                      {tick(c.items[0]?.date)} 野外挑戰 Wilderness Challenge
                      <br />
                      {tick(c.items[1]?.date)} 個人挑戰 Personal Challenge
                    </small>
                  )}
                </th>
                <td className="fd-summary">
                  <FormField
                    path={`pt69.plans.${c.key}`}
                    fallback={c.summary}
                    placeholder="計劃簡述"
                    multiline
                    rows={2}
                  />
                </td>
                <td>{c.from ? fmtDate(c.from) : ''}</td>
                <td>{c.to ? fmtDate(c.to) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section no="(3)" zh="確認及批核" en="Confirmation and Approval" breakBefore>
        <div className="fd-two">
          <SigBlock
            title="1. 申請人簽署"
            en="Signature of Applicant"
            sig={holder.signature}
            name={holder.name}
            date={holder.date}
          />
          <div className="fd-sig">
            <div className="fd-sig__head">
              2. 同意 <em>Agreement</em>
            </div>
            <p className="fd-small">
              茲批准申請人開始樂行童軍獎章及貝登堡獎章考試。
              <br />
              <em>I hereby agree the applicant for assessment of the Rover Scout Award and Baden-Powell Award.</em>
            </p>
            <div className="fd-sig__meta">
              <span>樂行童軍團長 Rover Scout Leader</span>
              <span>旅印 Group Stamp</span>
            </div>
            <div className="fd-sig__stamp-box">旅印</div>
            <div className="fd-sig__meta">
              <span>姓名 Name：{rsl.name || '＿＿＿＿＿＿'}</span>
              <span>日期 Date：{rsl.date ? fmtDate(rsl.date) : '＿＿＿＿＿＿'}</span>
            </div>
          </div>
        </div>
        <div className="fd-two">
          <SigBlock title="3. 知會區會" en="Acknowledged by District" stamp="區印" />
          <SigBlock title="4. 批核" en="Approval" stamp="地域印" />
        </div>
        <div className="fd-remark">
          <strong>備註 Remark</strong>
          <p>
            你在申請表格內填報的個人及其他有關的資料，會供有關單位處理你申請樂行童軍獎章及貝登堡獎章考試及有關的用途。提供個人及其他有關的資料，純屬自願；如沒有提供足夠和正確的資料，有關單位可能無法處理你的申請。
          </p>
        </div>
      </Section>
    </>
  );
}

/* --------------------------------------------------------- PT/21 樂行獎章 */

const ITEMS_21 = ['準領袖培訓 Dedication', '童軍技能 Scoutcraft', '服務 Volunteerism', '國際視野 Global Vision', '興趣及技能 Tenacity', '身心健康 Mental and Physical Wellness', '挑戰 Intrepidity'];

function ItemsTable({ components, ticked, summaryLabel = '活動簡述' }) {
  const rows = ITEMS_21.map((label, i) => ({ label, component: components.find((c) => c.no === String(i + 1)) }));
  const isTicked = (c) => (ticked ? ticked.includes(c?.key) : !!c?.done);
  return (
    <table className="fd-tbl fd-tbl--items">
      <colgroup>
        <col style={{ width: '185px' }} />
        <col />
        <col style={{ width: '84px' }} />
        <col style={{ width: '78px' }} />
        <col style={{ width: '82px' }} />
      </colgroup>
      <thead>
        <tr>
          <th>*項目<em>*Items</em></th>
          <th>{summaryLabel}<em>Summary of Activities</em></th>
          <th>完成日期<em>Date Completed</em></th>
          <th>審核員<em>Assessor</em></th>
          <th>備註<em>Remarks</em></th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ label, component }) => {
          const on = isTicked(component);
          return (
            <tr key={label} className={on ? 'is-done' : ''}>
              <th>
                {tick(on)} {label}
              </th>
              <td className="fd-summary">{on ? component?.summary : ''}</td>
              <td>{on && component?.to ? fmtDate(component.to) : ''}</td>
              <td>{on ? component?.assessor : ''}</td>
              <td>{component?.done && !on ? '已用於樂行童軍獎章' : ''}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Doc21({ data }) {
  const { personal, components, holder, rsl } = data;
  return (
    <>
      <DocHead code="PT/21" zh="樂行童軍獎章及證書申請表" en="Application Form for the Rover Scout Award and Certificate" />
      <Section no="1" zh="個人資料" en="Personal Particulars">
        <Particulars p={personal} note="（須與香港身份證／出生證明書上資料相同）(Same as Name printed on Identification)" />
      </Section>

      <Section no="2" zh="完成之項目" en="Completed Items">
        <ItemsTable components={components} ticked={components.filter((c) => c.done).slice(0, 4).map((c) => c.key)} />
        <p className="fd-small">
          *請於七個項目中挑選其中四項，並於旁邊方格內加上剔號。請用正楷填寫回郵地址。
          <br />
          <em>*Choose four from the seven items and put a tick in the appropriate box.</em>
        </p>
        <ReturnAddress p={personal} />
      </Section>

      <Section no="3" zh="申請者簽署" en="Applicant’s Signature" breakBefore>
        <div className="fd-two">
          <div className="fd-sig">
            <div className="fd-sig__head">申請者簽署 <em>Applicant’s Signature</em></div>
            <p className="fd-small">
              茲證明上述資料正確無訛。請於簽署前，參閱下列之備註。
              <br />
              <em>I hereby declare that the above information is true to my fullest understanding.</em>
            </p>
            <div className="fd-sig__ink">
              {holder.signature ? <img src={holder.signature} alt="申請人簽署" /> : <span className="fd-sig__line" />}
            </div>
            <div className="fd-sig__meta">
              <span>姓名 Name：{holder.name}</span>
              <span>日期 Date：{holder.date ? fmtDate(holder.date) : '＿＿＿＿＿＿'}</span>
            </div>
          </div>
          <div className="fd-sig">
            <div className="fd-sig__head">4. 提名 <em>Nomination</em></div>
            <p className="fd-small">
              茲經核證上述資料正確無誤，並提名申請人獲取樂行童軍獎章。
              <br />
              <em>I hereby verify that the above information is correct to my fullest understanding, and nominate the applicant for the Rover Scout Award.</em>
            </p>
            <div className="fd-sig__ink">
              {rsl.signature ? <img src={rsl.signature} alt="團長簽署" /> : <span className="fd-sig__line" />}
            </div>
            <div className="fd-sig__meta">
              <span>樂行童軍團長 Rover Scout Leader</span>
              <span>旅印 Group Stamp</span>
            </div>
            <div className="fd-sig__meta">
              <span>姓名 Name：{rsl.name || '＿＿＿＿＿＿'}</span>
              <span>日期 Date：{rsl.date ? fmtDate(rsl.date) : '＿＿＿＿＿＿'}</span>
            </div>
          </div>
        </div>
      </Section>

      <Section no="5" zh="推薦" en="Recommendation">
        <div className="fd-two">
          <div className="fd-sig">
            <p className="fd-small">
              茲推薦申請人獲取樂行童軍獎章。
              <br />
              <em>I hereby recommend the applicant for the Rover Scout Award.</em>
            </p>
            <div className="fd-sig__meta">
              <span>助理區總監（樂行童軍）／樂行童軍區長／區代表</span>
              <span>區印 District Stamp</span>
            </div>
            <div className="fd-sig__stamp-box">區印</div>
            <div className="fd-sig__meta">
              <span>姓名 Name：＿＿＿＿＿＿</span>
              <span>日期 Date：＿＿＿＿＿＿</span>
            </div>
          </div>
          <div className="fd-sig">
            <p className="fd-small">
              6. 批核 <em>Approval</em>
              <br />
              茲批准申請人獲取樂行童軍獎章。
              <br />
              <em>I hereby approve the applicant for the Rover Scout Award.</em>
            </p>
            <div className="fd-sig__meta">
              <span>地域總部總監（樂行童軍）</span>
              <span>地域印 Regional Stamp</span>
            </div>
            <div className="fd-sig__stamp-box">地域印</div>
            <div className="fd-sig__meta">
              <span>姓名 Name：＿＿＿＿＿＿</span>
              <span>日期 Date：＿＿＿＿＿＿</span>
            </div>
          </div>
        </div>
      </Section>

      <Section no="7" zh="確認" en="Confirmation">
        <div className="fd-two">
          <div className="fd-sig">
            <p className="fd-small">
              茲確認上述之申請。
              <br />
              <em>I hereby confirm the above application.</em>
            </p>
            <div className="fd-sig__meta">
              <span>青少年活動總監 Programme Commissioner</span>
              <span>青少年活動署印</span>
            </div>
            <div className="fd-sig__stamp-box">署印</div>
          </div>
          <div className="fd-sig fd-sig--branch">
            <div className="fd-sig__head">青少年活動署專用 <em>For Programme Branch Use Only</em></div>
            <div className="fd-sig__meta">
              <span>收表日期 Received Date：＿＿＿＿</span>
              <span>查核 Checked：＿＿＿＿</span>
            </div>
            <div className="fd-sig__meta">
              <span>證書編號 Cert. No.：＿＿＿＿＿＿</span>
              <span>證書發出日期 Cert. Issue Date：＿＿＿＿</span>
            </div>
          </div>
        </div>
      </Section>

      <div className="fd-fine">
        <strong>樂行童軍獎章及證書申請程序 Application procedures：</strong>
        <ol>
          <li>填妥本表格及在(3)申請人簽署一欄簽署，然後交由樂行童軍團長簽署(4)提名欄。</li>
          <li>將表格交由區會助理區總監（樂行童軍）／樂行童軍區長／區指定人士簽署(5)推薦欄，之後交由地域總部總監（樂行童軍）簽署(6)批核欄。</li>
          <li>本表格連同紀錄冊內有關個人資料、有效日期、樂行童軍獎章考核的頁次及各項有關證書之影印本，經地域轉交總會青少年活動署。</li>
          <li>青少年活動署總監核對無誤後，即簽發獎章及證書。</li>
        </ol>
        <strong>備註 Remarks</strong>
        <p>1) 你在申請表格內填報的個人及其他有關的資料，會供本會處理你的申請及有關的用途。在申請表格提供個人及其他有關的資料，純屬自願。然而，你如果沒有提供足夠和正確的資料，本會可能無法處理你的申請。</p>
        <p>2) 在一般情況下，申請表將於審批完成後 2 年銷毀。</p>
      </div>
    </>
  );
}

/* ------------------------------------------------------- PT/22 貝登堡獎章 */

function Doc22({ data }) {
  const { personal, components, remaining, holder, rsl, rsa, firstAid } = data;
  return (
    <>
      <DocHead code="PT/22" zh="貝登堡獎章及證書申請表" en="Application Form for the Baden-Powell Award and Certificate" />
      <Section no="1" zh="個人資料" en="Personal Particulars">
        <Particulars p={personal} note="（須與香港身份證／出生證明書上資料相同）(Same as Name printed on Identification)" />
      </Section>

      <Section no="2" zh="完成之項目" en="Completed Items">
        <div className="fd-certline">
          <span>樂行童軍獎章 Rover Scout Award</span>
          <span>證書編號 Certificate No.：{rsa.certNo || '＿＿＿＿＿＿'}</span>
          <span>完成日期 Date Completed：{rsa.presentedOn ? fmtDate(rsa.presentedOn) : '＿＿＿＿＿＿'}</span>
        </div>
        <ItemsTable components={components} ticked={remaining.map((c) => c.key)} summaryLabel="活動簡述" />
        <p className="fd-small">
          *請於七個項目中挑選其中三項，並於旁邊方格內加上剔號。
          <br />
          <em>*Choose three from the seven items and put a tick in the appropriate box.</em>
        </p>
        <div className="fd-firstaid">
          <span>^有效急救證書編號（必填）Valid First Aid Certificate Number (REQUIRED)：</span>
          <strong>{firstAid || '＿＿＿＿＿＿＿＿'}</strong>
          <em>^急救證書於遞交本申請時仍須為有效，請提交證書副本。</em>
        </div>
        <ReturnAddress p={personal} />
      </Section>

      <Section no="3" zh="申請者簽署" en="Applicant’s Signature" breakBefore>
        <div className="fd-two">
          <div className="fd-sig">
            <div className="fd-sig__head">申請者簽署 <em>Applicant’s Signature</em></div>
            <p className="fd-small">
              茲證明上述資料正確無訛。請於簽署前，參閱下列之備註。
              <br />
              <em>I hereby declare that the above information is true to my fullest understanding.</em>
            </p>
            <div className="fd-sig__ink">
              {holder.signature ? <img src={holder.signature} alt="申請人簽署" /> : <span className="fd-sig__line" />}
            </div>
            <div className="fd-sig__meta">
              <span>姓名 Name：{holder.name}</span>
              <span>日期 Date：{holder.date ? fmtDate(holder.date) : '＿＿＿＿＿＿'}</span>
            </div>
          </div>
          <div className="fd-sig">
            <div className="fd-sig__head">4. 提名 <em>Nomination</em></div>
            <p className="fd-small">
              茲經核證上述資料正確無誤，並提名申請人獲取貝登堡獎章。
              <br />
              <em>I hereby verify that the above information is correct to my fullest understanding, and nominate the applicant for the Baden-Powell Award.</em>
            </p>
            <div className="fd-sig__ink">
              {rsl.signature ? <img src={rsl.signature} alt="團長簽署" /> : <span className="fd-sig__line" />}
            </div>
            <div className="fd-sig__meta">
              <span>樂行童軍團長 Rover Scout Leader</span>
              <span>旅印 Group Stamp</span>
            </div>
            <div className="fd-sig__meta">
              <span>姓名 Name：{rsl.name || '＿＿＿＿＿＿'}</span>
              <span>日期 Date：{rsl.date ? fmtDate(rsl.date) : '＿＿＿＿＿＿'}</span>
            </div>
          </div>
        </div>
      </Section>

      <Section no="5" zh="推薦" en="Recommendation">
        <div className="fd-two">
          <div className="fd-sig">
            <p className="fd-small">
              茲推薦申請人獲取貝登堡獎章。
              <br />
              <em>I hereby recommend the applicant for the Baden-Powell Award.</em>
            </p>
            <div className="fd-sig__meta">
              <span>區總監 District Commissioner</span>
              <span>區印 District Stamp</span>
            </div>
            <div className="fd-sig__stamp-box">區印</div>
            <div className="fd-sig__meta">
              <span>姓名 Name：＿＿＿＿＿＿</span>
              <span>日期 Date：＿＿＿＿＿＿</span>
            </div>
          </div>
          <div className="fd-sig">
            <p className="fd-small">
              茲推薦申請人獲取貝登堡獎章。
              <br />
              <em>I hereby recommend the applicant for the Baden-Powell Award.</em>
            </p>
            <div className="fd-sig__meta">
              <span>地域總監 Regional Commissioner</span>
              <span>地域印 Regional Stamp</span>
            </div>
            <div className="fd-sig__stamp-box">地域印</div>
            <div className="fd-sig__meta">
              <span>姓名 Name：＿＿＿＿＿＿</span>
              <span>日期 Date：＿＿＿＿＿＿</span>
            </div>
          </div>
        </div>
      </Section>

      <Section no="6" zh="批核" en="Approval">
        <div className="fd-two">
          <div className="fd-sig">
            <p className="fd-small">
              茲批准申請人獲取貝登堡獎章。
              <br />
              <em>I hereby approve the applicant for the Baden-Powell Award.</em>
            </p>
            <div className="fd-sig__meta">
              <span>青少年活動總監 Programme Commissioner</span>
              <span>青少年活動署印</span>
            </div>
            <div className="fd-sig__stamp-box">署印</div>
          </div>
          <div className="fd-sig fd-sig--branch">
            <div className="fd-sig__head">青少年活動署專用 <em>For Programme Branch Use Only</em></div>
            <div className="fd-sig__meta">
              <span>收表日期 Received Date：＿＿＿＿</span>
              <span>查核 Checked：＿＿＿＿</span>
            </div>
            <div className="fd-sig__meta">
              <span>證書編號 Cert. No.：＿＿＿＿＿＿</span>
              <span>證書發出日期 Cert. Issue Date：＿＿＿＿</span>
            </div>
          </div>
        </div>
      </Section>

      <div className="fd-fine">
        <strong>貝登堡獎章證書申請辦法 Application procedures：</strong>
        <ol>
          <li>填妥本表格及在(3)申請人簽署一欄簽署，然後交由樂行童軍團長簽署(4)提名欄。</li>
          <li>將表格呈交區總監及地域總監簽署(5)推薦欄。</li>
          <li>本表格連同紀錄冊內有關個人資料、有效日期、貝登堡獎章考試的頁次及各項有關證書之影印本，經地域轉交總會青少年活動署。</li>
          <li>青少年活動總監核實所有資料後，即簽發獎章及證書。</li>
          <li>全年均接受申請。申請如在每年 9 月 15 日或以前呈交，證書將安排於該年香港童軍大會操中頒發；該日後遞交者，則留待下年度頒發。</li>
        </ol>
        <strong>備註 Remarks</strong>
        <p>1) 你在申請表格內填報的個人及其他有關的資料，會供本會處理你的申請及有關的用途。提供個人及其他有關的資料，純屬自願。如沒有提供足夠和正確的資料，本會可能無法處理你的申請。</p>
        <p>2) 在一般情況下，申請表將於審批完成後 2 年銷毀。</p>
      </div>
    </>
  );
}

/* --------------------------------------------------------- 一次列印三張 */

export function FormsAll() {
  const { book } = useBook();
  const [wrapRef, scale] = useFitScale();
  const [preview, setPreview] = usePrintPreview();

  return (
    <div className="formpage formsallpage">
      <PreviewBar preview={preview} onToggle={() => setPreview(false)} onPrint={printNow} />
      <div className="formbar">
        <Link to="/forms" className="btn btn--ghost btn--sm">
          <Icon name="back" size={14} /> 三張表格
        </Link>
        <span className="formbar__name">PT/69 · PT/21 · PT/22 — 一次列印</span>
        <button className="btn btn--ghost btn--sm" onClick={() => setPreview(true)}>
          <Icon name="expand" size={14} /> 預覽
        </button>
        <button className="btn btn--primary btn--sm" onClick={printNow}>
          <Icon name="print" size={14} /> 列印全部
        </button>
      </div>

      <p className="formwarn formwarn--info">
        <Icon name="info" size={14} /> 三張文件會依次列印，每張由新一頁開始；未完成的欄位會留白，方便手寫。
      </p>

      <div className="formwrap formwrap--stack" ref={wrapRef}>
        <div className="formsall" style={{ zoom: scale }}>
          {FORM_ORDER.map((id) => {
            const data = formData(book, id);
            return (
              <div className="formdoc formdoc--stack" key={id} id={`doc-${id}`}>
                {id === 'pt69' && <Doc69 data={data} />}
                {id === 'pt21' && <Doc21 data={data} />}
                {id === 'pt22' && <Doc22 data={data} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default FormDoc;
