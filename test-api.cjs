const https = require('https');
https.get('https://api.open-meteo.com/v1/forecast?latitude=37.7749&longitude=-122.4194&current=temperature_2m,relative_humidity_2m,surface_pressure,precipitation,uv_index&daily=precipitation_sum&timezone=auto', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data));
});
