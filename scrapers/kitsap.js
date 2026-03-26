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

    const charges = [];
    
    // Try multiple selectors for charge blocks
    $('.charge-block, .charge-info, table tr, .detail-row').each((i, el) => {
      const text = $(el).text().trim();
      
      // Look for violation/charge text
      if (text.includes('Violation:') || text.includes('Charge:') || text.includes('Statute:')) {
        const violationMatch = text.match(/(?:Violation|Charge):\s*([^\n]+)/i);
        
        // Try multiple patterns for bond/bail
        const bondMatch = text.match(/(?:Req\.?\s*)?(?:Bond|Bail)\s*(?:Amt|Amount)?[:\s]*\$?\s*([\d,]+\.?\d*)/i);
        const cashMatch = text.match(/(?:Req\.?\s*)?Cash\s*(?:Amt|Amount)?[:\s]*\$?\s*([\d,]+\.?\d*)/i);
        const courtCaseMatch = text.match(/(?:Court\s*Case|#)\s*#?\s*:\s*(\S+)/i);
        const nextCourtMatch = text.match(/(?:Next\s*Court\s*Date)\s*[:\s]*([\d\/]+)/i);
        const arrestAgencyMatch = text.match(/(?:Arrest\s*Agency)\s*[:\s]*(.+?)(?=\s*(?:Case|Court|$))/is);
        const arrestDateMatch = text.match(/(?:Arrest\s*Date)\s*[:\s]*([\d\/]+)/i);
        const courtTypeMatch = text.match(/(?:Court\s*Type)\s*[:\s]*(\S+)/i);

        if (violationMatch) {
          charges.push({
            violation:     violationMatch[1].trim(),
            bondAmount:    bondMatch ? `$${bondMatch[1].replace(/,/g, '')}` : null,
            cashAmount:    cashMatch ? `$${cashMatch[1].replace(/,/g, '')}` : null,
            courtCase:     courtCaseMatch ? courtCaseMatch[1].trim() : null,
            nextCourtDate: nextCourtMatch ? nextCourtMatch[1].trim() : null,
            arrestAgency:  arrestAgencyMatch ? arrestAgencyMatch[1].trim() : null,
            arrestDate:    arrestDateMatch ? arrestDateMatch[1].trim() : null,
            courtType:     courtTypeMatch ? courtTypeMatch[1].trim() : null
          });
        }
      }
    });

    // Also try to find bail info in a separate section
    const bailInfo = {};
    $('div:contains("Bond"), div:contains("Bail"), span:contains("Bond"), span:contains("Bail")').each((i, el) => {
      const text = $(el).text().trim();
      const totalBondMatch = text.match(/\$?\s*([\d,]+\.?\d*)/i);
      if (totalBondMatch && !bailInfo.totalBond) {
        bailInfo.totalBond = `$${totalBondMatch[1].replace(/,/g, '')}`;
      }
    });

    const bodyText = $('body').text();

    const age =      bodyText.match(/Age:\s*(\d+)/)?.[1] || null;
    const height =   bodyText.match(/Height:\s*(\d+)/)?.[1] || null;
    const weight =   bodyText.match(/Weight:\s*(\d+)/)?.[1] || null;
    const hair =     bodyText.match(/Hair:\s*([A-Z]+)/i)?.[1] || null;
    const eyes =     bodyText.match(/Eyes:\s*([A-Z]+)/i)?.[1] || null;
    const inmateId = bodyText.match(/Inmate ID:\s*(\d+)/)?.[1] || null;

    const schedRelease = (() => {
      const match = bodyText.match(/Sched\.\s*Release:\s*([\d\/]+)/i);
      return match ? match[1].trim() : null;
    })();

    return { 
      inmateId, 
      schedRelease, 
      age, 
      height, 
      weight, 
      hair, 
      eyes, 
      charges,
      totalBond: bailInfo.totalBond || null
    };

  } catch (err) {
    console.error(`Failed to fetch detail for ${detailUrl}:`, err.message);
    return null;
  }
}