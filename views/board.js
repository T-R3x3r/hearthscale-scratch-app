import { App } from '@modelcontextprotocol/ext-apps';

const app = new App({ name: 'Scratch Board', version: '0.2.1' });
const place = document.createElement('p');
document.body.append(place);
const answer = await fetch(
  'https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m',
);
const weather = await answer.json();
place.textContent = 'Berlin: ' + weather.current.temperature_2m + ' °C';
await app.connect();
