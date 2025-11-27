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
  try {
    const list = readJson('places_list.json'); // dataDir already points to /data
    if (!list) {
      return res.status(500).json({ message: 'Failed to load places list' });
    }
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ message: 'Unexpected error' });
  }
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

/**
 * Serve the OpenAPI specification for easy inspection.
 */
app.get('/openapi.yaml', (req, res) => {
  res.sendFile(path.join(__dirname, 'openapi.yaml'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API Mock listening on http://localhost:${port}`));
