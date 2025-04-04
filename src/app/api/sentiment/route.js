'use server';

import { NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';
import path from 'path';

const cache = new Map();
const ONE_HOUR = 3600 * 1000;

function adjustOverlappingCoordinates(events) {
  const groups = {};
  events.forEach(event => {
    if (event.lat != null && event.lon != null) {
      const key = `${Number(event.lat).toFixed(5)}_${Number(event.lon).toFixed(5)}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(event);
    }
  });

  Object.values(groups).forEach(group => {
    if (group.length > 1) {
      const baseLat = group[0].lat;
      const baseLon = group[0].lon;
      const offsetDistance = 0.001;
      group.forEach((event, index) => {
        const angle = (2 * Math.PI * index) / group.length;
        event.lat = baseLat + offsetDistance * Math.cos(angle);
        event.lon = baseLon + offsetDistance * Math.sin(angle) / Math.cos((baseLat * Math.PI) / 180);
      });
    }
  });

  return events;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('q') || '';
    const dateParam = searchParams.get('date');

    let dateStr;
    if (dateParam) {
      dateStr = dateParam;
    } else {
      const now = new Date();
      const yyyy = now.getUTCFullYear().toString();
      const mm = (now.getUTCMonth() + 1).toString().padStart(2, '0');
      const dd = now.getUTCDate().toString().padStart(2, '0');
      dateStr = `${yyyy}${mm}${dd}`;
    }
    
    const dateInt = Number(dateStr);
    const cacheKey = `${keyword}_${dateStr}`;
    if (cache.has(cacheKey)) {
      const { data, timestamp } = cache.get(cacheKey);
      if (Date.now() - timestamp < ONE_HOUR) {
        console.log("Returning cached data");
        return NextResponse.json({ 
          events: data, 
          lastUpdated: new Date(timestamp).toISOString() 
        });
      }
    }

    const keyFilename = path.join(
      process.cwd(),
      'src',
      'app',
      process.env.CREDENTIALS_FILE || 'globev1-2b9a5bed8ce0.json'
    );
    console.log("Using credentials file at:", keyFilename);

    const bigquery = new BigQuery({
      keyFilename,
      projectId: 'globev1',
    });

    let sqlQuery = `
      SELECT
        GLOBALEVENTID,
        SQLDATE,
        GoldsteinScale,
        EventCode,
        AvgTone,
        Actor1Geo_Lat,
        Actor1Geo_Long,
        Actor1Geo_FullName,
        SourceURL
      FROM \`gdelt-bq.gdeltv2.events\`
      WHERE SQLDATE = ${dateInt}
    `;
    if (keyword) {
      sqlQuery += ` AND LOWER(SourceURL) LIKE '%${keyword.toLowerCase()}%' `;
    }
    sqlQuery += ' LIMIT 100';

    const options = {
      query: sqlQuery,
      location: 'US',
    };

    const [job] = await bigquery.createQueryJob(options);
    console.log(`BigQuery Job ${job.id} started.`);
    const [rows] = await job.getQueryResults();

    const events = rows.map(row => {
      let timestamp = null;
      if (row.SQLDATE) {
        const dateStr = row.SQLDATE.toString();
        const year = dateStr.slice(0, 4);
        const month = dateStr.slice(4, 6);
        const day = dateStr.slice(6, 8);
        timestamp = new Date(`${year}-${month}-${day}T00:00:00Z`).toISOString();
      }
      return {
        id: row.GLOBALEVENTID,
        goldsteinScale: row.GoldsteinScale,
        sentimentScore: row.AvgTone,
        eventType: row.EventCode,
        tone: row.AvgTone,
        lat: row.Actor1Geo_Lat || null,
        lon: row.Actor1Geo_Long || null,
        location: row.Actor1Geo_FullName || null,
        timestamp,
        sourceURL: row.SourceURL,
      };
    });

    const enrichedEvents = await Promise.all(
      events.map(async (event) => {
        let image = null; 
        if (event.location) {
          image = await fetchWikipediaImage(event.location);
        }
        if (event.sourceURL) {
          try {
            const { extractArticle } = await import('../../../lib/ArticleExtractor');
            const article = await extractArticle(event.sourceURL);
            return { ...event, article, image };
          } catch (articleError) {
            console.error(`Error extracting article for ${event.sourceURL}:`, articleError);
            return { ...event, articleError: articleError.message, image };
          }
        }
        return event;
      })
    );

    const adjustedEvents = adjustOverlappingCoordinates(enrichedEvents);
    cache.set(cacheKey, { data: adjustedEvents, timestamp: Date.now() });

    return NextResponse.json({ 
      events: adjustedEvents, 
      lastUpdated: new Date(Date.now()).toISOString() 
    });
  } catch (error) {
    console.error("Error fetching events via BigQuery:", error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

async function fetchWikipediaImage(title) {
  const endpoint = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
    title
  )}&prop=pageimages&format=json&pithumbsize=300&origin=*`;

  try {
    const response = await fetch(endpoint);
    const data = await response.json();
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];
    if (pages[pageId] && pages[pageId].thumbnail) {
      return pages[pageId].thumbnail.source;
    }
    return null;
  } catch (error) {
    console.error("Error fetching Wikipedia image for title:", title, error);
    return null;
  }
}
