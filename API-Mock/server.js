const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, 'data');

function readJson(file) {
  try {
    const p = path.join(dataDir, file);
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return null;
  }
}

app.get('/places', (req, res) => {
  // For this simple mock we ignore query params and return a pre-built list
  const list = readJson('data/places_list.json') || { items: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } };
  res.json(list);
});

app.get('/places/:id', (req, res) => {
  const id = req.params.id;
  const file = `place_${id}.json`;
  const place = readJson(file);
  if (!place) {
    return res.status(404).json({ message: 'Place not found' });
  }
  res.json(place);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API Mock listening on http://localhost:${port}`));
