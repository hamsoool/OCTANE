async function test() {
  const query = `[out:json][timeout:25];
(
  area["name"="Zambales"];
  area["name"="Olongapo"];
)->.searchAreas;
(
  node["amenity"="fuel"](area.searchAreas);
  way["amenity"="fuel"](area.searchAreas);
  relation["amenity"="fuel"](area.searchAreas);
);
out center;`;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'octane-fuel-price-intelligence-client'
      },
      body: 'data=' + encodeURIComponent(query)
    });
    if (!response.ok) {
      console.error(`HTTP error: ${response.status}`);
      const text = await response.text();
      console.error(text);
      return;
    }
    const data = await response.json();
    console.log(`Success! Found ${data.elements?.length || 0} elements.`);
    if (data.elements && data.elements.length > 0) {
      console.log('Sample element:', JSON.stringify(data.elements.slice(0, 3), null, 2));
      const inOlongapo = data.elements.filter(e => {
        // approximate Olongapo coordinates bounds: lat 14.80 to 14.87, lon 120.25 to 120.35
        const lat = e.lat ?? e.center?.lat;
        const lon = e.lon ?? e.center?.lon;
        return lat >= 14.80 && lat <= 14.87 && lon >= 120.25 && lon <= 120.35;
      });
      console.log(`Elements in Olongapo coordinate range: ${inOlongapo.length}`);
      console.log('Olongapo stations samples:', inOlongapo.slice(0, 5).map(e => e.tags?.name || e.tags?.brand || 'Unknown'));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
