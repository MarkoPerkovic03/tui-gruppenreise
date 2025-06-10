const express = require('express');
const router = express.Router();
const TravelOffer = require('../models/TravelOffer');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// GET /api/travel-offers - Alle verfügbaren Reiseangebote abrufen
router.get('/', auth, async (req, res) => {
  try {
    console.log('GET /api/travel-offers aufgerufen');
    
    const offers = await TravelOffer.find({ available: true })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    console.log(`${offers.length} Angebote gefunden`);

    res.json({
      offers,
      total: offers.length
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Angebote:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Reiseangebote', 
      error: error.message 
    });
  }
});

// POST /api/travel-offers - Neues Reiseangebot erstellen (nur Admins)
router.post('/', adminAuth, async (req, res) => {
  try {
    console.log('POST /api/travel-offers aufgerufen');
    console.log('Request Body:', req.body);
    console.log('User ID:', req.userId);

    const {
      title,
      description,
      destination,
      country,
      city,
      category,
      images,
      pricePerPerson,
      pricePerNight,
      minPersons,
      maxPersons,
      stars,
      amenities,
      tags
    } = req.body;

    // Validierung der Pflichtfelder
    if (!title || !description || !destination || !country || !category || !pricePerPerson) {
      console.log('Validierungsfehler: Pflichtfelder fehlen');
      return res.status(400).json({ 
        message: 'Pflichtfelder fehlen: title, description, destination, country, category, pricePerPerson' 
      });
    }

    // Bilder verarbeiten
    let processedImages = [];
    if (images && images.length > 0) {
      processedImages = images.map((img, index) => ({
        url: img.url || img,
        title: img.title || `Bild ${index + 1}`,
        isMain: index === 0 // Erstes Bild als Hauptbild
      }));
    }

    console.log('Erstelle neues Angebot...');
    const newOffer = new TravelOffer({
      title,
      description,
      destination,
      country,
      city: city || '',
      category,
      images: processedImages,
      pricePerPerson: Number(pricePerPerson),
      pricePerNight: pricePerNight ? Number(pricePerNight) : undefined,
      minPersons: minPersons || 1,
      maxPersons: maxPersons || 10,
      stars: stars || 3,
      amenities: amenities || [],
      tags: tags || [],
      createdBy: req.userId,
      available: true
    });

    const savedOffer = await newOffer.save();
    console.log('Angebot gespeichert:', savedOffer._id);

    const populatedOffer = await savedOffer.populate('createdBy', 'name email');

    res.status(201).json({
      message: 'Reiseangebot erfolgreich erstellt',
      offer: populatedOffer
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Angebots:', error);
    res.status(500).json({ 
      message: 'Fehler beim Erstellen des Reiseangebots', 
      error: error.message 
    });
  }
});

// GET /api/travel-offers/:id - Einzelnes Reiseangebot abrufen
router.get('/:id', auth, async (req, res) => {
  try {
    const offer = await TravelOffer.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!offer) {
      return res.status(404).json({ message: 'Reiseangebot nicht gefunden' });
    }

    res.json(offer);
  } catch (error) {
    res.status(500).json({ 
      message: 'Fehler beim Abrufen des Reiseangebots', 
      error: error.message 
    });
  }
});
// PUT /api/travel-offers/:id - Reiseangebot aktualisieren (nur Admins)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const offer = await TravelOffer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!offer) {
      return res.status(404).json({ message: 'Reiseangebot nicht gefunden' });
    }

    res.json({
      message: 'Reiseangebot erfolgreich aktualisiert',
      offer
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Reiseangebots:', error);
    res.status(500).json({
      message: 'Fehler beim Aktualisieren des Reiseangebots',
      error: error.message
    });
  }
});

// DELETE /api/travel-offers/:id - Reiseangebot löschen (nur Admins)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const offer = await TravelOffer.findByIdAndDelete(req.params.id);

    if (!offer) {
      return res.status(404).json({ message: 'Reiseangebot nicht gefunden' });
    }

    res.json({ message: 'Reiseangebot erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen des Reiseangebots:', error);
    res.status(500).json({
      message: 'Fehler beim Löschen des Reiseangebots',
      error: error.message
    });
  }
});

// Test-Route
router.get('/test/ping', (req, res) => {
  res.json({ message: 'TravelOffers Route funktioniert!' });
});

module.exports = router;