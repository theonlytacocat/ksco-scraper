import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://incustody.kitsap.gov';
const ROSTER_URL = `${BASE_URL}/Home/BookingSearchResult`;
const HEADERS = {
  'Referer': 'https://incustody.kitsap.gov/Home/BookingSearchQuery?Length=4',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5'
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchRoster() {
  const inmates = [];
  let page = 1;

  while (true) {
    const response = await axios.get(ROSTER_URL, {
      params: {
        LastName: '%',
        FirstName: '',
        BookingFrom: '',
        BookingTo: '',
        ValidSearch: '',
        sort: 'BookingDate',
        sortdir: 'DESC',
        page: page
      },
      headers: HEADERS
    });

    const $ = cheerio.load(response.data);
    const rows = $('table.table tbody tr');

    if (rows.length === 0) break;

    rows.each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length === 0) return;
      const viewLink = $(cells[0]).find('a').attr('href') || '';
      inmates.push({
        bookingNumber:  $(cells[1]).text().trim(),
        firstName:      $(cells[2]).text().trim(),
        lastName:       $(cells[3]).text().trim(),
        middleName:     $(cells[4]).text().trim(),
        race:           $(cells[5]).text().trim(),
        sex:            $(cells[6]).text().trim(),
        bookingDate:    $(cells[7]).text().trim(),
        releaseDate:    $(cells[8]).text().trim(),
        schReleaseDate: $(cells[9]).text().trim(),
        detailUrl:      viewLink ? `${BASE_URL}${viewLink}` : null
      });
    });

    if (rows.length < 15) break;
    page++;
    await delay(300);
  }

  return inmates;
}

export async function fetchDetail(detailUrl) {
  try {
    await delay(500);
    const response = await axios.get(detailUrl, { headers: HEADERS });
    const $ = cheerio.load(response.data);

    // Physical description — pull from full body text
    const bodyText = $('body').text();
    const age =      bodyText.match(/Age:\s*(\d+)/)?.[1] || null;
    const height =   bodyText.match(/Height:\s*(\d+)/)?.[1] || null;
    const weight =   bodyText.match(/Weight:\s*(\d+)/)?.[1] || null;
    const hair =     bodyText.match(/Hair:\s*([A-Z]+)/i)?.[1] || null;
    const eyes =     bodyText.match(/Eyes:\s*([A-Z]+)/i)?.[1] || null;
    const inmateId = bodyText.match(/Inmate\s*ID:\s*(\d+)/)?.[1] || null;
    const schedRelease = bodyText.match(/Sched\.?\s*Release:\s*([\d\/]+)/i)?.[1]?.trim() || null;

    // Parse charges by walking all table rows in document order.
    //
    // Page structure (repeats for each charge):
    //   [N]                                      ← charge number row (single td, digits only)
    //   [Violation: TEXT]  [Level: X]
    //   [Add. Desc.: ...]  [OBTS #: ...]
    //   [War.#: ...]       [End Of Sentence Date: ...]  [Clearance: ...]
    //   [Arrest Information]                     ← section header
    //   [Arrest Agency: ...]  [Case #: ...]  [Arrest Date: MM/DD/YYYY]
    //   []                                       ← empty spacer
    //   [Court & Bail/Bond Information]          ← section header
    //   [Court Type: X]  [Court Case #: ...]  [Next Court Date MM/DD/YYYY]
    //   [Req. Bond/Bail: ...]  [Bond Group #: ...]  []
    //   [Req. Bond Amt: $X]  [Req. Cash Amt: $X]  [Bond Co. #: ...]

    const rows = $('table tr').toArray();
    const charges = [];
    let cur = null;

    function parseDollars(text) {
      const m = text.match(/\$\s*([\d,]+\.?\d*)/);
      if (!m) return null;
      const v = parseFloat(m[1].replace(/,/g, ''));
      return v > 0 ? v : null;
    }

    for (const row of rows) {
      const tds = $(row).find('td').map((_, td) => $(td).text().trim()).get();
      if (!tds.length) continue;
      const first = tds[0];

      // Charge number boundary: single td containing only digits
      if (tds.length === 1 && /^\d+$/.test(first)) {
        if (cur) charges.push(cur);
        cur = null;
        continue;
      }

      // Violation row — starts a new charge block
      if (/^Violation:/i.test(first)) {
        if (cur) charges.push(cur);
        cur = {
          violation:     first.replace(/^Violation:\s*/i, '').trim(),
          bondAmount:    null,
          cashAmount:    null,
          courtCase:     null,
          nextCourtDate: null,
          arrestAgency:  null,
          arrestDate:    null,
          courtType:     null,
        };
        continue;
      }

      if (!cur) continue;

      // Arrest info row
      if (/^Arrest Agency:/i.test(first)) {
        for (const td of tds) {
          if (/^Arrest Agency:/i.test(td))
            cur.arrestAgency = td.replace(/^Arrest Agency:\s*/i, '').trim() || null;
          else if (/^Arrest Date:/i.test(td))
            cur.arrestDate = td.replace(/^Arrest Date:\s*/i, '').trim() || null;
        }
        continue;
      }

      // Court type / court case / next court date row
      if (/^Court Type:/i.test(first)) {
        for (const td of tds) {
          if (/^Court Type:/i.test(td))
            cur.courtType = td.replace(/^Court Type:\s*/i, '').trim() || null;
          else if (/^Court Case\s*#:/i.test(td))
            cur.courtCase = td.replace(/^Court Case\s*#:\s*/i, '').trim() || null;
          else if (/^Next Court Date/i.test(td)) {
            const m = td.match(/Next Court Date\s*([\d\/]+)/i);
            if (m) cur.nextCourtDate = m[1].trim();
          }
        }
        continue;
      }

      // Bond amounts row
      if (/^Req\.?\s*Bond\s*Amt/i.test(first)) {
        for (const td of tds) {
          if (/^Req\.?\s*Bond\s*Amt/i.test(td))  cur.bondAmount = parseDollars(td);
          if (/^Req\.?\s*Cash\s*Amt/i.test(td))  cur.cashAmount = parseDollars(td);
        }
        continue;
      }
    }

    if (cur) charges.push(cur);

    const totalBond = charges.reduce((s, c) => s + (c.bondAmount || 0) + (c.cashAmount || 0), 0);

    return {
      inmateId,
      schedRelease,
      age,
      height,
      weight,
      hair,
      eyes,
      charges,
      totalBond: totalBond > 0 ? totalBond : null,
    };

  } catch (err) {
    console.error(`Failed to fetch detail for ${detailUrl}:`, err.message);
    return null;
  }
}